import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export function generateUniqueName(filePath: string): string {
    const uuid = uuidv4();
    const maxLength = 255;
    const { dir, name, ext } = path.parse(filePath);
    const expectedFileNameLength = name.length + uuid.length + 1 + ext.length;

    if (expectedFileNameLength > maxLength) {
        const fileName = `${uuid}-${name.substring(0, maxLength - uuid.length - ext.length - 1)}${ext}`;
        return path.join(dir, fileName);
    }

    const fileName = `${uuid}-${name}${ext}`;
    return path.join(dir, fileName);
}
