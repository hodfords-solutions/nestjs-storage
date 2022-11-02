import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import { Request } from 'express';
import { StorageEngine } from 'multer';
import {
    BlobGetPropertiesResponse,
    BlobSASPermissions,
    BlobServiceClient,
    ContainerClient,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential
} from '@azure/storage-blob';
import { MulterOutFile } from '../interfaces/multer-out-file.interface';
import { StorageEngineOptions } from '../types/storage-engine.options';

export class BlobStorageEngine implements StorageEngine {
    private containerName: string;
    private containerClient: ContainerClient;
    private sharedKeyCredential: StorageSharedKeyCredential;

    constructor(private options: StorageEngineOptions) {
        this.containerName = options.containerName;
        this.sharedKeyCredential = new StorageSharedKeyCredential(options.accountName, options.accessKey);
        const blobServiceClient = new BlobServiceClient(
            `https://${options.accountName}.blob.core.windows.net`,
            this.sharedKeyCredential
        );
        this.containerClient = blobServiceClient.getContainerClient(options.containerName);
    }

    async _handleFile(
        req: Request,
        file: Express.Multer.File,
        callback: (error?: any, info?: Partial<MulterOutFile>) => void
    ): Promise<void> {
        try {
            const buffer = await this.streamToBuffer(file.stream);
            const blobName = this.options.blobNameFn(req, file);
            const blobClient = this.containerClient.getBlockBlobClient(blobName);

            await blobClient.upload(buffer, buffer.length, {
                blobHTTPHeaders: {
                    blobContentType: file.mimetype,
                    blobContentDisposition: 'inline'
                }
            });

            const blobProperties = await this.getBlobProperties(blobName);
            const url = this.generateBlobUrl(blobName);
            const intermediateFile: Partial<MulterOutFile> = {
                url,
                blobName,
                etag: blobProperties.etag,
                blobType: blobProperties.blobType,
                metadata: blobProperties.metadata,
                container: this.containerName,
                blobSize: blobProperties.contentLength || 0
            };
            callback(null, Object.assign({}, file, intermediateFile));
        } catch (err) {
            callback(err);
        }
    }

    private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
        return new Promise((resolve: (value: Buffer) => void, reject) => {
            if (!readableStream) {
                return reject(new Error('Stream does not exist'));
            }
            const chunks: Buffer[] = [];
            readableStream.on('data', (data) => {
                chunks.push(data instanceof Buffer ? data : Buffer.from(data));
            });
            readableStream.on('end', () => resolve(Buffer.concat(chunks)));
            readableStream.on('error', (err) => reject(err));
        });
    }

    _removeFile(_req: Request, file: MulterOutFile, callback: (error: Error | null) => void): void {
        this.deleteBlob(file.blobName)
            .then(() => callback(null))
            .catch((err) => callback(err));
    }

    private generateBlobUrl(blobName: string): string {
        if (isUndefined(blobName) || isNil(blobName) || blobName === '') {
            return '';
        }

        const expiresOn = new Date();
        expiresOn.setHours(expiresOn.getHours() + 1);

        const sasToken = generateBlobSASQueryParameters(
            {
                containerName: this.containerName,
                blobName,
                permissions: BlobSASPermissions.parse('r'),
                startsOn: new Date(),
                expiresOn
            },
            this.sharedKeyCredential
        ).toString();

        const blobClient = this.containerClient.getBlockBlobClient(blobName);
        return `${blobClient.url}?${sasToken}`;
    }

    private async deleteBlob(blobName: string): Promise<void> {
        if (isUndefined(blobName) || isNil(blobName) || blobName === '') {
            return Promise.resolve();
        }

        const blobClient = this.containerClient.getBlockBlobClient(blobName);
        await blobClient.deleteIfExists();
    }

    private getBlobProperties(blobName: string): Promise<BlobGetPropertiesResponse> {
        const blobClient = this.containerClient.getBlockBlobClient(blobName);
        return blobClient.getProperties();
    }
}
