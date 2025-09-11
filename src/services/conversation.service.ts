import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import {
  CreateConversationDto,
  CreateSimpleConversationDto,
  ConversationResponseDto,
  MessageResponseDto,
} from '../dto';
import { LangchainService } from './langchain.service';
import { MessageService } from './message.service';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly langchainService: LangchainService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Create a new conversation for a user
   */
  async createConversation(dto: CreateConversationDto): Promise<{
    conversation: ConversationResponseDto;
    user: User;
    welcome_message?: MessageResponseDto;
  }> {
    try {
      this.logger.log(`Creating conversation for user: ${dto.user_id}`);

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { id: dto.user_id },
      });

      if (!user) {
        this.logger.log(`Creating new user: ${dto.user_id}`);
        user = this.userRepository.create({ id: dto.user_id });
        await this.userRepository.save(user);
      }

      // Check if this is the user's first conversation
      const userConversationCount = await this.conversationRepository.count({
        where: { user_id: dto.user_id },
      });

      const isFirstConversation = userConversationCount === 0;
      this.logger.log(
        `Is first conversation for user ${dto.user_id}: ${isFirstConversation}`,
      );

      // Create conversation
      const conversation = this.conversationRepository.create({
        user_id: dto.user_id,
        user: user,
        title: dto.title,
      });

      await this.conversationRepository.save(conversation);
      this.logger.log(`Conversation created: ${conversation.id}`);

      let welcomeMessage: MessageResponseDto | undefined;

      // Generate welcome message for first conversation (if no first_message provided and not skipped)
      if (
        isFirstConversation &&
        !dto.first_message &&
        !dto.skip_welcome_message
      ) {
        this.logger.log('Generating welcome message for first conversation');

        try {
          const welcomeContent =
            await this.langchainService.generateWelcomeMessage(dto.user_id);

          welcomeMessage = await this.messageService.createMessage(
            conversation.id,
            {
              content: welcomeContent,
              role: 'assistant',
            },
          );

          this.logger.log(
            `Welcome message created for conversation: ${conversation.id}`,
          );
        } catch (error) {
          this.logger.error(
            'Failed to generate welcome message, continuing without it',
            error,
          );
          // Continue without welcome message if generation fails
        }
      }

      return {
        conversation: {
          id: conversation.id,
          user_id: conversation.user_id,
          title: conversation.title,
          summary: conversation.summary,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        user,
        welcome_message: welcomeMessage,
      };
    } catch (error) {
      this.logger.error('Failed to create conversation', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
  ): Promise<ConversationResponseDto[]> {
    try {
      this.logger.log(`Getting conversations for user: ${userId}`);

      const conversations = await this.conversationRepository.find({
        where: { user_id: userId },
        order: { updatedAt: 'DESC' },
      });

      return conversations.map((conv) => ({
        id: conv.id,
        user_id: conv.user_id,
        title: conv.title,
        summary: conv.summary,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get conversations for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get a specific conversation with messages
   */
  async getConversation(conversationId: string): Promise<{
    conversation: ConversationResponseDto;
    messages: MessageResponseDto[];
  }> {
    try {
      this.logger.log(`Getting conversation: ${conversationId}`);

      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
        relations: ['messages'],
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const messages = conversation.messages.map((msg: Message) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.content,
        role: msg.role,
        createdAt: msg.createdAt,
      }));

      return {
        conversation: {
          id: conversation.id,
          user_id: conversation.user_id,
          title: conversation.title,
          summary: conversation.summary,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation ${conversationId}`, error);
      throw error;
    }
  }

  /**
   * Update conversation summary
   */
  async updateConversationSummary(
    conversationId: string,
    summary: string,
  ): Promise<void> {
    try {
      this.logger.log(`Updating summary for conversation: ${conversationId}`);

      await this.conversationRepository.update(conversationId, {
        summary,
        updatedAt: new Date(),
      });

      this.logger.log(`Summary updated for conversation: ${conversationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update summary for conversation ${conversationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      this.logger.log(`Deleting conversation: ${conversationId}`);

      // Delete messages first (cascade should handle this, but explicit is better)
      await this.messageRepository.delete({ conversation_id: conversationId });

      // Delete conversation
      await this.conversationRepository.delete(conversationId);

      this.logger.log(`Conversation deleted: ${conversationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete conversation ${conversationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a simple conversation (new API with 404 for unknown users)
   */
  async createSimpleConversation(dto: CreateSimpleConversationDto): Promise<{
    conversation: ConversationResponseDto;
    welcome_message?: MessageResponseDto;
  }> {
    try {
      this.logger.log(`Creating simple conversation for user: ${dto.user}`);

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { id: dto.user },
      });

      if (!user) {
        this.logger.log(`Creating new user: ${dto.user}`);
        user = this.userRepository.create({ id: dto.user });
        await this.userRepository.save(user);
      }

      // Check if this is the user's first conversation
      const userConversationCount = await this.conversationRepository.count({
        where: { user_id: dto.user },
      });

      const isFirstConversation = userConversationCount === 0;
      this.logger.log(
        `Is first conversation for user ${dto.user}: ${isFirstConversation}`,
      );

      // Create conversation
      const conversation = this.conversationRepository.create({
        user_id: dto.user,
        user: user,
      });

      await this.conversationRepository.save(conversation);
      this.logger.log(`Simple conversation created: ${conversation.id}`);

      let welcomeMessage: MessageResponseDto | undefined;

      // Generate welcome message for first conversation only
      if (isFirstConversation) {
        this.logger.log('Generating welcome message for first conversation');

        try {
          const welcomeContent =
            await this.langchainService.generateWelcomeMessage(dto.user);

          welcomeMessage = await this.messageService.createMessage(
            conversation.id,
            {
              content: welcomeContent,
              role: 'assistant',
            },
          );

          this.logger.log(
            `Welcome message created for conversation: ${conversation.id}`,
          );
        } catch (error) {
          this.logger.error(
            'Failed to generate welcome message, continuing without it',
            error,
          );
        }
      }

      return {
        conversation: {
          id: conversation.id,
          user_id: conversation.user_id,
          title: conversation.title,
          summary: conversation.summary,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        welcome_message: welcomeMessage,
      };
    } catch (error) {
      this.logger.error('Failed to create simple conversation', error);
      throw error;
    }
  }
}
