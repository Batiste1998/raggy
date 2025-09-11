import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      map((data) => {
        // Don't modify the response if it's already an error or null/undefined
        if (!data || typeof data !== 'object') {
          return data;
        }

        // Add statusCode to the response data
        return {
          ...data,
          statusCode: response.statusCode,
        };
      }),
    );
  }
}