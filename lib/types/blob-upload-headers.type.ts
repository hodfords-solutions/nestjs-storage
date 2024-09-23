export type BlobUploadHeaders = {
    blobCacheControl?: string;
    blobContentType?: string;
    blobContentMD5?: Uint8Array;
    blobContentEncoding?: string;
    blobContentLanguage?: string;
    blobContentDisposition?: string;
};
