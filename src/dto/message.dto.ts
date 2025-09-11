import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { MESSAGE_ROLES } from '../config/constants';
import type { MessageRole } from '../config/constants';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsEnum(MESSAGE_ROLES)
  role: MessageRole;
}

export class MessageResponseDto {
  id: string;
  conversation_id: string;
  content: string;
  role: MessageRole;
  createdAt: Date;
}

export class SendMessageDto {
  @IsString()
  content: string;
}

export class SendSimpleMessageDto {
  @IsString({ message: 'Conversation ID must be provided' })
  @IsNotEmpty({ message: 'Conversation ID cannot be empty' })
  conversation: string;

  @IsString({ message: 'Message content must be provided' })
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  content: string;
}
