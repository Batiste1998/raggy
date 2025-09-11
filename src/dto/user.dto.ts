import { IsString, IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsArray({ message: 'Required attributes must be an array' })
  @IsString({ each: true, message: 'Each attribute must be a string' })
  required_attributes: string[];
}

export class UserResponseDto {
  id: string;
  required_attributes: string[];
  createdAt: Date;
  updatedAt: Date;
  // Index signature pour les attributs extraits dynamiquement
  [key: string]: any;
}

export class UpdateUserDto {
  @IsArray({ message: 'Required attributes must be an array' })
  @IsString({ each: true, message: 'Each attribute must be a string' })
  @IsOptional()
  required_attributes?: string[];
}

export class UserParamDto {
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  id: string;
}
