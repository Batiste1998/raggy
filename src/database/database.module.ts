import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  Resource,
  DocumentChunk,
  User,
  Conversation,
  Message,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [Resource, DocumentChunk, User, Conversation, Message],
        synchronize: process.env.NODE_ENV === 'development',
        logging:
          process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
        // Configuration pgvector
        extra: {
          // Options supplémentaires pour pgvector si nécessaire
        },
      }),
      inject: [ConfigService],
    }),
    // Register repositories for dependency injection
    TypeOrmModule.forFeature([
      Resource,
      DocumentChunk,
      User,
      Conversation,
      Message,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
