import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MessageService } from '../services';
import { ConversationService } from '../services';
import { LangchainService } from '../services';
import { MessageResponseDto, SendSimpleMessageDto } from '../dto';

@Controller('messages')
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly langchainService: LangchainService,
  ) {}

  /**
   * GET /messages/:id - Get a specific message
   */
  @Get(':id')
  async getMessage(@Param('id') messageId: string): Promise<{
    success: boolean;
    message: MessageResponseDto;
  }> {
    try {
      this.logger.log(`Getting message: ${messageId}`);

      const message = await this.messageService.getMessage(messageId);

      return {
        success: true,
        message,
      };
    } catch (error) {
      this.logger.error(`Failed to get message ${messageId}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /messages - Send a message and get RAG response
   */
  @Post()
  async sendMessage(@Body() dto: SendSimpleMessageDto): Promise<{
    id: string;
    answer: string;
  }> {
    try {
      this.logger.log(`Sending message in conversation: ${dto.conversation}`);

      // Verify conversation exists (throws 404 if not found)
      const { conversation } = await this.conversationService.getConversation(
        dto.conversation,
      );

      // Create user message
      const userMessage = await this.messageService.createMessage(
        dto.conversation,
        {
          content: dto.content,
          role: 'user',
        },
      );

      // Generate RAG response with conversation context
      const ragResponse = await this.langchainService.generateRAGResponse(
        dto.content,
        dto.conversation,
        conversation.user_id,
      );

      // Create assistant message
      await this.messageService.createMessage(dto.conversation, {
        content: ragResponse,
        role: 'assistant',
      });

      this.logger.log(
        `Message sent and RAG response generated for conversation: ${dto.conversation}`,
      );

      return {
        id: userMessage.id,
        answer: ragResponse,
      };
    } catch (error) {
      this.logger.error('Failed to send message', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /messages/:id - Delete a specific message
   */
  @Delete(':id')
  async deleteMessage(@Param('id') messageId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`Deleting message: ${messageId}`);

      await this.messageService.deleteMessage(messageId);

      return {
        success: true,
        message: 'Message deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete message ${messageId}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
