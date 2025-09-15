import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  user_id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  first_message?: string;

  @IsOptional()
  @IsBoolean()
  skip_welcome_message?: boolean; // Skip welcome message generation for first conversations
}

export class CreateSimpleConversationDto {
  @IsString({ message: 'User ID must be provided' })
  @IsNotEmpty({ message: 'User ID cannot be empty' })
  user: string;

  @IsOptional()
  @IsString()
  prompt?: string; // Prompt pour générer le message de bienvenue
}

export class ConversationResponseDto {
  id: string;
  user_id: string;
  title?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetConversationsDto {
  @IsString()
  user_id: string;
}
