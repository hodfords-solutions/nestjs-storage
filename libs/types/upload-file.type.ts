export type UploadFileType = {
    file: Express.Multer.File | Buffer;
    mimetype?: string;
    fileName?: string;
    blobName?: string;
};
