import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LangchainService } from './services';
import { ResourcesController } from './controllers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    // Configure Multer for file uploads (in-memory storage)
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [AppController, ResourcesController],
  providers: [AppService, LangchainService],
  exports: [LangchainService],
})
export class AppModule {}
