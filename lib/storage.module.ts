import { DynamicModule, Global, Module } from '@nestjs/common';
import { AzureAdapter } from './adapters/azure.adapter.js';
import { ADAPTER, CLOUD_ACCOUNT } from './constants/provider.constants.js';
import { StorageService } from './services/storage.service.js';
import { StorageOptions } from './types/storage-options.type.js';
import { S3Adapter } from './adapters/s3.adapter.js';

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
