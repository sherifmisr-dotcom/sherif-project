import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { X, KeyRound, User, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface ForgotPasswordModalProps {
    onClose: () => void;
}

export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ message: string; hasEmail: boolean } | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) {
            setError('يرجى إدخال اسم المستخدم');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setResult(null);
            const response = await apiClient.forgotPassword(username.trim());
            setResult(response);
        } catch (err: any) {
            const message = err.response?.data?.message || 'حدث خطأ أثناء المعالجة. يرجى المحاولة لاحقاً.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-8">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    style={{ position: 'relative', float: 'left', marginTop: '-0.5rem' }}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center space-y-2 mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
                        <KeyRound className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">نسيت كلمة المرور؟</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">أدخل اسم المستخدم وسنساعدك في استعادة حسابك</p>
                </div>

                {/* Content */}
                <div>
                    {!result ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    اسم المستخدم
                                </label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                                        placeholder="أدخل اسم المستخدم"
                                        autoFocus
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !username.trim()}
                                className="w-full btn-primary justify-center py-3"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        جاري المعالجة...
                                    </>
                                ) : (
                                    'استعادة كلمة المرور'
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${result.hasEmail
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-amber-100 dark:bg-amber-900/30'
                                }`}>
                                {result.hasEmail ? (
                                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                ) : (
                                    <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                                )}
                            </div>
                            <p className={`text-sm leading-relaxed ${result.hasEmail
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                {result.message}
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium"
                            >
                                العودة لتسجيل الدخول
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
}