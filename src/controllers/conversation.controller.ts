import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import { ConversationService } from '../services';
import { MessageService } from '../services';
import {
  CreateSimpleConversationDto,
  ConversationResponseDto,
  GetConversationsDto,
  MessageResponseDto,
} from '../dto';

@Controller('conversations')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * POST /conversations - Create a new conversation (simplified API)
   * Creates a conversation for a user with welcome message for first conversations
   */
  @Post()
  async createConversation(@Body() dto: CreateSimpleConversationDto): Promise<{
    id: string;
    message: string;
    welcome_message?: string;
  }> {
    this.logger.log(`Creating conversation for user: ${dto.user}`);

    // Create conversation using new service method (throws 404 if user not found)
    const { conversation, welcome_message } =
      await this.conversationService.createSimpleConversation(dto);

    this.logger.log(`Conversation created: ${conversation.id}`);

    const response: {
      id: string;
      message: string;
      welcome_message?: string;
    } = {
      id: conversation.id,
      message: 'Conversation created successfully',
    };

    // Add welcome message only if it exists
    if (welcome_message) {
      response.welcome_message = welcome_message.content;
    }

    return response;
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
    this.logger.log(`Getting conversations for user: ${dto.user_id}`);
    const conversations = await this.conversationService.getUserConversations(
      dto.user_id,
    );

    return {
      success: true,
      conversations,
      count: conversations.length,
    };
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
    this.logger.log(`Getting conversation: ${conversationId}`);
    const { conversation, messages } =
      await this.conversationService.getConversation(conversationId);

    return {
      success: true,
      conversation,
      messages,
    };
  }

  /**
   * DELETE /conversations/:id - Delete a conversation
   */
  @Delete(':id')
  async deleteConversation(@Param('id') conversationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Deleting conversation: ${conversationId}`);
    await this.conversationService.deleteConversation(conversationId);

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
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
    this.logger.log(`Getting messages for conversation: ${conversationId}`);
    const messages =
      await this.messageService.getConversationMessages(conversationId);

    return {
      success: true,
      messages,
      count: messages.length,
    };
  }
}
