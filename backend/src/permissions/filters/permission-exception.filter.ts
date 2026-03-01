import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter for handling permission-related errors
 * Provides user-friendly Arabic messages while logging detailed information
 * 
 * Validates: Requirements 13.1, 13.2, 13.4, 13.5
 */
@Catch()
export class PermissionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PermissionExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const userMessage = this.getUserFriendlyMessage(exception);
    
    // Log detailed error information for administrators
    this.logDetailedError(exception, request);

    // Return simplified error message to user
    response.status(status).json({
      statusCode: status,
      message: userMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Get HTTP status code from exception
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Get user-friendly error message in Arabic
   * Does not expose sensitive system information
   * 
   * Validates: Requirements 13.1, 13.2, 13.5
   */
  private getUserFriendlyMessage(exception: unknown): string {
    if (exception instanceof ForbiddenException) {
      return 'ليس لديك صلاحية للوصول إلى هذا المورد. للحصول على الصلاحيات، يرجى التواصل مع مسؤول النظام.';
    }

    if (exception instanceof UnauthorizedException) {
      return 'يجب تسجيل الدخول للوصول إلى هذا المورد.';
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      
      switch (status) {
        case HttpStatus.NOT_FOUND:
          return 'المورد المطلوب غير موجود.';
        case HttpStatus.BAD_REQUEST:
          return 'البيانات المرسلة غير صالحة.';
        case HttpStatus.CONFLICT:
          return 'حدث تعارض في البيانات.';
        case HttpStatus.UNPROCESSABLE_ENTITY:
          return 'لا يمكن معالجة البيانات المرسلة.';
        default:
          return 'حدث خطأ أثناء معالجة طلبك.';
      }
    }

    return 'حدث خطأ أثناء معالجة طلبك.';
  }

  /**
   * Log detailed error information for administrators
   * Includes user ID, path, method, error details, and stack trace
   * 
   * Validates: Requirement 13.4
   */
  private logDetailedError(exception: unknown, request: Request) {
    const user = request.user as any;
    const status = this.getHttpStatus(exception);

    const errorDetails = {
      userId: user?.id || 'anonymous',
      username: user?.username || 'anonymous',
      path: request.url,
      method: request.method,
      statusCode: status,
      timestamp: new Date().toISOString(),
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      this.logger.error({
        ...errorDetails,
        error: exception.message,
        response: typeof response === 'string' ? response : response,
      });
    } else if (exception instanceof Error) {
      this.logger.error({
        ...errorDetails,
        error: exception.message,
        stack: exception.stack,
      });
    } else {
      this.logger.error({
        ...errorDetails,
        error: 'Unknown error',
        exception: String(exception),
      });
    }
  }
}
