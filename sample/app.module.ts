import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { storageConfig } from './configs/storage.config.js';

@Module({
    imports: [storageConfig],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
