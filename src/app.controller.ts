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

  @Get('configuration')
  getConfiguration() {
    try {
      // Check if critical configuration is available
      const maxFileSizeBytes = parseInt(
        this.configService.get(
          'MAX_FILE_SIZE_B',
          DEFAULT_MAX_FILE_SIZE_B.toString(),
        ),
        10,
      );

      // Verify that we have a valid configuration
      if (!maxFileSizeBytes || maxFileSizeBytes <= 0) {
        throw new HttpException(
          'No active configuration found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        message: 'Configuration loaded successfully',
        max_file_size_bytes: maxFileSizeBytes,
        status_code: HttpStatus.OK,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'System error while retrieving configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
