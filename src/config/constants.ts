/**
 * Centralized constants for the Raggy application
 * This file consolidates all duplicated constants and magic numbers
 */

// Configuration des fichiers (utilise les variables d'environnement existantes)
export const FILE_CONFIG = {
  // Default max file size: 10MB in bytes
  DEFAULT_MAX_SIZE_BYTES: 10485760,

  // Get max file size from environment or use default
  getMaxSizeBytes: (): number => {
    const envSize = process.env.MAX_FILE_SIZE_B;
    return envSize ? parseInt(envSize, 10) : FILE_CONFIG.DEFAULT_MAX_SIZE_BYTES;
  },

  // Supported MIME types for file uploads
  ALLOWED_MIME_TYPES: [
    'text/csv',
    'application/pdf',
    'text/plain',
    'application/json',
  ] as const,

  // Get max file size in MB for display
  getMaxSizeMB: (): number => {
    return Math.round(FILE_CONFIG.getMaxSizeBytes() / (1024 * 1024));
  },
} as const;

// Rôles des messages dans les conversations
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;

// Configuration des chunks de documents (utilise les variables d'environnement)
export const DOCUMENT_CONFIG = {
  // Default values used as fallbacks
  DEFAULT_CHUNK_SIZE: 1000,
  DEFAULT_CHUNK_OVERLAP: 200,

  // Get chunk size from environment or use default
  getChunkSize: (): number => {
    const envSize = process.env.DOCUMENT_CHUNK_SIZE;
    return envSize ? parseInt(envSize, 10) : DOCUMENT_CONFIG.DEFAULT_CHUNK_SIZE;
  },

  // Get chunk overlap from environment or use default
  getChunkOverlap: (): number => {
    const envOverlap = process.env.DOCUMENT_CHUNK_OVERLAP;
    return envOverlap
      ? parseInt(envOverlap, 10)
      : DOCUMENT_CONFIG.DEFAULT_CHUNK_OVERLAP;
  },
} as const;

// Types TypeScript pour la sécurité des types
export type MessageRole = (typeof MESSAGE_ROLES)[keyof typeof MESSAGE_ROLES];
export type AllowedMimeType = (typeof FILE_CONFIG.ALLOWED_MIME_TYPES)[number];

// Helper functions pour la validation
export const isValidMimeType = (
  mimeType: string,
): mimeType is AllowedMimeType => {
  return FILE_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
};

export const isValidMessageRole = (role: string): role is MessageRole => {
  return Object.values(MESSAGE_ROLES).includes(role as MessageRole);
};

// Messages d'erreur standardisés
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: (maxSizeMB: number) =>
    `File size exceeds maximum limit of ${maxSizeMB}MB`,
  UNSUPPORTED_FILE_TYPE: (mimeType: string, allowedTypes: readonly string[]) =>
    `Unsupported file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`,
  INVALID_MIME_TYPE_MATCH: (provided: string, detected: string) =>
    `Provided mimeType (${provided}) doesn't match detected type (${detected})`,
} as const;

