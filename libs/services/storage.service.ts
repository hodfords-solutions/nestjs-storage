import { Global, Inject, Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';
import stream, { Readable } from 'stream';
import sharp from 'sharp';
import { UploadFileType } from '../types/upload-file.type';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { ADAPTER } from '../constants/provider.constants';
import { BlobStorageProperties } from '../types/blob-storage-properties.type';
import { BlobUploadHeaders } from '../types/blob-upload-headers.type';
import { BlobSASSignatureValues } from '@azure/storage-blob';

@Global()
@Injectable()
export class StorageService {
    static instance: StorageService;

    public constructor(@Inject(ADAPTER) private storage: StorageAdapter) {
        StorageService.instance = this;
    }

    uploadFile(file: UploadFileType) {
        return this.storage.uploadFile(file);
    }

    uploadStream(stream: Readable, fileName: string) {
        return this.storage.uploadStream(stream, fileName);
    }

    copyFileFromUrl(url: string, blobName: string) {
        if (!blobName || !url) {
            return;
        }
        return this.storage.copyFileFromUrl(url, blobName);
    }

    getFileUrl(blobName: string, expiresOn?: Date, options: Partial<BlobSASSignatureValues> = {}) {
        if (!blobName) {
            return;
        }
        return this.storage.generatePresignedUrl(blobName, expiresOn, options);
    }

    async deleteIfExists(blobName: string) {
        await this.storage.deleteIfExists(blobName);
    }

    async deleteFile(blobName: string) {
        await this.storage.deleteFile(blobName);
    }

    uploadBlobreadable(readable: stream.Readable, blobName: string, httpHeaders?: BlobUploadHeaders) {
        return this.storage.uploadBlobreadable(readable, blobName, httpHeaders);
    }

    createBufferFromBlob(blobName: string) {
        return this.storage.createBufferFromBlob(blobName);
    }

    async zipFiles(files: { blobName: string; fileName: string }[]): Promise<Buffer> {
        const zip = new AdmZip();

        const bufferToZipPromises = files.map((file) => {
            const { blobName, fileName } = file;
            return this.createBufferFromBlob(blobName).then((buffer) => {
                return { fileName, buffer };
            });
        });

        const bufferToZipSettled = await Promise.allSettled(bufferToZipPromises);
        for (const result of bufferToZipSettled) {
            if (result.status === 'fulfilled') {
                const { fileName, buffer } = result.value;
                if (buffer) {
                    zip.addFile(fileName, buffer);
                }
            }
        }

        return zip.toBuffer();
    }

    async resizeImage(image, percentage = 75): Promise<Buffer> {
        const { width, height } = await sharp(image).metadata();
        const resizedWith = Math.round(width * (percentage / 100));
        const resizedHeight = Math.round(height * (percentage / 100));

        return sharp(image).resize(resizedWith, resizedHeight).toBuffer();
    }

    async uploadImageWithThumbnail(image, fileName?: string) {
        const thumbnailBuffer = await this.resizeImage(image.buffer);
        const [{ blobName: origin }, { blobName: thumbnail }] = await Promise.all([
            this.storage.uploadFile({ file: image, fileName }),
            this.storage.uploadFile({ file: thumbnailBuffer, fileName: fileName || image.originalname })
        ]);

        return { origin, thumbnail };
    }

    getFileStream(blobName: string) {
        return this.storage.getFileStream(blobName);
    }

    getFileBuffer(blobName: string) {
        return this.storage.getFileBuffer(blobName);
    }

    getRetrieveFileName(blobName: string) {
        return this.storage.retrieveFileName(blobName);
    }

    getProperties(blobName: string): Promise<BlobStorageProperties> {
        return this.storage.getProperties(blobName);
    }
}
