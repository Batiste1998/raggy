import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

// Services
import { LangchainService } from '../services';
import { Resource } from '../database';

// Default maximum file size: 10MB in bytes
const DEFAULT_MAX_FILE_SIZE_B = 10485760;

@Controller('resources')
export class ResourcesController {
  private readonly logger = new Logger(ResourcesController.name);

  constructor(
    private readonly langchainService: LangchainService,
    private readonly configService: ConfigService,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  /**
   * POST /resources - Upload and process a file
   * Accepts: CSV, PDF, TXT, JSON files
   * Optional: mimeType parameter for validation
   * Returns: Resource ID
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadResource(
    @UploadedFile() file: Express.Multer.File,
    @Body() body?: { mimeType?: string },
  ) {
    try {
      // Validate file
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      // Validate provided mimeType if present
      if (body?.mimeType && body.mimeType !== file.mimetype) {
        throw new HttpException(
          `Provided mimeType (${body.mimeType}) doesn't match detected type (${file.mimetype})`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check file size
      const maxFileSizeBytes = parseInt(
        this.configService.get(
          'MAX_FILE_SIZE_B',
          DEFAULT_MAX_FILE_SIZE_B.toString(),
        ),
        10,
      );
      const maxFileSizeMB = Math.round(maxFileSizeBytes / (1024 * 1024));

      if (file.size > maxFileSizeBytes) {
        throw new HttpException(
          `File size exceeds maximum limit of ${maxFileSizeMB}MB`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate MIME type
      const allowedMimeTypes = [
        'text/csv',
        'application/pdf',
        'text/plain',
        'application/json',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new HttpException(
          `Unsupported file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generate resource ID
      const resourceId = uuidv4();

      // Create resource record
      const resource = this.resourceRepository.create({
        id: resourceId,
        mimeType: file.mimetype,
        fileSize: file.size,
      });

      await this.resourceRepository.save(resource);

      // Process file with LangChain
      await this.langchainService.processFile(
        file.buffer,
        file.mimetype,
        resourceId,
      );

      this.logger.log(`Resource uploaded and processed: ${resourceId}`);

      return {
        success: true,
        id: resourceId,
        message: 'File uploaded and processed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to upload resource', error);

      // If resource was created but processing failed, clean up
      if (error instanceof Error && 'resourceId' in error) {
        try {
          await this.resourceRepository.delete(error.resourceId as string);
        } catch (cleanupError) {
          this.logger.error(
            'Failed to cleanup resource after error',
            cleanupError,
          );
        }
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to process uploaded file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /resources/:id - Delete a resource and its chunks
   * Returns: Success message
   */
  @Delete(':id')
  async deleteResource(@Param('id') id: string) {
    try {
      // Check if resource exists
      const resource = await this.resourceRepository.findOne({ where: { id } });
      if (!resource) {
        throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
      }

      // Delete chunks first (cascade will handle this, but explicit is better)
      await this.langchainService.deleteResourceChunks(id);

      // Delete resource
      await this.resourceRepository.delete(id);

      this.logger.log(`Resource deleted: ${id}`);

      return {
        success: true,
        id,
        message: 'Resource deleted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this.logger.error(`Failed to delete resource ${id}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete resource',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /resources - List all resources
   * Returns: Array of resources with id and metadata
   */
  @Get()
  async getResources() {
    try {
      const resources = await this.resourceRepository.find({
        order: { uploadedAt: 'DESC' },
      });

      // Return only necessary fields for security
      const sanitizedResources = resources.map((resource) => ({
        id: resource.id,
        mimeType: resource.mimeType,
        fileSize: resource.fileSize,
        uploadedAt: resource.uploadedAt,
      }));

      return {
        success: true,
        resources: sanitizedResources,
        count: sanitizedResources.length,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve resources', error);

      throw new HttpException(
        'Failed to retrieve resources',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
