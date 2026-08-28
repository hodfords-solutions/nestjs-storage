import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { CLOUD_ACCOUNT } from '../lib/constants/provider.constants.js';
import { StorageModule } from '../lib/storage.module.js';
import { StorageService } from '../lib/services/storage.service.js';

const account = { name: 'account', key: 'key', container: 'container', region: 'ap-southeast-1' };

describe('StorageModule', () => {
    it('resolves StorageService with the azure adapter', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [StorageModule.forRoot({ disk: 'azure', account } as any)]
        }).compile();

        expect(moduleRef.get(StorageService)).toBeInstanceOf(StorageService);
        expect(moduleRef.get(CLOUD_ACCOUNT)).toEqual(account);
        await moduleRef.close();
    });

    it('resolves StorageService with the s3 adapter', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [StorageModule.forRoot({ disk: 's3', account } as any)]
        }).compile();

        expect(moduleRef.get(StorageService)).toBeInstanceOf(StorageService);
        await moduleRef.close();
    });
});
