import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import pgvector from 'pgvector';

// LangChain imports
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OllamaEmbeddings } from '@langchain/ollama';
import { ChatOllama } from '@langchain/ollama';
import { Document } from '@langchain/core/documents';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { BaseRetriever } from '@langchain/core/retrievers';

// Document loaders
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';

// Entities
import { DocumentChunk } from '../database';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

// Interface for raw SQL query results
interface RawChunkResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  resource_id: string;
  embedding: number[];
}

// Custom retriever class
class CustomRetriever extends BaseRetriever {
  lc_namespace = ['custom'];

  constructor(private langchainService: LangchainService) {
    super();
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const chunks = await this.langchainService.searchSimilar(query, 5);
    return chunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.content,
          metadata: {
            ...chunk.metadata,
            resource_id: chunk.resource_id,
            id: chunk.id,
          },
        }),
    );
  }
}

@Injectable()
export class LangchainService {
  private readonly logger = new Logger(LangchainService.name);
  private embeddings: OllamaEmbeddings;
  private chatModel: ChatOllama;
  private textSplitter: RecursiveCharacterTextSplitter;
  private messageHistories: Record<string, InMemoryChatMessageHistory> = {};
  private retriever: CustomRetriever;
  private historyAwareRetriever: any;
  private stuffChain: any;
  private retrievalChain: any;
  private conversationalChain: RunnableWithMessageHistory<any, any>;
  private stuffChainNoHistory: any;
  private retrievalChainNoHistory: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(DocumentChunk)
    private documentChunkRepository: Repository<DocumentChunk>,
  ) {
    void this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Initialize embeddings with Ollama
      this.embeddings = new OllamaEmbeddings({
        model: this.configService.get('OLLAMA_EMBEDDING_MODEL'),
        baseUrl: this.configService.get('OLLAMA_BASE_URL'),
      });

      // Initialize chat model with Ollama
      this.chatModel = new ChatOllama({
        model: this.configService.get('OLLAMA_CHAT_MODEL'),
        baseUrl: this.configService.get('OLLAMA_BASE_URL'),
      });

      // Initialize text splitter
      this.textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: parseInt(
          this.configService.get('DOCUMENT_CHUNK_SIZE', '1000'),
          10,
        ),
        chunkOverlap: parseInt(
          this.configService.get('DOCUMENT_CHUNK_OVERLAP', '200'),
          10,
        ),
      });

      // Initialize custom retriever
      this.retriever = new CustomRetriever(this);

      // Create history aware retriever
      const historyAwarePrompt = ChatPromptTemplate.fromMessages([
        new MessagesPlaceholder('chat_history'),
        ['user', '{input}'],
        [
          'user',
          'Given the above conversation, generate a search query to look up relevant information.',
        ],
      ]);
      this.historyAwareRetriever = await createHistoryAwareRetriever({
        llm: this.chatModel,
        retriever: this.retriever,
        rephrasePrompt: historyAwarePrompt,
      });

      // Create stuff documents chain
      const qaPrompt = ChatPromptTemplate.fromMessages([
        ['system', this.configService.get<string>('SYSTEM_PROMPT', '')],
        new MessagesPlaceholder('chat_history'),
        [
          'user',
          `Context: {context}\n\nQuestion: {input}\n\n${this.configService.get<string>('DOMAIN_SPECIFIC_RULES', 'Utilise les documents disponibles pour fournir des réponses pertinentes et utiles.')}`,
        ],
      ]);
      this.stuffChain = await createStuffDocumentsChain({
        llm: this.chatModel,
        prompt: qaPrompt,
      });

      // Create retrieval chain
      this.retrievalChain = await createRetrievalChain({
        retriever: this.historyAwareRetriever,
        combineDocsChain: this.stuffChain,
      });

      // Create conversational chain
      this.conversationalChain = new RunnableWithMessageHistory({
        runnable: this.retrievalChain,
        getMessageHistory: (sessionId: string) =>
          this.getMessageHistory(sessionId),
        inputMessagesKey: 'input',
        historyMessagesKey: 'chat_history',
      });

      // Create no history stuff chain
      const qaPromptNoHistory = ChatPromptTemplate.fromMessages([
        ['system', this.configService.get<string>('SYSTEM_PROMPT', '')],
        [
          'user',
          `Context: {context}\n\nQuestion: {input}\n\n${this.configService.get<string>('DOMAIN_SPECIFIC_RULES', 'Utilise les documents disponibles pour fournir des réponses pertinentes et utiles.')}`,
        ],
      ]);
      this.stuffChainNoHistory = await createStuffDocumentsChain({
        llm: this.chatModel,
        prompt: qaPromptNoHistory,
      });
      this.retrievalChainNoHistory = await createRetrievalChain({
        retriever: this.retriever,
        combineDocsChain: this.stuffChainNoHistory,
      });

      // Initialize vector store
      await this.initializeVectorStore();

      this.logger.log('LangChain services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LangChain services', error);
      throw error;
    }
  }

  private async initializeVectorStore() {
    // This will be implemented when we have the database connection
    // For now, we'll initialize it when needed
  }

  private getMessageHistory(sessionId: string): InMemoryChatMessageHistory {
    if (!this.messageHistories[sessionId]) {
      this.messageHistories[sessionId] = new InMemoryChatMessageHistory();
    }
    return this.messageHistories[sessionId];
  }

  /**
   * Process a file based on its MIME type
   */
  async processFile(
    fileBuffer: Buffer,
    mimeType: string,
    resourceId: string,
  ): Promise<void> {
    try {
      let documents: Document[] = [];

      switch (mimeType) {
        case 'text/csv':
          documents = await this.loadCSV(fileBuffer);
          break;
        case 'application/pdf':
          documents = await this.loadPDF(fileBuffer);
          break;
        case 'text/plain':
          documents = await this.loadText(fileBuffer);
          break;
        case 'application/json':
          documents = await this.loadJSON(fileBuffer);
          break;
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Split documents into chunks
      const chunks = await this.splitText(documents);

      // Generate embeddings and store in vector database
      await this.storeChunksInVectorDB(chunks, resourceId);

      this.logger.log(
        `Successfully processed file buffer (${fileBuffer.length} bytes)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process file buffer (${fileBuffer.length} bytes)`,
        error,
      );
      throw error;
    }
  }

  /**
   * Load CSV file from buffer
   */
  private async loadCSV(fileBuffer: Buffer): Promise<Document[]> {
    const tempPath = join(tmpdir(), `temp-${Date.now()}.csv`);
    try {
      await writeFile(tempPath, fileBuffer);
      const loader = new CSVLoader(tempPath);
      return await loader.load();
    } finally {
      await unlink(tempPath).catch(() => {}); // Ignore errors
    }
  }

  /**
   * Load PDF file from buffer
   */
  private async loadPDF(fileBuffer: Buffer): Promise<Document[]> {
    const tempPath = join(tmpdir(), `temp-${Date.now()}.pdf`);
    try {
      await writeFile(tempPath, fileBuffer);
      const loader = new PDFLoader(tempPath, {
        splitPages: false, // Create one document per file
      });
      return await loader.load();
    } finally {
      await unlink(tempPath).catch(() => {}); // Ignore errors
    }
  }

  /**
   * Load text file from buffer
   */
  private async loadText(fileBuffer: Buffer): Promise<Document[]> {
    const tempPath = join(tmpdir(), `temp-${Date.now()}.txt`);
    try {
      await writeFile(tempPath, fileBuffer);
      const loader = new TextLoader(tempPath);
      return await loader.load();
    } finally {
      await unlink(tempPath).catch(() => {}); // Ignore errors
    }
  }

  /**
   * Load JSON file from buffer
   */
  private async loadJSON(fileBuffer: Buffer): Promise<Document[]> {
    const tempPath = join(tmpdir(), `temp-${Date.now()}.json`);
    try {
      await writeFile(tempPath, fileBuffer);
      const loader = new JSONLoader(tempPath);
      return await loader.load();
    } finally {
      await unlink(tempPath).catch(() => {}); // Ignore errors
    }
  }

  /**
   * Split documents into chunks
   */
  private async splitText(documents: Document[]): Promise<Document[]> {
    return await this.textSplitter.splitDocuments(documents);
  }

  /**
   * Store document chunks in vector database
   */
  private async storeChunksInVectorDB(
    chunks: Document[],
    resourceId: string,
  ): Promise<void> {
    try {
      // Generate embeddings for all chunks
      const texts: string[] = chunks.map((chunk) => chunk.pageContent);
      const embeddings: number[][] =
        await this.embeddings.embedDocuments(texts);

      // Store chunks in database
      const documentChunks = chunks.map((chunk, index) => ({
        id: undefined, // Will be auto-generated
        content: chunk.pageContent,
        embedding: embeddings[index],
        metadata: chunk.metadata,
        resource_id: resourceId,
      }));

      await this.documentChunkRepository.save(documentChunks);

      this.logger.log(
        `Stored ${chunks.length} chunks for resource ${resourceId}`,
      );
    } catch (error) {
      this.logger.error('Failed to store chunks in vector database', error);
      throw error;
    }
  }

  /**
   * Search for similar documents using pgvector similarity
   */
  async searchSimilar(query: string, k: number = 5): Promise<DocumentChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Use raw SQL query with pgvector distance operator
      const rawResults: unknown[] = await this.documentChunkRepository.query(
        `
        SELECT id, content, metadata, resource_id, embedding
        FROM document_chunks 
        ORDER BY embedding::vector <-> $1::vector 
        LIMIT $2
      `,
        [pgvector.toSql(queryEmbedding), k],
      );

      // Type cast to our interface
      const results = rawResults as RawChunkResult[];

      this.logger.log(
        `Found ${results.length} similar chunks for query: "${query}"`,
      );

      // Convert raw results to DocumentChunk entities
      return results.map((row) => {
        const chunk = new DocumentChunk();
        chunk.id = row.id;
        chunk.content = row.content;
        chunk.metadata = row.metadata;
        chunk.resource_id = row.resource_id;
        chunk.embedding = row.embedding;
        return chunk;
      });
    } catch (error) {
      this.logger.error('Failed to search similar documents', error);
      throw error;
    }
  }

  /**
   * Generate RAG response using system prompt from .env
   */
  async generateRAGResponse(query: string): Promise<string>;
  async generateRAGResponse(
    query: string,
    conversationId?: string,
    userId?: string,
  ): Promise<string>;
  async generateRAGResponse(
    query: string,
    conversationId?: string,
    userId?: string,
  ): Promise<string> {
    try {
      this.logger.log(`Starting RAG response generation for query: "${query}"`);
      if (conversationId) {
        this.logger.log(
          `Conversation context: ${conversationId}, User: ${userId}`,
        );
      }

      let finalResponse: string;
      if (conversationId) {
        // Use conversational retrieval chain
        const response = await this.conversationalChain.invoke(
          { input: query },
          { configurable: { sessionId: conversationId } },
        );
        finalResponse = response.answer;
      } else {
        // Use retrieval chain without history
        const response = await this.retrievalChainNoHistory.invoke({
          input: query,
        });
        finalResponse = response.answer;
      }

      this.logger.log(`Final response length: ${finalResponse.length}`);
      return finalResponse;
    } catch (error) {
      this.logger.error('Failed to generate RAG response', error);
      throw error;
    }
  }

  /**
   * Generate RAG response with conversation memory using RunnableWithMessageHistory
   */
  async generateRAGResponseWithMemory(
    query: string,
    conversationId: string,
    userId?: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Starting RAG response with memory for query: "${query}"`,
      );
      this.logger.log(`Conversation: ${conversationId}, User: ${userId}`);

      // Use conversational retrieval chain
      const response = await this.conversationalChain.invoke(
        { input: query },
        { configurable: { sessionId: conversationId } },
      );
      const finalResponse: string = response.answer;

      this.logger.log(
        `RAG response with memory generated, length: ${finalResponse.length}`,
      );
      return finalResponse;
    } catch (error) {
      this.logger.error('Failed to generate RAG response with memory', error);
      throw error;
    }
  }

  /**
   * Generate a welcome message for a new user
   */
  async generateWelcomeMessage(userId: string): Promise<string> {
    try {
      this.logger.log(`Generating welcome message for user: ${userId}`);

      // Get system prompt from environment variables
      const systemPrompt = this.configService.get<string>('SYSTEM_PROMPT', '');

      // Create welcome prompt
      const welcomePrompt = `${systemPrompt}

Tu es ${this.configService.get<string>('ASSISTANT_NAME', 'Assistant')}, un ${this.configService.get<string>('ASSISTANT_ROLE', 'assistant virtuel intelligent')}.
Un nouvel utilisateur vient de créer sa première conversation avec toi.

Génère un message d'accueil chaleureux et engageant qui :
- Te présente comme ${this.configService.get<string>('ASSISTANT_NAME', 'Assistant')}, ${this.configService.get<string>('ASSISTANT_ROLE', 'assistant virtuel')}
- Explique brièvement ton rôle et tes compétences
- Montre de l'empathie et de la bienveillance
- Invite l'utilisateur à poser ses questions
- Utilise un ton professionnel mais amical

Message d'accueil personnalisé :`;

      this.logger.log('Calling chat model for welcome message...');
      const response = await this.chatModel.invoke(welcomePrompt);
      this.logger.log('Welcome message generated successfully');

      const welcomeMessage =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      this.logger.log(
        `Welcome message length: ${welcomeMessage.length} characters`,
      );
      return welcomeMessage;
    } catch (error) {
      this.logger.error('Failed to generate welcome message', error);
      throw error;
    }
  }

  /**
   * Delete all chunks for a resource
   */
  async deleteResourceChunks(resourceId: string): Promise<void> {
    try {
      await this.documentChunkRepository.delete({ resource_id: resourceId });
      this.logger.log(`Deleted all chunks for resource ${resourceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete chunks for resource ${resourceId}`,
        error,
      );
      throw error;
    }
  }
}
