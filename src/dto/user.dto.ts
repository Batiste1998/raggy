import { IsString, IsArray, IsOptional, IsUUID } from 'class-validator';

// Type pour les attributs extraits avec validation plus stricte
export interface ExtractedAttributesData {
  [key: string]: string | undefined;
}

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
}

// Interface pour les utilisateurs avec attributs extraits
export interface UserWithAttributesDto extends UserResponseDto {
  [key: string]: string | string[] | Date | undefined;
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
