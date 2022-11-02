import { StorageModule } from 'libs/storage.module';
import { env } from './env.config';

export const storageConfig = StorageModule.forRoot({
    account: {
        name: env.AZURE.ACCOUNT_NAME,
        key: env.AZURE.ACCOUNT_KEY,
        containerName: env.AZURE.CONTAINER_NAME,
        expiredIn: env.AZURE.SAS_EXPIRED_IN
    },
    disk: 's3'
});
