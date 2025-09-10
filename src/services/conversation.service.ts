import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { CreateConversationDto, ConversationResponseDto } from '../dto';

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
  ) {}

  /**
   * Create a new conversation for a user
   */
  async createConversation(dto: CreateConversationDto): Promise<{
    conversation: ConversationResponseDto;
    user: User;
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

      // Create conversation
      const conversation = this.conversationRepository.create({
        user_id: dto.user_id,
        user: user,
        title: dto.title,
      });

      await this.conversationRepository.save(conversation);

      this.logger.log(`Conversation created: ${conversation.id}`);

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
    messages: any[];
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
}
