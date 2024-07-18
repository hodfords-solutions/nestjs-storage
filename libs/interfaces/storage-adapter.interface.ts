import stream, { Readable } from 'stream';
import { BlobClient } from '../types/blob-client.type';
import { UploadFileType } from '../types/upload-file.type';
import { BlobStorageProperties } from '../types/blob-storage-properties.type';
import { BlobUploadHeaders } from '../types/blob-upload-headers.type';

export interface StorageAdapter {
    getFileNameToUpload(file: Express.Multer.File): string;
    streamToBuffer(readableStream: NodeJS.ReadableStream | undefined): Promise<Buffer | null>;
    retrieveFileName(blobName: string): string;
    uploadStream(stream: Readable, fileName: string): Promise<BlobClient>;
    copyFileFromUrl(url: string, blobName: string);
    uploadFile(data: UploadFileType): Promise<BlobClient>;
    deleteIfExists(blobName: string): Promise<void>;
    generatePresignedUrl(blobName: string, expiresOn?: any, options?: any): string | Promise<string>;
    uploadBlobreadable(readable: stream.Readable, blobName: string, httpHeaders?: BlobUploadHeaders);
    createBufferFromBlob(blobName: string): Promise<Buffer | null>;
    getFileStream(blobName: string): Promise<NodeJS.ReadableStream | undefined>;
    getFileBuffer(blobName: string): Promise<Buffer | null>;
    getProperties(blobName: string): Promise<BlobStorageProperties>;
    deleteFile(blobName: string): Promise<void>;
}
