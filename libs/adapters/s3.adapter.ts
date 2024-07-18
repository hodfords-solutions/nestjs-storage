import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { addSeconds, differenceInSeconds } from 'date-fns';
import { CLOUD_ACCOUNT } from '../constants/provider.constants';
import { SVG_FILE_TYPE } from '../constants/svg-file-type.constant';
import { BaseStorageAdapter } from './base-storage.adapter';
import { UploadFileType } from '../types/upload-file.type';
import { BlobClient } from '../types/blob-client.type';
import { generateUniqueName } from '../helpers/file-name.helper';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { BlobStorageProperties } from '../types/blob-storage-properties.type';
import { S3AccountType } from '../types/account.type';
import { ProxyAgent } from 'proxy-agent';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable as ReadableStream } from 'stream';
import * as fs from 'fs';
import * as util from 'util';

@Injectable()
export class S3Adapter extends BaseStorageAdapter implements StorageAdapter {
    private readonly containerClient: S3Client;

    public constructor(@Inject(CLOUD_ACCOUNT) private account: S3AccountType) {
        super();
        this.containerClient = new S3Client({
            credentials: {
                accessKeyId: account.name,
                secretAccessKey: account.key
            },
            region: account.region,
            requestHandler: process.env.http_proxy ? new ProxyAgent() : undefined
        });
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
                blobName: blobName
            };
        } catch (e) {
            throw new InternalServerErrorException(e);
        }
    }

    async copyFileFromUrl(url: string, fileName: string) {
        const response = await fetch(url, { method: 'GET' });
        const buffer = Buffer.from(await response.arrayBuffer());
        return this.uploadFile({ file: buffer as any, fileName });
    }

    public async uploadFile(data: UploadFileType) {
        const { file, fileName, mimetype } = data;
        const blobOptions = mimetype === SVG_FILE_TYPE ? { ContentType: SVG_FILE_TYPE } : {};
        let blobName: string;
        try {
            if (file instanceof Buffer) {
                blobName = generateUniqueName(fileName || '');
                const command = new PutObjectCommand({
                    ...blobOptions,
                    Key: blobName,
                    Bucket: this.account.containerName,
                    Body: file
                });
                await this.containerClient.send(command);
            } else {
                blobName = generateUniqueName(fileName || this.getFileNameToUpload(file as Express.Multer.File));
                if (file.buffer) {
                    const command = new PutObjectCommand({
                        ...blobOptions,
                        Key: blobName,
                        Bucket: this.account.containerName,
                        Body: file.buffer
                    });
                    await this.containerClient.send(command);
                } else {
                    const readFile = util.promisify(fs.readFile);
                    const fileContent = await readFile(file.path);
                    const command = new PutObjectCommand({
                        Key: blobName,
                        Bucket: this.account.containerName,
                        Body: fileContent,
                        ContentType: file.mimetype
                    });
                    await this.containerClient.send(command);
                }
            }

            return {
                containerName: this.account.containerName,
                blobName
            };
        } catch (e) {
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

    public async generatePresignedUrl(
        blobName: string,
        expiresOn = addSeconds(new Date(), this.account.expiredIn),
        options: any = {}
    ): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.account.containerName,
            Key: blobName,
            ...options
        });

        try {
            return await getSignedUrl(this.containerClient, command, {
                expiresIn: differenceInSeconds(expiresOn, new Date())
            });
        } catch (error) {
            console.error(error);
            return '';
        }
    }

    async uploadBlobreadable(readable: Readable, blobName: string) {
        throw new TypeError('Implement later');
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

    public async deleteFile(blobName: string) {
        throw new TypeError('Implement later');
    }
}
