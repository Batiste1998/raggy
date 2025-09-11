import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Message, Conversation } from '../database/entities';
import { LangchainService } from './langchain.service';

@Injectable()
export class AttributeExtractionService {
  private readonly logger = new Logger(AttributeExtractionService.name);

  // Configuration pour l'extraction simple

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly langchainService: LangchainService,
  ) {}

  /**
   * Extract attributes from user messages using simple incremental approach
   */
  async extractAttributesFromUserMessages(
    userId: string,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log(
        `Starting simple attribute extraction for user: ${userId}`,
      );

      // Get user with required_attributes and last extraction date
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.required_attributes.length === 0) {
        this.logger.log(
          `No user found or no required_attributes for user: ${userId}`,
        );
        return {};
      }

      // No time-based restrictions - extract on every message

      // Get all user conversations
      const conversations = await this.conversationRepository.find({
        where: { user_id: userId },
      });

      if (conversations.length === 0) {
        this.logger.log(`No conversations found for user: ${userId}`);
        return {};
      }

      const conversationIds = conversations.map((conv) => conv.id);

      // Determine if this is first extraction or incremental
      const isFirstExtraction = !user.last_extraction_date;
      let userMessages: Message[];

      if (isFirstExtraction) {
        // First extraction: get all messages
        this.logger.log(`First extraction for user: ${userId}`);
        userMessages = await this.messageRepository
          .createQueryBuilder('message')
          .where('message.conversation_id IN (:...conversationIds)', {
            conversationIds,
          })
          .andWhere('message.role = :role', { role: 'user' })
          .orderBy('message.createdAt', 'ASC')
          .getMany();
      } else {
        // Incremental extraction: get messages since last extraction
        this.logger.log(
          `Incremental extraction for user: ${userId} since ${user.last_extraction_date?.toISOString() || 'never'}`,
        );
        
        const query = this.messageRepository
          .createQueryBuilder('message')
          .where('message.conversation_id IN (:...conversationIds)', {
            conversationIds,
          })
          .andWhere('message.role = :role', { role: 'user' })
          .andWhere('message.createdAt > :lastExtraction', {
            lastExtraction: user.last_extraction_date,
          })
          .orderBy('message.createdAt', 'ASC');
          
        userMessages = await query.getMany();
        
        this.logger.log(`Found ${userMessages.length} messages since last extraction`);

        // Process any new messages (no threshold)
      }

      if (userMessages.length === 0) {
        this.logger.log(`No user messages found for user: ${userId}`);
        return isFirstExtraction ? {} : user.extracted_attributes || {};
      }

      // Combine message content
      const messagesContent = userMessages
        .map((msg) => msg.content)
        .join('\n\n');

      this.logger.log(
        `Extracting attributes from ${userMessages.length} ${isFirstExtraction ? 'total' : 'new'} messages for user: ${userId}`,
      );

      // Use LangChain to extract attributes
      const newExtractedAttributes = await this.extractAttributesWithLangChain(
        messagesContent,
        user.required_attributes,
      );

      // Merge with existing attributes for incremental extraction
      const finalAttributes = isFirstExtraction
        ? newExtractedAttributes
        : this.intelligentMergeAttributes(
            user.extracted_attributes || {},
            newExtractedAttributes,
          );

      this.logger.log(`Final attributes for user ${userId}:`, finalAttributes);

      return finalAttributes;
    } catch (error) {
      this.logger.error(
        `Failed to extract attributes for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Intelligently merge existing attributes with newly extracted ones
   * Newer attributes take precedence over older ones
   */
  private intelligentMergeAttributes(
    existingAttributes: Record<string, any>,
    newAttributes: Record<string, any>,
  ): Record<string, any> {
    this.logger.log('Merging attributes:', {
      existing: existingAttributes,
      new: newAttributes,
    });

    // Simple merge: new attributes override existing ones
    // In the future, we could add more sophisticated logic here
    const mergedAttributes = {
      ...existingAttributes,
      ...newAttributes, // Newer values take precedence
    };

    return mergedAttributes;
  }

  /**
   * Use LangChain to extract specific attributes from text
   */
  private async extractAttributesWithLangChain(
    text: string,
    requiredAttributes: string[],
  ): Promise<Record<string, any>> {
    try {
      const prompt = `
Tu es un assistant spécialisé dans l'extraction d'informations personnelles à partir de conversations.

CONSIGNES STRICTES :
1. Analyse le texte fourni et extrait UNIQUEMENT les informations suivantes : ${requiredAttributes.join(', ')}
2. Réponds EXCLUSIVEMENT en format JSON valide
3. Si une information n'est pas trouvée, ne l'inclus pas dans la réponse
4. Les valeurs doivent être des chaînes de caractères simples
5. Ne retourne aucun texte explicatif, seulement le JSON

ATTRIBUTS À EXTRAIRE : ${requiredAttributes.join(', ')}

TEXTE À ANALYSER :
${text}

RÉPONSE JSON :`;

      this.logger.log('Calling LangChain for attribute extraction...');

      // Use the existing chat model from LangchainService
      const response = await this.langchainService['chatModel'].invoke(prompt);

      let extractedText: string;
      if (typeof response.content === 'string') {
        extractedText = response.content;
      } else {
        extractedText = JSON.stringify(response.content);
      }

      this.logger.log(`Raw LangChain response: ${extractedText}`);

      // Try to parse JSON response
      try {
        // Clean up the response to extract JSON
        const jsonMatch = extractedText.match(/\{[^}]*\}/);
        if (jsonMatch) {
          const extractedAttributes = JSON.parse(jsonMatch[0]);

          // Validate that extracted attributes are in required_attributes
          const validAttributes: Record<string, any> = {};
          for (const [key, value] of Object.entries(extractedAttributes)) {
            if (requiredAttributes.includes(key) && value) {
              validAttributes[key] = String(value); // Ensure string values
            }
          }

          return validAttributes;
        } else {
          this.logger.warn('No valid JSON found in LangChain response');
          return {};
        }
      } catch (parseError) {
        this.logger.error(
          'Failed to parse JSON from LangChain response',
          parseError,
        );
        return {};
      }
    } catch (error) {
      this.logger.error('Failed to extract attributes with LangChain', error);
      return {};
    }
  }

  /**
   * Update user's extracted attributes
   */
  async updateUserExtractedAttributes(
    userId: string,
    newAttributes: Record<string, any>,
  ): Promise<void> {
    try {
      this.logger.log(`Updating extracted attributes for user: ${userId}`);

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        this.logger.warn(`User not found for attribute update: ${userId}`);
        return;
      }

      // Merge new attributes with existing ones
      const mergedAttributes = {
        ...user.extracted_attributes,
        ...newAttributes,
      };

      // Update user in database (last_extraction_date is updated separately in processAttributeExtraction)
      await this.userRepository.update(userId, {
        extracted_attributes: mergedAttributes,
        updatedAt: new Date(),
      });

      this.logger.log(
        `Updated extracted attributes for user: ${userId}`,
        mergedAttributes,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update extracted attributes for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process attribute extraction for a specific message
   */
  async processAttributeExtractionForMessage(
    userId: string,
    messageId: string,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log(`Processing attribute extraction for user: ${userId}, message: ${messageId}`);

      // Get user with required_attributes
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.required_attributes.length === 0) {
        this.logger.log(`No user found or no required_attributes for user: ${userId}`);
        return {};
      }

      // Get the specific message
      const message = await this.messageRepository.findOne({ 
        where: { id: messageId, role: 'user' } 
      });
      
      if (!message) {
        this.logger.log(`Message not found or not a user message: ${messageId}`);
        return user.extracted_attributes || {};
      }

      this.logger.log(`Extracting attributes from message: ${messageId}`);

      // Extract attributes from this single message
      const newExtractedAttributes = await this.extractAttributesWithLangChain(
        message.content,
        user.required_attributes,
      );

      // Merge with existing attributes (new attributes override old ones)
      const finalAttributes = this.intelligentMergeAttributes(
        user.extracted_attributes || {},
        newExtractedAttributes,
      );

      this.logger.log(`Final attributes for user ${userId}:`, finalAttributes);

      // Update user attributes if we found new ones
      if (Object.keys(newExtractedAttributes).length > 0) {
        await this.updateUserExtractedAttributes(userId, finalAttributes);
      }

      return finalAttributes;
    } catch (error) {
      this.logger.error(
        `Failed to process attribute extraction for user ${userId}, message ${messageId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process attribute extraction for a user (combines extract + update)
   */
  async processAttributeExtraction(
    userId: string,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log(`Processing attribute extraction for user: ${userId}`);
      
      // Capture timestamp BEFORE extraction starts
      const extractionStartTime = new Date();

      // Extract attributes from messages
      const extractedAttributes =
        await this.extractAttributesFromUserMessages(userId);

      // Update user if we found new attributes
      if (Object.keys(extractedAttributes).length > 0) {
        await this.updateUserExtractedAttributes(userId, extractedAttributes);
        
        // Update last_extraction_date to the time when extraction started
        // This ensures no messages are missed between extraction start and completion
        await this.userRepository.update(userId, {
          last_extraction_date: extractionStartTime,
        });
      }

      return extractedAttributes;
    } catch (error) {
      this.logger.error(
        `Failed to process attribute extraction for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user with extracted attributes merged into response
   */
  async getUserWithExtractedAttributes(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return null;
      }

      // Merge base user data with extracted attributes
      const userWithAttributes = {
        id: user.id,
        required_attributes: user.required_attributes,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        ...user.extracted_attributes, // Spread extracted attributes as top-level properties
      };

      return userWithAttributes;
    } catch (error) {
      this.logger.error(
        `Failed to get user with extracted attributes ${userId}`,
        error,
      );
      throw error;
    }
  }
}
