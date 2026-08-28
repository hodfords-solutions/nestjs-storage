<p align="center">
  <a href="http://opensource.hodfords.uk" target="blank"><img src="https://opensource.hodfords.uk/img/logo.svg" width="320" alt="Nest Logo" /></a>
</p>

<p align="center">
Nestjs-Storage provides a powerful filesystem abstraction. The Nestjs-Storage integration provides simple drivers for working with local filesystems, Amazon S3, Azure. Even better, it's amazingly simple to switch between these storage options between your local development machine and production server as the API remains the same for each system.
</p>

## Requirements 📋

This package is **ESM-only** (it ships `"type": "module"` and has no CommonJS build).

- Node.js `>=20.19.0` (or `>=22.12`, `>=24.15`, `>=26`)
- NestJS 12
- Consumer projects must use ESM `import` — `require('@hodfords/nestjs-storage')` is not supported.

### Compatibility

| `@hodfords/nestjs-storage` | NestJS | Module format |
| -------------------------- | ------ | ------------- |
| `12.x`                     | 12.x   | ESM only      |
| `11.x`                     | 11.x   | CommonJS      |

## Installation 🤖
To begin using it, we first install the required dependencies.
```
npm install @hodfords/nestjs-storage
```

## Configuration 🚀
To activate storage, import the `StorageModule` into the root `AppModule` and run the `forRoot()` static method as shown below:

Azure configuration:
```typescript
import { Module } from '@nestjs/common';
import { StorageModule } from '@hodfords/nestjs-storage';

@Module({
    imports: [
        StorageModule.forRoot({
            account: {
                name: env.AZURE.ACCOUNT_NAME,
                key: env.AZURE.ACCOUNT_KEY,
                containerName: env.AZURE.CONTAINER_NAME,
                expiredIn: env.AZURE.SAS_EXPIRED_IN
            },
            disk: 'azure'
        })
    ],
})
export class AppModule {}
```

Aws S3 configuration:
```typescript
import { Module } from '@nestjs/common';
import { StorageModule } from '@hodfords/nestjs-storage';

@Module({
    imports: [
        StorageModule.forRoot({
            account: {
                name: env.AWS.API_KEY,
                key: env.AWS.API_SECRET,
                containerName: env.AWS.BUCKET,
                expiredIn: env.AZURE.SAS_EXPIRED_IN,
                region: env.AWS.REGION
            },
            disk: 's3'
        })
    ],
})
export class AppModule {}
```

### Driver Prerequisites:
- **Azure**: `npm install @azure/storage-blob`
- **Aws S3**: `npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner`

## Usage 🚀

Inject storage instance into your service or controller and use it as shown below:

```typescript
import { StorageService } from "@hodfords/nestjs-storage";

@Injectable()
export class AppService implements OnModuleInit {

    constructor(private storageService: StorageService) {
    }
}
```

### Delete file
The delete method accepts a single filename

```typescript
await this.storageService.deleteFile('path/to/file');
```

This method may throw an exception if the file does not exist. You can ignore this exception by using the `deleteIfExists` method.

```typescript
await this.storageService.deleteIfExists('path/to/file');
```

## License
This project is licensed under the MIT License
