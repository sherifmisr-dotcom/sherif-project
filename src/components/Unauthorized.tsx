import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, Mail, Phone, User } from 'lucide-react';

interface UnauthorizedProps {
    screenName?: string;
    message?: string;
}

/**
 * Unauthorized (403) Error Page
 * Displays user-friendly error message in Arabic with contact information
 * 
 * Validates: Requirements 13.1, 13.2, 13.3
 */
export default function Unauthorized({ screenName, message }: UnauthorizedProps) {
    const navigate = useNavigate();

    const defaultMessage = 'ليس لديك صلاحية للوصول إلى هذا المورد. للحصول على الصلاحيات، يرجى التواصل مع مسؤول النظام.';

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/10 rounded-full blur-2xl"></div>
                        <div className="relative bg-gradient-to-br from-red-500 to-orange-600 p-6 rounded-full">
                            <ShieldAlert className="w-16 h-16 text-white" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>

                {/* Error Code */}
                <div className="mb-4">
                    <span className="inline-block px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-semibold">
                        خطأ 403 - ممنوع الوصول
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    عذراً، ليس لديك صلاحية للوصول
                </h1>

                {/* Subtitle */}
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                    لا تملك صلاحية الوصول إلى هذه الصفحة أو تنفيذ هذا الإجراء
                </p>

                {screenName && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                        الصفحة المطلوبة: <span className="font-semibold text-red-600 dark:text-red-400">{screenName}</span>
                    </p>
                )}

                {/* Error Message */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {message || defaultMessage}
                    </p>
                </div>

                {/* Contact Information Section - Requirement 13.3 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        للحصول على الصلاحيات المطلوبة
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {/* Contact Admin */}
                        <div className="flex items-start gap-3 text-right">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white mb-1">
                                    تواصل مع المسؤول
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    مسؤول النظام
                                </p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-3 text-right">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white mb-1">
                                    البريد الإلكتروني
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-xs">
                                    admin@example.com
                                </p>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-3 text-right">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white mb-1">
                                    الهاتف
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-xs" dir="ltr">
                                    +966 XX XXX XXXX
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            💡 نصيحة: عند التواصل، يرجى ذكر الصفحة أو الإجراء الذي تحتاج الوصول إليه
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        العودة إلى الصفحة الرئيسية
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                    >
                        الرجوع للخلف
                    </button>
                </div>

                {/* Additional Info */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                        إذا كنت تعتقد أن هذا خطأ أو أن لديك الصلاحيات المطلوبة، يرجى تسجيل الخروج وتسجيل الدخول مرة أخرى
                    </p>
                </div>
            </div>
        </div>
    );
}
