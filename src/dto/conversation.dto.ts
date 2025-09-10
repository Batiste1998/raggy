import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  user_id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  first_message?: string;
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
