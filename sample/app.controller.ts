import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import * as fs from 'fs';
import { BlobClient, getFileUrl, StorageService } from 'lib';

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private storageService: StorageService
    ) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    getHello(): string {
        return this.appService.getHello();
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(@UploadedFile() file: Express.Multer.File): Promise<BlobClient> {
        return this.storageService.uploadFile({ file });
    }

    @Get(':blobName')
    getFile(@Param('blobName') blobName: string): string | Promise<string> {
        return getFileUrl(blobName);
    }

    @Delete(':blobName')
    deleteFile(@Param('blobName') blobName: string): Promise<void> {
        return this.storageService.deleteIfExists(blobName);
    }

    @Post('upload-stream')
    uploadStream(): Promise<BlobClient> {
        return this.storageService.uploadStream(fs.createReadStream(`${process.cwd()}/.gitignore`), 'test.txt');
    }
}
