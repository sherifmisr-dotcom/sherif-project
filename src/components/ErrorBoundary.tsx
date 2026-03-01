import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Displays fallback UI and logs error details
 * 
 * Validates: Requirements 13.1, 13.2, 13.5
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging (would be sent to logging service in production)
    console.error('Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 dark:bg-orange-500/10 rounded-full blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-full">
                  <AlertTriangle className="w-16 h-16 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              عذراً، حدث خطأ غير متوقع
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              حدث خطأ أثناء معالجة طلبك
            </p>

            {/* Error Message (simplified for users) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                نعتذر عن الإزعاج. يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                إعادة المحاولة
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                <Home className="w-5 h-5" />
                الصفحة الرئيسية
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                إذا استمرت المشكلة، يرجى التواصل مع فريق الدعم الفني
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
