export class ResourceResponseDto {
  id: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
}

export class UploadResponseDto {
  success: boolean;
  resourceId: string;
  message: string;
}

export class DeleteResponseDto {
  success: boolean;
  message: string;
}

export class ListResourcesResponseDto {
  success: boolean;
  resources: ResourceResponseDto[];
  count: number;
}
