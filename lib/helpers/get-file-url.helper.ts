import { StorageService } from '../services/storage.service';

export const getFileUrl = (blobName: string) => {
    return StorageService.instance.getFileUrl(blobName);
};
