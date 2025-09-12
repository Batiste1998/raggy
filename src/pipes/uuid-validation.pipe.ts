import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

@Injectable()
export class UuidValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      exceptionFactory: (errors) => {
        // Check if the error is related to UUID validation
        const uuidErrors = errors.filter((error) => {
          const constraints = error.constraints || {};
          return Object.keys(constraints).some((key) =>
            key.toLowerCase().includes('uuid') ||
            constraints[key]?.toLowerCase().includes('uuid')
          );
        });

        if (uuidErrors.length > 0) {
          // Return 404 for UUID validation errors
          throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
        }

        // For other validation errors, use the default behavior (400)
        return super.createExceptionFactory()(errors);
      },
    });
  }
}