import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import slugify from 'slugify';

export function generateUniqueName(filePath: string): string {
    const uuid = uuidv4();
    const maxLength = 255;
    // eslint-disable-next-line prefer-const
    let { dir, name, ext } = path.parse(filePath);
    name = slugify(name, {
        replacement: '-',
        lower: true,
        strict: true,
        trim: true
    });
    const expectedFileNameLength = name.length + uuid.length + 1 + ext.length;

    if (expectedFileNameLength > maxLength) {
        const fileName = `${uuid}-${name.substring(0, maxLength - uuid.length - ext.length - 1)}${ext}`;
        return path.join(dir, fileName);
    }

    const fileName = `${uuid}-${name}${ext}`;
    return path.join(dir, fileName);
}
