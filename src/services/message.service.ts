import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, Conversation } from '../database/entities';
import { CreateMessageDto, MessageResponseDto } from '../dto';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  /**
   * Create a new message in a conversation
   */
  async createMessage(
    conversationId: string,
    dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    try {
      this.logger.log(`Creating message in conversation: ${conversationId}`);

      // Verify conversation exists
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Create message
      const message = this.messageRepository.create({
        conversation_id: conversationId,
        conversation: conversation,
        content: dto.content,
        role: dto.role,
      });

      await this.messageRepository.save(message);

      // Update conversation updatedAt
      await this.conversationRepository.update(conversationId, {
        updatedAt: new Date(),
      });

      this.logger.log(`Message created: ${message.id}`);

      return {
        id: message.id,
        conversation_id: message.conversation_id,
        content: message.content,
        role: message.role,
        createdAt: message.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create message in conversation ${conversationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
  ): Promise<MessageResponseDto[]> {
    try {
      this.logger.log(`Getting messages for conversation: ${conversationId}`);

      // Verify conversation exists
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const messages = await this.messageRepository.find({
        where: { conversation_id: conversationId },
        order: { createdAt: 'ASC' },
      });

      return messages.map((msg) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.content,
        role: msg.role,
        createdAt: msg.createdAt,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get messages for conversation ${conversationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get a specific message
   */
  async getMessage(messageId: string): Promise<MessageResponseDto> {
    try {
      this.logger.log(`Getting message: ${messageId}`);

      const message = await this.messageRepository.findOne({
        where: { id: messageId },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      return {
        id: message.id,
        conversation_id: message.conversation_id,
        content: message.content,
        role: message.role,
        createdAt: message.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get message ${messageId}`, error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      this.logger.log(`Deleting message: ${messageId}`);

      const result = await this.messageRepository.delete(messageId);

      if (result.affected === 0) {
        throw new NotFoundException('Message not found');
      }

      this.logger.log(`Message deleted: ${messageId}`);
    } catch (error) {
      this.logger.error(`Failed to delete message ${messageId}`, error);
      throw error;
    }
  }

  /**
   * Get recent messages for context (useful for RAG)
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 10,
  ): Promise<Message[]> {
    try {
      this.logger.log(
        `Getting recent ${limit} messages for conversation: ${conversationId}`,
      );

      return await this.messageRepository.find({
        where: { conversation_id: conversationId },
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Failed to get recent messages for conversation ${conversationId}`,
        error,
      );
      throw error;
    }
  }
}
