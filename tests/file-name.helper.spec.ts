import { describe, expect, it } from 'vitest';
import { generateUniqueName } from '../lib/helpers/file-name.helper.js';

describe('generateUniqueName', () => {
    it('slugifies the original name and keeps the extension', () => {
        const name = generateUniqueName('Hinh Anh Dep.png');
        expect(name.endsWith('.png')).toBe(true);
        expect(name).not.toContain(' ');
        expect(name).toContain('hinh-anh-dep');
    });

    it('produces a unique name for the same input', () => {
        expect(generateUniqueName('a.txt')).not.toBe(generateUniqueName('a.txt'));
    });

    it('keeps the directory part of the path', () => {
        expect(generateUniqueName('folder/a.txt').startsWith('folder/')).toBe(true);
    });
});
