import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter to handle all unhandled exceptions
 * Replaces repetitive try-catch blocks in controllers
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log the error with context
    this.logError(exception, request);

    // Handle HttpException (business logic errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();

      response.status(status).json({
        ...this.getErrorResponse(errorResponse),
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Handle unexpected errors (system errors)
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({
      statusCode: status,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === 'development' && {
        error:
          exception instanceof Error ? exception.message : String(exception),
      }),
    });
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(exception: unknown, request: Request): void {
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('user-agent') || '';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      // Log client errors (4xx) as warnings, server errors (5xx) as errors
      if (status >= 400 && status < 500) {
        this.logger.warn(`${method} ${url} ${status} - ${exception.message}`, {
          userAgent,
          exception: exception.getResponse(),
        });
      } else {
        this.logger.error(
          `${method} ${url} ${status} - ${exception.message}`,
          exception.stack,
        );
      }
    } else {
      // Log unexpected errors as critical errors
      this.logger.error(
        `${method} ${url} 500 - Unhandled Exception`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
  }

  /**
   * Normalize error response format
   */
  private getErrorResponse(errorResponse: string | object): object {
    if (typeof errorResponse === 'string') {
      return { message: errorResponse };
    }

    // If it's already an object, return as-is
    return errorResponse;
  }
}
