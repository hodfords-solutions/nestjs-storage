import { describe, expect, it } from 'vitest';

describe('package entry', () => {
    it('exports something', async () => {
        const mod = await import('../lib/index.js');
        expect(Object.keys(mod).length).toBeGreaterThan(0);
    });

    it('exposes the storage module and service', async () => {
        const { StorageModule, StorageService, AzureAdapter, BaseStorageAdapter } = await import('../lib/index.js');
        expect(StorageModule).toBeTypeOf('function');
        expect(StorageService).toBeTypeOf('function');
        expect(AzureAdapter).toBeTypeOf('function');
        expect(BaseStorageAdapter).toBeTypeOf('function');
    });
});
