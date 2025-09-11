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
import { SendSimpleMessageDto } from '../dto';
import { StandardResponse } from '../dto/response.dto';
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
  async getMessage(@Param('id') messageId: string): Promise<
    StandardResponse<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: Date;
    }>
  > {
    this.logger.log(`Getting message: ${messageId}`);
    const message = await this.messageService.getMessage(messageId);

    return {
      message: 'Message retrieved successfully',
      data: {
        id: message.id,
        conversation_id: message.conversation_id,
        role: message.role,
        content: message.content,
        created_at: message.createdAt,
      },
    };
  }

  /**
   * POST /messages - Send a message and get RAG response
   */
  @Post()
  async sendMessage(@Body() dto: SendSimpleMessageDto): Promise<
    StandardResponse<{
      id: string;
      answer: string;
    }>
  > {
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
      message: 'Message sent successfully',
      data: {
        id: userMessage.id,
        answer: ragResponse,
      },
    };
  }

  /**
   * DELETE /messages/:id - Delete a specific message
   */
  @Delete(':id')
  async deleteMessage(@Param('id') messageId: string): Promise<
    StandardResponse<{
      id: string;
    }>
  > {
    this.logger.log(`Deleting message: ${messageId}`);
    await this.messageService.deleteMessage(messageId);

    return {
      message: 'Message deleted successfully',
      data: {
        id: messageId,
      },
    };
  }
}
