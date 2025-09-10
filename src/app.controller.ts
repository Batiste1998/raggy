import {
  Controller,
  Get,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './database';

// Default maximum file size: 10MB in bytes
const DEFAULT_MAX_FILE_SIZE_B = 10485760;

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('config')
  getConfig() {
    const maxFileSizeBytes = parseInt(
      this.configService.get(
        'MAX_FILE_SIZE_B',
        DEFAULT_MAX_FILE_SIZE_B.toString(),
      ),
      10,
    );
    const maxFileSizeMB = Math.round(maxFileSizeBytes / (1024 * 1024));

    return {
      maxFileSizeMB: maxFileSizeMB,
      maxFileSizeBytes: maxFileSizeBytes,
      message: `Maximum file size allowed: ${maxFileSizeMB}MB (${maxFileSizeBytes} bytes)`,
    };
  }

  @Post('reset')
  async resetDatabase() {
    try {
      // Use query builder to handle foreign key constraints properly
      await this.resourceRepository.query('DELETE FROM document_chunks');
      await this.resourceRepository.query('DELETE FROM resources');

      return {
        success: true,
        message: 'Database has been completely reset',
        details: 'All resources and document chunks have been deleted',
      };
    } catch {
      throw new HttpException(
        'Failed to reset database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
