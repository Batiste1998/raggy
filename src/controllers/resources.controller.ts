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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// Services
import { LangchainService } from '../services';
import { Resource } from '../database';
import { ChatDto, ResourceParamDto } from '../dto';
import {
  FILE_CONFIG,
  isValidMimeType,
  ERROR_MESSAGES,
} from '../config/constants';

@Controller('resources')
export class ResourcesController {
  private readonly logger = new Logger(ResourcesController.name);

  constructor(
    private readonly langchainService: LangchainService,
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
          ERROR_MESSAGES.INVALID_MIME_TYPE_MATCH(body.mimeType, file.mimetype),
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check file size
      const maxFileSizeBytes = FILE_CONFIG.getMaxSizeBytes();
      const maxFileSizeMB = FILE_CONFIG.getMaxSizeMB();

      if (file.size > maxFileSizeBytes) {
        throw new HttpException(
          ERROR_MESSAGES.FILE_TOO_LARGE(maxFileSizeMB),
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }

      // Validate MIME type
      if (!isValidMimeType(file.mimetype)) {
        throw new HttpException(
          ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE(
            file.mimetype,
            FILE_CONFIG.ALLOWED_MIME_TYPES,
          ),
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteResource(@Param() params: ResourceParamDto) {
    const { id } = params;

    try {
      this.logger.log(`Attempting to delete resource: ${id}`);

      // Check if resource exists
      const resource = await this.resourceRepository.findOne({ where: { id } });
      if (!resource) {
        this.logger.warn(`Resource not found for deletion: ${id}`);
        throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Found resource ${id}, proceeding with deletion`);

      // Delete chunks first (cascade will handle this, but explicit is better)
      await this.langchainService.deleteResourceChunks(id);

      // Delete resource
      await this.resourceRepository.delete(id);

      this.logger.log(`Resource deleted successfully: ${id}`);

      return {
        id,
        message: 'Resource deleted successfully',
      };
    } catch (error) {
      // Handle validation pipe errors (will be thrown before reaching here due to @UsePipes)
      if (error instanceof HttpException) {
        this.logger.error(
          `HTTP error deleting resource ${id}: ${error.message}`,
          error.getResponse(),
        );
        throw error;
      }

      // Handle PostgreSQL/TypeORM specific errors
      if (error instanceof QueryFailedError) {
        this.logger.error(`Database error deleting resource ${id}:`, {
          message: error.message,
          query: error.query,
          parameters: error.parameters,
          driverError: String(error.driverError),
        });

        // Check if it's a UUID format error
        if (error.message.includes('invalid input syntax for type uuid')) {
          throw new HttpException(
            'Invalid resource ID format',
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new HttpException(
          'Database error occurred while deleting resource',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Generic error handling
      this.logger.error(`Unexpected error deleting resource ${id}`, error);
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
        resources: sanitizedResources,
        count: sanitizedResources.length,
        message: 'Resources retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to retrieve resources', error);

      throw new HttpException(
        'Failed to retrieve resources',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /resources/chat - Legacy RAG endpoint (DEPRECATED)
   * @deprecated Use /conversations endpoint instead for better conversation management
   * Returns: RAG response based on uploaded documents
   */
  @Post('chat')
  async chat(
    @Body() chatDto: ChatDto,
  ): Promise<{ success: boolean; query: string; response: string }> {
    try {
      this.logger.warn(
        'Using deprecated /resources/chat endpoint. Consider using /conversations instead.',
      );

      const response = await this.langchainService.generateRAGResponse(
        chatDto.query,
      );

      this.logger.log(`RAG response generated for query: "${chatDto.query}"`);

      return {
        success: true,
        query: chatDto.query,
        response,
      };
    } catch (error) {
      this.logger.error('Failed to generate RAG response', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to generate RAG response',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
