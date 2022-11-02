import { Request } from 'express';

export type BlobNameResolver = (req: Request, file: Express.Multer.File) => string;

export type StorageEngineOptions = {
    blobNameFn: BlobNameResolver;
    accessKey: string;
    accountName: string;
    containerName: string;
};
