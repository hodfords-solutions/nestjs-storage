import { StorageService } from '../services/storage.service.js';

export const getFileUrl = (blobName: string) => {
    return StorageService.instance.getFileUrl(blobName);
};
