import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// LangChain imports
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OllamaEmbeddings } from '@langchain/ollama';
import { ChatOllama } from '@langchain/ollama';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { Document } from '@langchain/core/documents';

// Document loaders
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';

// Entities
import { Resource, DocumentChunk } from '../database';

@Injectable()
export class LangchainService {
  private readonly logger = new Logger(LangchainService.name);
  private vectorStore: PGVectorStore;
  private embeddings: OllamaEmbeddings;
  private chatModel: ChatOllama;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
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
   * Search for similar documents
   */
  async searchSimilar(): Promise<DocumentChunk[]> {
    // This will be implemented with PGVector similarity search
    // For now, return empty array
    return await Promise.resolve([]);
  }

  /**
   * Generate RAG response
   */
  async generateRAGResponse(query: string): Promise<string> {
    try {
      // Find similar documents
      const similarDocs = await this.searchSimilar();

      // Create context from similar documents
      const context = similarDocs.map((doc) => doc.content).join('\n\n');

      // Generate response using chat model
      const prompt = `Context: ${context}\n\nQuestion: ${query}\n\nAnswer:`;

      const response = await this.chatModel.invoke(prompt);

      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    } catch (error) {
      this.logger.error('Failed to generate RAG response', error);
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
