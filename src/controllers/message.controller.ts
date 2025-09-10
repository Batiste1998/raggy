import {
  Controller,
  Get,
  Delete,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MessageService } from '../services';
import { MessageResponseDto } from '../dto';

@Controller('messages')
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(private readonly messageService: MessageService) {}

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
