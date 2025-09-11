import {
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, Conversation } from '../database/entities';
import { CreateMessageDto, MessageResponseDto } from '../dto';
import { AttributeExtractionService } from './attribute-extraction.service';
import { MESSAGE_ROLES } from '../config/constants';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @Inject(forwardRef(() => AttributeExtractionService))
    private readonly attributeExtractionService: AttributeExtractionService,
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

      // Trigger attribute extraction for user messages (async, no await)
      if (dto.role === MESSAGE_ROLES.USER) {
        // Add small delay to ensure transaction is committed
        setTimeout(() => {
          this.triggerAttributeExtractionForMessage(
            conversation.user_id,
            message.id,
          ).catch((error) => {
            this.logger.error(
              `Failed to trigger attribute extraction for user ${conversation.user_id}`,
              error,
            );
          });
        }, 100); // 100ms delay
      }

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
   * Trigger attribute extraction for a specific message (async background process)
   */
  private async triggerAttributeExtractionForMessage(
    userId: string,
    messageId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Triggering attribute extraction for user: ${userId}, message: ${messageId}`,
      );
      await this.attributeExtractionService.processAttributeExtractionForMessage(
        userId,
        messageId,
      );
      this.logger.log(
        `Attribute extraction completed for user: ${userId}, message: ${messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Attribute extraction failed for user ${userId}, message ${messageId}`,
        error,
      );
      // Don't re-throw - this is a background process
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
