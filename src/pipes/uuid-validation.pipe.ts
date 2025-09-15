import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

@Injectable()
export class UuidValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        // Check if the error is specifically a UUID format error (not missing/empty field)
        const uuidFormatErrors = errors.filter((error) => {
          const constraints = error.constraints || {};
          const value = error.value;

          // Only consider this a UUID format error if:
          // 1. There's a UUID constraint violation AND
          // 2. The value is not undefined/null/empty (meaning it was provided but invalid)
          // 3. AND it's not a "required field" type error

          const hasUuidConstraint = constraints.isUuid !== undefined;
          const hasRequiredError =
            constraints.isNotEmpty !== undefined ||
            constraints.isDefined !== undefined;

          // Value exists but is invalid UUID format
          const isInvalidUuidFormat =
            hasUuidConstraint &&
            value !== undefined &&
            value !== null &&
            value !== '';

          // Return 404 only for actual UUID format errors, not missing/empty fields
          return isInvalidUuidFormat && !hasRequiredError;
        });

        if (uuidFormatErrors.length > 0) {
          // Return 404 for UUID format validation errors
          throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
        }

        // For other validation errors (missing fields, empty values, etc), use the default behavior (400)
        return super.createExceptionFactory()(errors);
      },
    });
  }
}
