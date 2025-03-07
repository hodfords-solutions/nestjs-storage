import { StorageModule } from 'lib/storage.module';
import { env } from './env.config';

export const storageConfig = StorageModule.forRoot({
    account: {
        name: env.AZURE.ACCOUNT_NAME,
        key: env.AZURE.ACCOUNT_KEY,
        containerName: env.AZURE.CONTAINER_NAME,
        expiredIn: env.AZURE.SAS_EXPIRED_IN,
        region: env.AZURE.REGION
    },
    disk: 's3'
});
