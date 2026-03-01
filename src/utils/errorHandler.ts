import { AxiosError } from 'axios';

/**
 * Error Handler Utilities
 * Provides functions to handle and format API errors
 * 
 * Validates: Requirements 13.1, 13.2, 13.4, 13.5
 */

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp?: string;
  path?: string;
}

/**
 * Check if error is a permission error (403)
 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 403;
  }
  return false;
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}

/**
 * Get user-friendly error message from API error
 * Returns Arabic message from backend or default message
 * 
 * Validates: Requirements 13.1, 13.2, 13.5
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;
    
    // Return backend message if available (already in Arabic)
    if (apiError?.message) {
      return apiError.message;
    }

    // Fallback messages based on status code
    const status = error.response?.status;
    switch (status) {
      case 401:
        return 'يجب تسجيل الدخول للوصول إلى هذا المورد.';
      case 403:
        return 'ليس لديك صلاحية للوصول إلى هذا المورد. للحصول على الصلاحيات، يرجى التواصل مع مسؤول النظام.';
      case 404:
        return 'المورد المطلوب غير موجود.';
      case 400:
        return 'البيانات المرسلة غير صالحة.';
      case 409:
        return 'حدث تعارض في البيانات.';
      case 422:
        return 'لا يمكن معالجة البيانات المرسلة.';
      case 500:
        return 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.';
      default:
        return 'حدث خطأ أثناء معالجة طلبك.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع.';
}

/**
 * Handle API error and redirect if necessary
 * Returns true if error was handled (redirected), false otherwise
 */
export function handleApiError(error: unknown, navigate?: (path: string) => void): boolean {
  if (isAuthenticationError(error)) {
    if (navigate) {
      navigate('/unauthenticated');
      return true;
    }
  }

  if (isPermissionError(error)) {
    if (navigate) {
      navigate('/unauthorized');
      return true;
    }
  }

  return false;
}

/**
 * Log error for debugging (in development) without exposing sensitive info
 * In production, this would send to a logging service
 * 
 * Validates: Requirement 13.4
 */
export function logError(error: unknown, context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  }
  
  // In production, send to logging service
  // Example: sendToLoggingService({ error, context, timestamp: new Date() });
}

/**
 * Format error for display to user
 * Ensures no sensitive information is exposed
 * 
 * Validates: Requirement 13.5
 */
export function formatErrorForUser(error: unknown): {
  message: string;
  canRetry: boolean;
} {
  const message = getErrorMessage(error);
  
  // Determine if user can retry based on error type
  let canRetry = true;
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    // Don't suggest retry for client errors (4xx)
    if (status && status >= 400 && status < 500) {
      canRetry = false;
    }
  }

  return { message, canRetry };
}
