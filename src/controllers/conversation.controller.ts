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
import { CreateSimpleConversationDto, GetConversationsDto } from '../dto';

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
    welcome_message?: string;
    message_id?: string;
  }> {
    this.logger.log(`Creating conversation for user: ${dto.user}`);

    // Create conversation using new service method (throws 404 if user not found)
    const { conversation, welcome_message } =
      await this.conversationService.createSimpleConversation(dto);

    this.logger.log(`Conversation created: ${conversation.id}`);

    const data: {
      id: string;
      welcome_message?: string;
      message_id?: string;
    } = {
      id: conversation.id,
    };

    // Add welcome message only if it exists
    if (welcome_message) {
      data.welcome_message = welcome_message.content;
      data.message_id = welcome_message.id;
    }

    return data;
  }

  /**
   * GET /conversations?user_id={userId} - Get all conversations for a user
   */
  @Get()
  async getUserConversations(@Body() dto: GetConversationsDto): Promise<{
    conversations: Array<{
      id: string;
      user_id: string;
      title?: string;
      summary?: string;
      created_at: Date;
      updated_at: Date;
    }>;
    count: number;
  }> {
    this.logger.log(`Getting conversations for user: ${dto.user_id}`);
    const conversations = await this.conversationService.getUserConversations(
      dto.user_id,
    );

    return {
      conversations: conversations.map((conv) => ({
        id: conv.id,
        user_id: conv.user_id,
        title: conv.title,
        summary: conv.summary,
        created_at: conv.createdAt,
        updated_at: conv.updatedAt,
      })),
      count: conversations.length,
    };
  }

  /**
   * GET /conversations/:id - Get a specific conversation with messages
   */
  @Get(':id')
  async getConversation(@Param('id') conversationId: string): Promise<{
    conversation: {
      id: string;
      user_id: string;
      title?: string;
      summary?: string;
      created_at: Date;
      updated_at: Date;
    };
    messages: Array<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: Date;
    }>;
  }> {
    this.logger.log(`Getting conversation: ${conversationId}`);
    const { conversation, messages } =
      await this.conversationService.getConversation(conversationId);

    return {
      conversation: {
        id: conversation.id,
        user_id: conversation.user_id,
        title: conversation.title,
        summary: conversation.summary,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        created_at: msg.createdAt,
      })),
    };
  }

  /**
   * DELETE /conversations/:id - Delete a conversation
   */
  @Delete(':id')
  async deleteConversation(@Param('id') conversationId: string): Promise<{
    id: string;
  }> {
    this.logger.log(`Deleting conversation: ${conversationId}`);
    await this.conversationService.deleteConversation(conversationId);

    return {
      id: conversationId,
    };
  }

  /**
   * GET /conversations/:id/messages - Get all messages for a conversation
   */
  @Get(':id/messages')
  async getConversationMessages(@Param('id') conversationId: string): Promise<{
    messages: Array<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: Date;
    }>;
    count: number;
  }> {
    this.logger.log(`Getting messages for conversation: ${conversationId}`);
    const messages =
      await this.messageService.getConversationMessages(conversationId);

    return {
      messages: messages.map((msg) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        created_at: msg.createdAt,
      })),
      count: messages.length,
    };
  }
}
