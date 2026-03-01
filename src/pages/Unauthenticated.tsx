import { useNavigate } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';

/**
 * Unauthenticated (401) Error Page
 * Displays when user needs to log in to access a resource
 * 
 * Validates: Requirements 13.1, 13.2
 */
export default function Unauthenticated() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500/20 dark:bg-yellow-500/10 rounded-full blur-2xl"></div>
                        <div className="relative bg-gradient-to-br from-yellow-500 to-orange-500 p-6 rounded-full">
                            <Lock className="w-16 h-16 text-white" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>

                {/* Error Code */}
                <div className="mb-4">
                    <span className="inline-block px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-semibold">
                        خطأ 401 - غير مصادق عليه
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    يجب تسجيل الدخول
                </h1>

                {/* Subtitle */}
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                    يجب تسجيل الدخول للوصول إلى هذا المورد
                </p>

                {/* Description */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        انتهت جلستك أو لم تقم بتسجيل الدخول بعد. يرجى تسجيل الدخول للمتابعة.
                    </p>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => navigate('/login')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <LogIn className="w-5 h-5" />
                    تسجيل الدخول
                </button>

                {/* Additional Info */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                        إذا كنت تواجه مشكلة في تسجيل الدخول، يرجى التواصل مع فريق الدعم الفني
                    </p>
                </div>
            </div>
        </div>
    );
}
