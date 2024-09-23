import { BadRequestException, Global, Inject, Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';
import stream, { Readable } from 'stream';
import sharp from 'sharp';
import { UploadFileType } from '../types/upload-file.type';
import { StorageAdapter } from '../interfaces/storage-adapter.interface';
import { ADAPTER } from '../constants/provider.constants';
import { BlobStorageProperties } from '../types/blob-storage-properties.type';
import { BlobUploadHeaders } from '../types/blob-upload-headers.type';
import { BlobSASSignatureValues } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
import { JPEG_MIME_TYPE, SUPPORTED_FORMAT_CONVERT_TO_PNG_TYPES } from '../constants/file.constant';
import { ImageDetailType } from '../types/image-detail.type';
import { OptionUploadFileType } from '../types/option-upload-file.type';
import { BlobClient } from '../types/blob-client.type';
import { ImageFormatEnum } from '../enums/image-format.enum';
import { MimeTypeEnum } from '../enums/mime-type.enum';
import { ImageWithThumbnailType } from 'lib/types/image-with-thumbnail.type';

@Global()
@Injectable()
export class StorageService {
    static instance: StorageService;

    public constructor(@Inject(ADAPTER) private storage: StorageAdapter) {
        StorageService.instance = this;
    }

    async uploadFile(file: UploadFileType, options?: OptionUploadFileType): Promise<BlobClient> {
        if (options) {
            const { mimeTypeConverts, imageFormat } = options;
            if (mimeTypeConverts.includes(file.mimetype as MimeTypeEnum)) {
                const imagePng = await this.convertImagesToPng(file, imageFormat);
                return this.storage.uploadFile({
                    file: imagePng.buffer,
                    mimetype: imagePng.mimetype,
                    fileName: file.fileName ?? imagePng.filename
                });
            }
        }
        return this.storage.uploadFile(file);
    }

    uploadStream(stream: Readable, fileName: string): Promise<BlobClient> {
        return this.storage.uploadStream(stream, fileName);
    }

    copyFileFromUrl(url: string, blobName: string, isPublic?: boolean) {
        if (!blobName || !url) {
            return;
        }
        return this.storage.copyFileFromUrl(url, blobName, isPublic);
    }

    getFileUrl(
        blobName: string,
        expiresOn?: Date,
        options: Partial<BlobSASSignatureValues> = {}
    ): string | Promise<string> {
        return this.storage.generatePresignedUrl(blobName, expiresOn, options);
    }

    getPublicUrl(blobName: string): string {
        return this.storage.getPublicUrl(blobName);
    }

    async deleteIfExists(blobName: string): Promise<void> {
        await this.storage.deleteIfExists(blobName);
    }

    async deleteFile(blobName: string): Promise<void> {
        await this.storage.deleteFile(blobName);
    }

    uploadBlobreadable(readable: stream.Readable, blobName: string, httpHeaders?: BlobUploadHeaders) {
        return this.storage.uploadBlobreadable(readable, blobName, httpHeaders);
    }

    createBufferFromBlob(blobName: string): Promise<Buffer> {
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

    async uploadImageWithThumbnail(image, fileName?: string): Promise<ImageWithThumbnailType> {
        const thumbnailBuffer = await this.resizeImage(image.buffer);
        const [{ blobName: origin }, { blobName: thumbnail }] = await Promise.all([
            this.storage.uploadFile({ file: image, fileName }),
            this.storage.uploadFile({ file: thumbnailBuffer, fileName: fileName || image.originalname })
        ]);

        return { origin, thumbnail };
    }

    getFileStream(blobName: string): Promise<NodeJS.ReadableStream> {
        return this.storage.getFileStream(blobName);
    }

    getFileBuffer(blobName: string): Promise<Buffer> {
        return this.storage.getFileBuffer(blobName);
    }

    getRetrieveFileName(blobName: string): string {
        return this.storage.retrieveFileName(blobName);
    }

    getProperties(blobName: string): Promise<BlobStorageProperties> {
        return this.storage.getProperties(blobName);
    }

    async convertImagesToPng(data: UploadFileType, imageFormat: ImageFormatEnum): Promise<ImageDetailType> {
        const { file, mimetype } = data;
        let buffer: Buffer;
        if (this.validateFileImageConvert(mimetype ?? ('mimetype' in file && file.mimetype))) {
            throw new BadRequestException({ translate: 'error.file_not_support' });
        }
        if (file instanceof Buffer) {
            buffer = await sharp(file).toFormat(imageFormat).toBuffer();
        } else {
            if (file.buffer) {
                buffer = await sharp(file.buffer).toFormat(imageFormat).toBuffer();
            } else {
                buffer = await sharp((file as Express.Multer.File).path)
                    .toFormat(imageFormat)
                    .toBuffer();
            }
        }

        const filename = randomUUID() + '.' + imageFormat;
        return {
            buffer: buffer,
            mimetype: imageFormat === ImageFormatEnum.JPG ? JPEG_MIME_TYPE : `image/${imageFormat}`,
            filename,
            originalname: filename
        };
    }

    validateFileImageConvert(mimetype: string): boolean {
        return !SUPPORTED_FORMAT_CONVERT_TO_PNG_TYPES.includes(mimetype);
    }
}
