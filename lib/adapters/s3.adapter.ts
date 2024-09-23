import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Readable, Readable as ReadableStream } from 'stream';
import dayjs from 'dayjs';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CLOUD_ACCOUNT } from '../constants/provider.constants';
import { SVG_FILE_TYPE } from '../constants/svg-file-type.constant';
import { generateUniqueName } from '../helpers/file-name.helper';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { S3AccountType } from '../types/account.type';
import { BlobClient } from '../types/blob-client.type';
import { BlobStorageProperties } from '../types/blob-storage-properties.type';
import { UploadFileType } from '../types/upload-file.type';
import { BaseStorageAdapter } from './base-storage.adapter';
import { ProxyAgent } from 'proxy-agent';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as util from 'util';

@Injectable()
export class S3Adapter extends BaseStorageAdapter implements StorageAdapter {
    private readonly containerClient: S3Client;

    public constructor(@Inject(CLOUD_ACCOUNT) private account: S3AccountType) {
        super();

        const s3ClientConfig: any = {
            region: account.region,
            requestHandler: process.env.http_proxy ? new ProxyAgent() : undefined
        };
        if (account.name && account.key) {
            s3ClientConfig.credentials = {
                accessKeyId: account.name,
                secretAccessKey: account.key
            };
        }

        this.containerClient = new S3Client(s3ClientConfig);
    }

    async uploadStream(stream: Readable, fileName: string): Promise<BlobClient> {
        try {
            const blobName = generateUniqueName(fileName);
            const command = new PutObjectCommand({
                Key: blobName,
                Bucket: this.account.containerName,
                Body: stream
            });
            await this.containerClient.send(command);
            return {
                containerName: this.account.containerName,
                blobName
            };
        } catch (e) {
            console.error(e);
            throw new InternalServerErrorException(e);
        }
    }

    async copyFileFromUrl(url: string, fileName: string, isPublic: boolean): Promise<BlobClient | undefined> {
        const response = await fetch(url, { method: 'GET' });
        const buffer = Buffer.from(await response.arrayBuffer());
        return this.uploadFile({ file: buffer as any, fileName, isPublic: isPublic });
    }

    private generateBlobName(fileName: string, blobName: string): string {
        if (blobName) {
            return blobName;
        }
        return generateUniqueName(fileName);
    }

    public async uploadFile(data: UploadFileType): Promise<BlobClient | undefined> {
        const { file, fileName, mimetype, blobName } = data;
        const blobOptions = mimetype === SVG_FILE_TYPE ? { ContentType: SVG_FILE_TYPE } : {};
        let uniqueBlobName: string;

        try {
            if (file instanceof Buffer) {
                uniqueBlobName = this.generateBlobName(fileName || '', blobName);
                const command = new PutObjectCommand({
                    ...blobOptions,
                    Key: uniqueBlobName,
                    Bucket: this.account.containerName,
                    Body: file,
                    ACL: data.isPublic ? 'public-read' : undefined
                });
                await this.containerClient.send(command);
            } else {
                uniqueBlobName = this.generateBlobName(
                    fileName || this.getFileNameToUpload(file as Express.Multer.File),
                    blobName
                );
                if (file.buffer) {
                    const command = new PutObjectCommand({
                        ...blobOptions,
                        Key: uniqueBlobName,
                        Bucket: this.account.containerName,
                        Body: file.buffer,
                        ACL: data.isPublic ? 'public-read' : undefined
                    });
                    await this.containerClient.send(command);
                } else {
                    const readFile = util.promisify(fs.readFile);
                    const fileContent = await readFile(file.path);
                    const command = new PutObjectCommand({
                        Key: uniqueBlobName,
                        Bucket: this.account.containerName,
                        Body: fileContent,
                        ContentType: file.mimetype
                    });
                    await this.containerClient.send(command);
                }
            }

            return {
                containerName: this.account.containerName,
                blobName: uniqueBlobName
            };
        } catch (e) {
            console.error(e);
            throw new InternalServerErrorException(e);
        }
    }

    async deleteIfExists(blobName: string): Promise<void> {
        if (!blobName) return;
        const command = new DeleteObjectCommand({
            Bucket: this.account.containerName,
            Key: blobName
        });

        await this.containerClient.send(command);
    }

    public generatePresignedUrl(
        blobName: string,
        expiresOn = dayjs().add(this.account.expiredIn, 'second').toDate(),
        options = {}
    ): Promise<string> {
        if (!blobName) {
            return;
        }
        const sasOptions = {
            Bucket: this.account.containerName,
            Key: blobName,
            ...options
        };

        const command = new GetObjectCommand(sasOptions);

        return getSignedUrl(this.containerClient, command, {
            expiresIn: dayjs(expiresOn).diff(dayjs(new Date()), 'second')
        });
    }

    async uploadBlobreadable(readable: Readable, blobName: string) {
        const command = new PutObjectCommand({
            Key: blobName,
            Bucket: this.account.containerName,
            Body: readable
        });
        await this.containerClient.send(command);
    }

    async createBufferFromBlob(blobName: string): Promise<Buffer | null> {
        return this.streamToBuffer(await this.getFileStream(blobName));
    }

    public async getFileStream(blobName: string): Promise<NodeJS.ReadableStream | undefined> {
        const command = new GetObjectCommand({
            Key: blobName,
            Bucket: this.account.containerName
        });

        const blobClient = await this.containerClient.send(command);

        if (blobClient.Body instanceof ReadableStream) {
            return blobClient.Body;
        }

        return ReadableStream.from(blobClient.Body as any);
    }

    public async getFileBuffer(blobName: string): Promise<Buffer | null> {
        const fileStream = await this.getFileStream(blobName);
        return this.streamToBuffer(fileStream);
    }

    async getProperties(blobName: string): Promise<BlobStorageProperties> {
        const command = new GetObjectCommand({
            Bucket: this.account.containerName,
            Key: blobName
        });
        const blobClient = await this.containerClient.send(command);
        return {
            contentType: blobClient.ContentType || '',
            contentLength: blobClient.ContentLength || 0,
            etag: blobClient.ETag || ''
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async deleteFile(blobName: string): Promise<void> {
        throw new TypeError('Implement later');
    }

    getPublicUrl(blobName: string): string {
        return `https://${this.account.containerName}.s3.amazonaws.com/${blobName}`;
    }
}
