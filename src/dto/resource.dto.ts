import { IsUUID } from 'class-validator';

export class ResourceParamDto {
  @IsUUID('4', { message: 'ID must be a valid UUID' })
  id: string;
}

export class ResourceResponseDto {
  id: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
}

export class UploadResponseDto {
  success: boolean;
  id: string;
  message: string;
}

export class DeleteResponseDto {
  success: boolean;
  id: string;
  message: string;
  status: number;
}

export class ListResourcesResponseDto {
  success: boolean;
  resources: ResourceResponseDto[];
  count: number;
}
