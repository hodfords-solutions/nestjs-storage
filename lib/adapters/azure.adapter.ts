import {
    BlobCopyFromURLResponse,
    BlobSASSignatureValues,
    BlobServiceClient,
    BlobUploadCommonResponse,
    BlockBlobClient,
    BlockBlobParallelUploadOptions,
    ContainerClient,
    ContainerSASPermissions,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential
} from '@azure/storage-blob';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import dayjs from 'dayjs';
import stream, { Readable } from 'stream';
import { CLOUD_ACCOUNT } from '../constants/provider.constants';
import { SVG_FILE_TYPE } from '../constants/svg-file-type.constant';
import { generateUniqueName } from '../helpers/file-name.helper';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { AzureAccountType } from '../types/account.type';
import { BlobClient } from '../types/blob-client.type';
import { BlobStorageProperties } from '../types/blob-storage-properties.type';
import { BlobUploadHeaders } from '../types/blob-upload-headers.type';
import { UploadFileType } from '../types/upload-file.type';
import { BaseStorageAdapter } from './base-storage.adapter';

@Injectable()
export class AzureAdapter extends BaseStorageAdapter implements StorageAdapter {
    private containerClient: ContainerClient;
    private blobServiceClient: BlobServiceClient;
    private readonly sharedKeyCredential: StorageSharedKeyCredential;

    public constructor(@Inject(CLOUD_ACCOUNT) private account: AzureAccountType) {
        super();
        this.sharedKeyCredential = new StorageSharedKeyCredential(this.account.name, this.account.key);
        this.blobServiceClient = new BlobServiceClient(
            `https://${this.account.name}.blob.core.windows.net`,
            this.sharedKeyCredential
        );
        this.containerClient = this.blobServiceClient.getContainerClient(this.account.containerName);
    }

    async uploadStream(stream: Readable, fileName: string): Promise<BlobClient> {
        try {
            const blobName = generateUniqueName(fileName);
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.uploadStream(stream);
            return {
                containerName: blockBlobClient.containerName,
                blobName: blockBlobClient.name
            };
        } catch (e) {
            throw new InternalServerErrorException(e);
        }
    }

    copyFileFromUrl(url: string, blobName: string): Promise<BlobCopyFromURLResponse> {
        const sourceBlob = this.containerClient.getBlockBlobClient(blobName);
        const destinationBlob = this.containerClient.getBlockBlobClient(sourceBlob.name);
        return destinationBlob.syncCopyFromURL(url);
    }

    public async uploadFile(data: UploadFileType): Promise<BlobClient | undefined> {
        const { file, fileName, mimetype } = data;
        const blobOptions = mimetype === SVG_FILE_TYPE ? { blobHTTPHeaders: { blobContentType: SVG_FILE_TYPE } } : {};
        let blobName: string;
        let blockBlobClient: BlockBlobClient;

        try {
            if (file instanceof Buffer) {
                blobName = generateUniqueName(fileName || '');
                blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.upload(file.buffer, file.buffer.byteLength, blobOptions);
            } else {
                blobName = generateUniqueName(fileName || this.getFileNameToUpload(file as Express.Multer.File));
                blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                if (file.buffer) {
                    await blockBlobClient.upload(file.buffer, file.buffer.byteLength, blobOptions);
                } else {
                    const options: BlockBlobParallelUploadOptions = {
                        blobHTTPHeaders: {
                            blobContentType: (file as Express.Multer.File).mimetype ?? 'application/octet-stream'
                        }
                    };
                    await blockBlobClient.uploadFile((file as Express.Multer.File).path, options);
                }
            }

            return {
                containerName: blockBlobClient.containerName,
                blobName: blockBlobClient.name
            };
        } catch (e) {
            throw new InternalServerErrorException(e);
        }
    }

    async deleteIfExists(blobName: string): Promise<void> {
        if (typeof blobName === 'undefined' || blobName === null || blobName === '') {
            return;
        }

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.deleteIfExists();
    }

    public generatePresignedUrl(
        blobName: string,
        expiresOn = dayjs().add(this.account.expiredIn, 'second').toDate(),
        options: Partial<BlobSASSignatureValues> = {}
    ): string {
        const sasOptions: BlobSASSignatureValues = {
            containerName: this.account.containerName,
            blobName: blobName,
            permissions: ContainerSASPermissions.parse('r'),
            startsOn: new Date(),
            expiresOn: expiresOn,
            ...options
        };
        const sasToken = generateBlobSASQueryParameters(sasOptions, this.sharedKeyCredential).toString();
        return `${this.containerClient.getBlockBlobClient(blobName).url}?${sasToken}`;
    }

    uploadBlobreadable(
        readable: stream.Readable,
        blobName: string,
        httpHeaders?: BlobUploadHeaders
    ): Promise<BlobUploadCommonResponse> {
        const bufferSize = 800;
        const maxConcurrency = 5;

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        return blockBlobClient.uploadStream(readable, bufferSize, maxConcurrency, {
            blobHTTPHeaders: httpHeaders
        });
    }

    async createBufferFromBlob(blobName: string): Promise<Buffer | null> {
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        const blobDownloaded = await blockBlobClient.download();

        return this.streamToBuffer(blobDownloaded.readableStreamBody);
    }

    public async getFileStream(blobName: string): Promise<NodeJS.ReadableStream | undefined> {
        try {
            const blobClient = await this.containerClient.getBlobClient(blobName);
            return (await blobClient.download()).readableStreamBody;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    public async getFileBuffer(blobName: string): Promise<Buffer | null> {
        const fileStream = await this.getFileStream(blobName);
        return this.streamToBuffer(fileStream);
    }

    async getProperties(blobName: string): Promise<BlobStorageProperties> {
        const blobClient = await this.containerClient.getBlobClient(blobName);
        const properties = await blobClient.getProperties();
        return {
            contentType: properties.contentType || '',
            contentLength: properties.contentLength || 0,
            etag: properties.etag || ''
        };
    }

    public async deleteFile(blobName: string): Promise<void> {
        try {
            const blobClient = this.containerClient.getBlockBlobClient(blobName);
            await blobClient.delete();
        } catch (error) {
            throw new InternalServerErrorException(error);
        }
    }

    getPublicUrl(blobName: string): string {
        throw new TypeError('Implement later');
    }
}
