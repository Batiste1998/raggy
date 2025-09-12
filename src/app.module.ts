import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { APP_FILTER } from '@nestjs/core';
import { memoryStorage } from 'multer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import {
  LangchainService,
  ConversationService,
  MessageService,
  UserService,
  AttributeExtractionService,
} from './services';
import {
  ResourcesController,
  ConversationController,
  MessageController,
  UserController,
} from './controllers';
import { GlobalExceptionFilter } from './filters';

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
    UserController,
  ],
  providers: [
    AppService,
    LangchainService,
    ConversationService,
    MessageService,
    UserService,
    AttributeExtractionService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [LangchainService],
})
export class AppModule {}
