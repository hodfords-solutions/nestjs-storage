import { DynamicModule, Global, Module } from '@nestjs/common';
import { AzureAdapter } from './adapters/azure.adapter';
import { ADAPTER, CLOUD_ACCOUNT } from './constants/provider.constants';
import { StorageService } from './services/storage.service';
import { StorageOptions } from './types/storage-options.type';
import { S3Adapter } from './adapters/s3.adapter';

@Global()
@Module({})
export class StorageModule {
    public static forRoot(options: StorageOptions): DynamicModule {
        const accountOptionsProvider = {
            provide: CLOUD_ACCOUNT,
            useValue: options.account
        };
        let adapterProvider;
        if (options.disk === 's3') {
            adapterProvider = {
                provide: ADAPTER,
                useClass: S3Adapter
            };
        } else {
            adapterProvider = {
                provide: ADAPTER,
                useClass: AzureAdapter
            };
        }

        return {
            providers: [adapterProvider, StorageService, accountOptionsProvider],
            exports: [StorageService, accountOptionsProvider],
            module: StorageModule
        };
    }
}
