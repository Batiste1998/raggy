import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import { MessageService } from '../services';
import { ConversationService } from '../services';
import { LangchainService } from '../services';
import { MessageResponseDto, SendSimpleMessageDto } from '../dto';
import { MESSAGE_ROLES } from '../config/constants';

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
    this.logger.log(`Getting message: ${messageId}`);
    const message = await this.messageService.getMessage(messageId);

    return {
      success: true,
      message,
    };
  }

  /**
   * POST /messages - Send a message and get RAG response
   */
  @Post()
  async sendMessage(@Body() dto: SendSimpleMessageDto): Promise<{
    id: string;
    answer: string;
  }> {
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
        role: MESSAGE_ROLES.USER,
      },
    );

    // Add user message to conversation history
    await this.langchainService.addMessageToHistory(
      dto.conversation,
      dto.content,
      MESSAGE_ROLES.USER,
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
      role: MESSAGE_ROLES.ASSISTANT,
    });

    // Add assistant message to conversation history
    await this.langchainService.addMessageToHistory(
      dto.conversation,
      ragResponse,
      MESSAGE_ROLES.ASSISTANT,
    );

    this.logger.log(
      `Message sent and RAG response generated for conversation: ${dto.conversation}`,
    );

    return {
      id: userMessage.id,
      answer: ragResponse,
    };
  }

  /**
   * DELETE /messages/:id - Delete a specific message
   */
  @Delete(':id')
  async deleteMessage(@Param('id') messageId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Deleting message: ${messageId}`);
    await this.messageService.deleteMessage(messageId);

    return {
      success: true,
      message: 'Message deleted successfully',
    };
  }
}
