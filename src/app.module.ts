import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { memoryStorage } from 'multer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import {
  LangchainService,
  ConversationService,
  MessageService,
} from './services';
import {
  ResourcesController,
  ConversationController,
  MessageController,
} from './controllers';
import { ResponseInterceptor } from './interceptors';

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
  controllers: [
    AppController,
    ResourcesController,
    ConversationController,
    MessageController,
  ],
  providers: [
    AppService,
    LangchainService,
    ConversationService,
    MessageService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [LangchainService],
})
export class AppModule {}
