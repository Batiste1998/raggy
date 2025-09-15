import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

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
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
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
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  user_id: string;
}
