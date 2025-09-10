import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConversationService } from '../services';
import { MessageService } from '../services';
import { LangchainService } from '../services';
import {
  CreateConversationDto,
  ConversationResponseDto,
  GetConversationsDto,
  SendMessageDto,
  MessageResponseDto,
} from '../dto';

@Controller('conversations')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly langchainService: LangchainService,
  ) {}

  /**
   * POST /conversations - Create a new conversation
   * Creates a conversation for a user and optionally sends the first message
   */
  @Post()
  async createConversation(@Body() dto: CreateConversationDto): Promise<{
    conversation: ConversationResponseDto;
    first_message?: MessageResponseDto;
    ai_response?: MessageResponseDto;
    welcome_message?: MessageResponseDto;
  }> {
    try {
      this.logger.log(`Creating conversation for user: ${dto.user_id}`);

      // Create conversation (with automatic welcome message for first conversations)
      const { conversation, welcome_message } =
        await this.conversationService.createConversation(dto);

      let firstMessage: MessageResponseDto | undefined;
      let aiResponse: MessageResponseDto | undefined;

      // If first message is provided, create it and generate AI response
      if (dto.first_message) {
        // Create user message
        firstMessage = await this.messageService.createMessage(
          conversation.id,
          {
            content: dto.first_message,
            role: 'user',
          },
        );

        // Generate AI response using RAG with conversation context
        const aiResponseContent =
          await this.langchainService.generateRAGResponse(
            dto.first_message,
            conversation.id,
            dto.user_id,
          );

        // Create AI message
        aiResponse = await this.messageService.createMessage(conversation.id, {
          content: aiResponseContent,
          role: 'assistant',
        });
      }

      this.logger.log(`Conversation created: ${conversation.id}`);

      return {
        conversation,
        first_message: firstMessage,
        ai_response: aiResponse,
        welcome_message: welcome_message,
      };
    } catch (error) {
      this.logger.error('Failed to create conversation', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /conversations?user_id={userId} - Get all conversations for a user
   */
  @Get()
  async getUserConversations(@Body() dto: GetConversationsDto): Promise<{
    success: boolean;
    conversations: ConversationResponseDto[];
    count: number;
  }> {
    try {
      this.logger.log(`Getting conversations for user: ${dto.user_id}`);

      const conversations = await this.conversationService.getUserConversations(
        dto.user_id,
      );

      return {
        success: true,
        conversations,
        count: conversations.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get conversations for user ${dto.user_id}`,
        error,
      );

      throw new HttpException(
        'Failed to retrieve conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /conversations/:id - Get a specific conversation with messages
   */
  @Get(':id')
  async getConversation(@Param('id') conversationId: string): Promise<{
    success: boolean;
    conversation: ConversationResponseDto;
    messages: MessageResponseDto[];
  }> {
    try {
      this.logger.log(`Getting conversation: ${conversationId}`);

      const { conversation, messages } =
        await this.conversationService.getConversation(conversationId);

      return {
        success: true,
        conversation,
        messages,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation ${conversationId}`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /conversations/:id - Delete a conversation
   */
  @Delete(':id')
  async deleteConversation(@Param('id') conversationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`Deleting conversation: ${conversationId}`);

      await this.conversationService.deleteConversation(conversationId);

      return {
        success: true,
        message: 'Conversation deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete conversation ${conversationId}`,
        error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /conversations/:id/messages - Send a message in a conversation
   */
  @Post(':id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ): Promise<{
    user_message: MessageResponseDto;
    ai_response: MessageResponseDto;
  }> {
    try {
      this.logger.log(`Sending message in conversation: ${conversationId}`);

      // Create user message
      const userMessage = await this.messageService.createMessage(
        conversationId,
        {
          content: dto.content,
          role: 'user',
        },
      );

      // Get conversation to retrieve user_id for context
      const { conversation } =
        await this.conversationService.getConversation(conversationId);

      // Generate AI response using RAG with conversation context
      const aiResponseContent = await this.langchainService.generateRAGResponse(
        dto.content,
        conversationId,
        conversation.user_id,
      );

      // Create AI message
      const aiMessage = await this.messageService.createMessage(
        conversationId,
        {
          content: aiResponseContent,
          role: 'assistant',
        },
      );

      this.logger.log(
        `Message sent and AI responded in conversation: ${conversationId}`,
      );

      return {
        user_message: userMessage,
        ai_response: aiMessage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send message in conversation ${conversationId}`,
        error,
      );

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
   * GET /conversations/:id/messages - Get all messages for a conversation
   */
  @Get(':id/messages')
  async getConversationMessages(@Param('id') conversationId: string): Promise<{
    success: boolean;
    messages: MessageResponseDto[];
    count: number;
  }> {
    try {
      this.logger.log(`Getting messages for conversation: ${conversationId}`);

      const messages =
        await this.messageService.getConversationMessages(conversationId);

      return {
        success: true,
        messages,
        count: messages.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get messages for conversation ${conversationId}`,
        error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
