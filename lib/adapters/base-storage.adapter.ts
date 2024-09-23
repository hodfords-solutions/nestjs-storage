import { v4 as uuidv4 } from 'uuid';

export abstract class BaseStorageAdapter {
    getFileNameToUpload(file: Express.Multer.File): string {
        const originalName = file.originalname;
        const dashIndex = originalName.indexOf('_');
        return originalName.substring(dashIndex + 1);
    }

    async streamToBuffer(readableStream: NodeJS.ReadableStream | undefined): Promise<Buffer | null> {
        return new Promise((resolve: (value: Buffer | null) => void) => {
            if (!readableStream) {
                return resolve(null);
            }
            const chunks: Buffer[] = [];
            readableStream.on('data', (chunk: any) => {
                const data = chunk instanceof Buffer ? chunk : Buffer.from(chunk);
                chunks.push(data);
            });
            readableStream.on('end', () => resolve(Buffer.concat(chunks)));
            readableStream.on('error', () => resolve(null));
        });
    }

    retrieveFileName(blobName: string): string {
        return blobName.slice(uuidv4().length + 1, blobName.length);
    }
}
