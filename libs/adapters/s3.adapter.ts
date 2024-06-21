import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import AWS from 'aws-sdk';
import { ManagedUpload } from 'aws-sdk/lib/s3/managed_upload';
import dayjs from 'dayjs';
import { Readable } from 'stream';
import { CLOUD_ACCOUNT } from '../constants/provider.constants';
import { SVG_FILE_TYPE } from '../constants/svg-file-type.constant';
import { generateUniqueName } from '../helpers/file-name.helper';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { S3AccountType } from '../types/account.type';
import { BlobClient } from '../types/blob-client.type';
import { BlobStorageProperties } from '../types/blob-storage-properties.type';
import { UploadFileType } from '../types/upload-file.type';
import { BaseStorageAdapter } from './base-storage.adapter';
import SendData = ManagedUpload.SendData;
import { ProxyAgent } from 'proxy-agent';

@Injectable()
export class S3Adapter extends BaseStorageAdapter implements StorageAdapter {
    private containerClient: AWS.S3;

    public constructor(@Inject(CLOUD_ACCOUNT) private account: S3AccountType) {
        super();
        this.containerClient = new AWS.S3({
            accessKeyId: account.name,
            secretAccessKey: account.key,
            signatureVersion: 'v4',
            region: account.region,
            httpOptions: {
                agent: process.env.http_proxy ? new ProxyAgent() : undefined
            }
        });
    }

    async uploadStream(stream: Readable, fileName: string): Promise<BlobClient> {
        try {
            const blobName = generateUniqueName(fileName);
            const blockBlobClient = await this.containerClient
                .upload({
                    Key: blobName,
                    Bucket: this.account.containerName,
                    Body: stream
                })
                .promise();
            return {
                containerName: blockBlobClient.Bucket,
                blobName: blockBlobClient.Key
            };
        } catch (e) {
            throw new InternalServerErrorException(e);
        }
    }

    async copyFileFromUrl(url: string, fileName: string, isPublic: boolean) {
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

    public async uploadFile(data: UploadFileType) {
        const { file, fileName, mimetype, blobName } = data;
        const blobOptions = mimetype === SVG_FILE_TYPE ? { ContentType: SVG_FILE_TYPE } : {};
        let uniqueBlobName: string;
        let blockBlobClient: SendData;

        try {
            if (file instanceof Buffer) {
                uniqueBlobName = this.generateBlobName(fileName || '', blobName);
                blockBlobClient = await this.containerClient
                    .upload({
                        ...blobOptions,
                        Key: uniqueBlobName,
                        Bucket: this.account.containerName,
                        Body: file,
                        ACL: data.isPublic ? 'public-read' : undefined
                    })
                    .promise();
            } else {
                uniqueBlobName = this.generateBlobName(
                    fileName || this.getFileNameToUpload(file as Express.Multer.File),
                    blobName
                );
                if (file.buffer) {
                    blockBlobClient = await this.containerClient
                        .upload({
                            ...blobOptions,
                            Key: uniqueBlobName,
                            Bucket: this.account.containerName,
                            Body: file.buffer,
                            ACL: data.isPublic ? 'public-read' : undefined
                        })
                        .promise();
                } else {
                    blockBlobClient = await this.containerClient
                        .upload({
                            Key: uniqueBlobName,
                            Bucket: this.account.containerName,
                            Body: file,
                            ContentType: file.mimetype
                        })
                        .promise();
                }
            }

            return {
                containerName: blockBlobClient.Bucket,
                blobName: blockBlobClient.Key
            };
        } catch (e) {
            throw new InternalServerErrorException(e);
        }
    }

    async deleteIfExists(blobName: string): Promise<void> {
        if (typeof blobName === 'undefined' || blobName === null || blobName === '') {
            return;
        }

        await this.containerClient
            .deleteObject({
                Bucket: this.account.containerName,
                Key: blobName
            })
            .promise();
    }

    public generatePresignedUrl(
        blobName: string,
        expiresOn = dayjs().add(this.account.expiredIn, 'second').toDate(),
        options: any = {}
    ) {
        const sasOptions = {
            Bucket: this.account.containerName,
            Key: blobName,
            Expires: dayjs(expiresOn).diff(dayjs(new Date()), 'second'),
            ...options
        };
        return this.containerClient.getSignedUrl('getObject', sasOptions);
    }

    uploadBlobreadable(readable: Readable, blobName: string) {
        return this.containerClient
            .upload({
                Key: blobName,
                Bucket: this.account.containerName,
                Body: readable
            })
            .promise();
    }

    async createBufferFromBlob(blobName: string): Promise<Buffer | null> {
        return this.streamToBuffer(await this.getFileStream(blobName));
    }

    public async getFileStream(blobName: string): Promise<NodeJS.ReadableStream | undefined> {
        const blobClient = await this.containerClient
            .getObject({
                Key: blobName,
                Bucket: this.account.containerName
            })
            .promise();

        // if (blobClient.Body instanceof Blob) {
        //     return blobClient.Body.stream();
        // }

        if (blobClient.Body instanceof Readable) {
            return blobClient.Body;
        }

        return Readable.from(blobClient.Body as any);
    }

    public async getFileBuffer(blobName: string): Promise<Buffer | null> {
        const fileStream = await this.getFileStream(blobName);
        return this.streamToBuffer(fileStream);
    }

    async getProperties(blobName: string): Promise<BlobStorageProperties> {
        const blobClient = await this.containerClient
            .getObject({
                Bucket: this.account.containerName,
                Key: blobName
            })
            .promise();
        return {
            contentType: blobClient.ContentType || '',
            contentLength: blobClient.ContentLength || 0,
            etag: blobClient.ETag || ''
        };
    }

    public async deleteFile(blobName: string) {
        throw new TypeError('Implement later');
    }

    getPublicUrl(blobName: string): string {
        return `https://${this.account.containerName}.s3.amazonaws.com/${blobName}`;
    }
}
