import { IsString, IsEnum } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsEnum(['user', 'assistant'])
  role: 'user' | 'assistant';
}

export class MessageResponseDto {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

export class SendMessageDto {
  @IsString()
  content: string;
}
