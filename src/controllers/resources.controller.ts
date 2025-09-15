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
import { Repository } from 'typeorm';
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
    };
  }

  /**
   * DELETE /resources - Handle missing resource ID
   * Returns: 400 Bad Request with explicit message
   */
  @Delete()
  async deleteResourceWithoutId(): Promise<never> {
    throw new HttpException(
      'Resource ID is required. Use DELETE /resources/{id}',
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * DELETE /resources/:id - Delete a resource and its chunks
   * Returns: Success message
   */
  @Delete(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteResource(@Param() params: ResourceParamDto) {
    const { id } = params;

    // Check if ID is provided
    if (!id || id.trim() === '') {
      throw new HttpException(
        'Resource ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

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
    };
  }

  /**
   * GET /resources - List all resources
   * Returns: Array of resources with id and metadata
   */
  @Get()
  async getResources() {
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
      resources: sanitizedResources.map((resource) => ({
        id: resource.id,
        mime_type: resource.mimeType,
        file_size: resource.fileSize,
        uploaded_at: resource.uploadedAt,
      })),
      count: sanitizedResources.length,
    };
  }

  /**
   * POST /resources/chat - Legacy RAG endpoint (DEPRECATED)
   * @deprecated Use /conversations endpoint instead for better conversation management
   * Returns: RAG response based on uploaded documents
   */
  @Post('chat')
  async chat(
    @Body() chatDto: ChatDto,
  ): Promise<{ query: string; response: string }> {
    this.logger.warn(
      'Using deprecated /resources/chat endpoint. Consider using /conversations instead.',
    );

    const response = await this.langchainService.generateRAGResponse(
      chatDto.query,
    );

    this.logger.log(`RAG response generated for query: "${chatDto.query}"`);

    return {
      query: chatDto.query,
      response,
    };
  }
}
