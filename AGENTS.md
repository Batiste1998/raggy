# Agent Guidelines for Raggy (NestJS Project)

## Project Context

This project is a Retrieval-Augmented Generation (RAG) chatbot built on NestJS. The stack includes:

- LangChain.js v0.3 for RAG orchestration
- PostgreSQL with pgvector extension for vector similarity search
- TypeORM as the ORM for database interaction
- Ollama hosted at http://51.178.114.10 for conversational AI and embeddings:
  - gemma3:latest model for conversation
  - nomic-embed-text model for embeddings
- The PostgreSQL instance is containerized via Docker with vector extension enabled

The project structure follows a modular NestJS architecture. All code must adhere to strict guidelines for clarity, maintainability, and testability.

## Commands

- **Build**: `npm run build` (nest build)  
- **Dev server**: `npm run start:dev` (nest start --watch)  
- **Lint**: `npm run lint` (eslint with --fix)  
- **Format**: `npm run format` (prettier)  
- **Test all**: `npm test` (jest)  
- **Test single**: `npm test -- --testPathPattern=filename.spec.ts`  
- **Test watch**: `npm run test:watch`  
- **Test coverage**: `npm run test:cov`  
- **E2E tests**: `npm run test:e2e`  

## Code Style

- Use TypeScript with ES2023 target  
- Single quotes for imports, trailing commas enabled  
- PascalCase for classes, camelCase for methods/properties  
- Strict null checks enabled, `noImplicitAny` set to false  
- Use NestJS decorators (@Controller, @Injectable, etc.)  
- Handle errors with proper try/catch and error types  
- Always use async/await for asynchronous code  

## Architecture

- NestJS framework with Express platform  
- Modular structure: Controllers → Services → Modules  
- Modular organization in the `src` directory  
- Unit tests with Jest alongside source files in `.spec.ts`  
- E2E tests in the `test/` directory  

## Development Rules for AI Agent (RAG Chatbot)

- The assistant **must proceed strictly step-by-step** and never generate multiple files or larger code parts without explicit confirmation  
- After completing **each and every single step**, the assistant **must stop and wait for your validation** before continuing  
- No assumptions or estimations of step duration; the assistant **only proceeds after you say "OK"** or equivalent approval  
- The assistant **must always explain the reasoning and approach before coding each step**  
- Each step must be atomic and focused for easy review and validation  
- Use clear prompts like:  
  - "Step X: [description of the task]"  
  - "Explanation: [reasoning behind this step]"  
  - "Code snippet:"  
  - "Do I have your approval to continue to the next step?"  
- Never say "Finished" until **all steps are validated**  
- Testing and validation steps must be proposed and executed iteratively  
- Follow LangChain.js v0.3 documentation strictly for implementation details  

## Git Operation Restriction

- The AI agent **MUST NOT execute any Git commit, push, or related version control operations**  
- All commits, pushes, and pull requests are to be managed manually by the human developer  
- The agent can suggest commit messages or changelog content but must never perform Git commands  

## Conventions  

- Controllers handle HTTP requests and delegate to services  
- Services contain the business logic and data access  
- Modules organize related controllers and services  
- Write unit tests for all business logic in `.spec.ts` files  
- Write integration and E2E tests for complete flows  

---

Keep strict control of the development process for maintainability and ease of review. Ask for confirmation before proceeding after each step.
