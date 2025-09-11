# API Routes Documentation - Raggy RAG Chatbot

## Vue d'ensemble

Raggy est un chatbot RAG (Retrieval-Augmented Generation) modulaire avec une API REST complète. Cette documentation détaille toutes les routes disponibles et leur utilisation.

**Base URL**: `http://localhost:3000` (configurable via PORT)

## 1. Routes de Base (AppController)

### GET /

**Description**: Point d'entrée de l'API
**Réponse**: "Hello World!"

### GET /configuration

**Description**: Configuration actuelle de l'API
**Body**: Aucun
**Réponse**:

```json
{
  "message": "Configuration loaded successfully",
  "max_file_size_bytes": 10485760,
  "statusCode": 200
}
```

**Erreurs**:
- `404`: Aucune configuration active
- `500`: Erreur système lors de la récupération

### POST /reset

**Description**: Réinitialise complètement la base de données
**⚠️ Attention**: Supprime TOUTES les données (utilisateurs, conversations, messages, ressources, chunks)
**Body**: Aucun
**Réponse**:

```json
{
  "message": "Database reset completed successfully",
  "statusCode": 200
}
```

**Erreurs**:
- `500`: Erreur système lors du reset

## 2. Routes des Ressources (ResourcesController)

### POST /resources

**Description**: Upload et traitement d'un fichier
**Body**: `multipart/form-data` avec champ `file` (requis)

**Types de fichiers supportés**:
- `text/csv`
- `application/pdf`
- `text/plain`
- `application/json`

**Limite**: 10MB par défaut (configurable via MAX_FILE_SIZE_B)

**Exemple avec curl**:

```bash
curl -X POST http://localhost:3000/resources \
  -F "file=@document.pdf"
```

**Réponse**:

```json
{
  "id": "uuid-resource-id",
  "message": "File uploaded and processed successfully",
  "statusCode": 200
}
```

**Erreurs**:
- `404`: MIME type différent des types acceptés / format différent
- `413`: Fichier trop lourd (taille supérieure à max_file_size_bytes)
- `500`: Erreur système

### DELETE /resources/:id

**Description**: Supprime une ressource et ses chunks
**Paramètres**: `id` (UUID de la ressource)
**Body**: Aucun

**Exemple**:

```bash
curl -X DELETE http://localhost:3000/resources/123e4567-e89b-12d3-a456-426614174000
```

**Réponse**:

```json
{
  "id": "uuid-resource-id",
  "message": "Resource deleted successfully",
  "statusCode": 200
}
```

**Erreurs**:
- `404`: ID de la ressource inconnue
- `500`: Erreur système

### GET /resources

**Description**: Liste toutes les ressources
**Body**: Aucun
**Réponse**:

```json
{
  "resources": [
    {
      "id": "uuid-resource-id",
      "mimeType": "application/pdf",
      "fileSize": 2048576,
      "uploadedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "message": "Resources retrieved successfully",
  "statusCode": 200
}
```

**Erreurs**:
- `500`: Erreur système

### POST /resources/chat (DÉPRÉCIÉ)

**Description**: Endpoint de chat legacy
**⚠️ Déprécié**: Utilisez `/conversations` à la place
**Body**:

```json
{
  "query": "Votre question ici"
}
```

## 3. Routes des Conversations (ConversationController)

### POST /conversations

**Description**: Crée une nouvelle conversation
**Body**:

```json
{
  "user_id": "user-uuid",
  "title": "Titre optionnel",
  "first_message": "Message initial optionnel",
  "skip_welcome_message": false
}
```

**Exemple**:

```bash
curl -X POST http://localhost:3000/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "title": "Discussion nutrition",
    "first_message": "Bonjour, j'\''ai des questions sur l'\''alimentation"
  }'
```

**Réponse**:

```json
{
  "conversation": {
    "id": "conv-uuid",
    "user_id": "user-123",
    "title": "Discussion nutrition",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "first_message": {
    "id": "msg-uuid",
    "content": "Bonjour...",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "ai_response": {
    "id": "msg-uuid-2",
    "content": "Réponse générée par l'\''IA...",
    "role": "assistant",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "welcome_message": {
    "id": "msg-uuid-3",
    "content": "Message de bienvenue...",
    "role": "assistant",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /conversations

**Description**: Conversations d'un utilisateur
**Query**: `?user_id=user-uuid`

**Exemple**:

```bash
curl "http://localhost:3000/conversations?user_id=user-123"
```

**Réponse**:

```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv-uuid",
      "user_id": "user-123",
      "title": "Discussion nutrition",
      "summary": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /conversations/:id

**Description**: Détails d'une conversation avec messages
**Paramètres**: `id` (UUID de la conversation)

**Réponse**:

```json
{
  "success": true,
  "conversation": {
    "id": "conv-uuid",
    "user_id": "user-123",
    "title": "Discussion nutrition",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "messages": [
    {
      "id": "msg-uuid",
      "conversation_id": "conv-uuid",
      "content": "Bonjour",
      "role": "user",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### DELETE /conversations/:id

**Description**: Supprime une conversation et ses messages
**Paramètres**: `id` (UUID de la conversation)

**Réponse**:

```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

### POST /conversations/:id/messages

**Description**: Envoie un message dans une conversation
**Paramètres**: `id` (UUID de la conversation)
**Body**:

```json
{
  "content": "Votre message ici"
}
```

**Réponse**:

```json
{
  "user_message": {
    "id": "msg-uuid",
    "conversation_id": "conv-uuid",
    "content": "Votre message ici",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "ai_response": {
    "id": "msg-uuid-2",
    "conversation_id": "conv-uuid",
    "content": "Réponse générée par l'\''IA avec RAG...",
    "role": "assistant",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /conversations/:id/messages

**Description**: Messages d'une conversation
**Paramètres**: `id` (UUID de la conversation)

**Réponse**:

```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-uuid",
      "conversation_id": "conv-uuid",
      "content": "Message content",
      "role": "user",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

## 4. Routes des Messages (MessageController)

### GET /messages/:id

**Description**: Détails d'un message spécifique
**Paramètres**: `id` (UUID du message)

**Réponse**:

```json
{
  "success": true,
  "message": {
    "id": "msg-uuid",
    "conversation_id": "conv-uuid",
    "content": "Message content",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### DELETE /messages/:id

**Description**: Supprime un message spécifique
**Paramètres**: `id` (UUID du message)

**Réponse**:

```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

## 5. Codes d'erreur courants

### 400 Bad Request

- Fichier manquant lors de l'upload
- Type de fichier non supporté
- Taille de fichier dépassée
- Paramètres manquants ou invalides

### 404 Not Found

- Ressource, conversation ou message inexistant

### 500 Internal Server Error

- Erreur de traitement de fichier
- Erreur de génération RAG
- Erreur de base de données

## 6. Workflow d'utilisation typique

### 1. Upload de documents

```bash
# Upload d'un document
curl -X POST http://localhost:3000/resources \
  -F "file=@nutrition_guide.pdf"

# Récupération de l'ID de ressource
```

### 2. Création de conversation

```bash
# Création avec premier message
curl -X POST http://localhost:3000/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "first_message": "Quelles sont les recommandations nutritionnelles ?"
  }'
```

### 3. Continuation de la conversation

```bash
# Envoi de messages supplémentaires
curl -X POST http://localhost:3000/conversations/{conversation-id}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Pouvez-vous préciser pour les protéines ?"
  }'
```

## 7. Configuration multi-domaines

L'API s'adapte à différents domaines via les variables d'environnement :

- `SYSTEM_PROMPT`: Rôle de l'assistant
- `ASSISTANT_NAME`: Nom de l'assistant
- `ASSISTANT_ROLE`: Rôle détaillé
- `DOMAIN_SPECIFIC_RULES`: Règles spécifiques au domaine