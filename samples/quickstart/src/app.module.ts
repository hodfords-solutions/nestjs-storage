import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { storageConfig } from './configs/storage.config';

@Module({
    imports: [storageConfig],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
