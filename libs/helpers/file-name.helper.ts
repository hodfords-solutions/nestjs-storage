import { v4 as uuidv4 } from 'uuid';

export function generateUniqueName(fileName = '') {
    const uuid = uuidv4();
    const maxLength = 255;
    const expectedFileNameLength = fileName.length + uuid.length + 1;
    if (expectedFileNameLength > maxLength) {
        fileName = fileName.substring(expectedFileNameLength - maxLength);
    }

    return `${uuidv4()}-${fileName}`;
}
