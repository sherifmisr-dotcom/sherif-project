import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('رابط إعادة التعيين غير صالح. يرجى طلب رابط جديد.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.newPassword.length < 8) {
            setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('كلمات المرور غير متطابقة');
            return;
        }

        try {
            setLoading(true);
            await apiClient.resetPassword({
                token,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword,
            });
            setSuccess(true);
        } catch (err: any) {
            const message = err.response?.data?.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8" dir="rtl">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
                            <KeyRound className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            إعادة تعيين كلمة المرور
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            أدخل كلمة المرور الجديدة
                        </p>
                    </div>

                    {/* Content */}
                    {success ? (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    تم بنجاح!
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full btn-primary justify-center py-3"
                            >
                                <ArrowRight className="w-5 h-5" />
                                الذهاب لتسجيل الدخول
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    كلمة المرور الجديدة
                                </label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.newPassword}
                                        onChange={(e) => {
                                            setFormData({ ...formData, newPassword: e.target.value });
                                            setError('');
                                        }}
                                        className="w-full pr-10 pl-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                                        placeholder="8 أحرف على الأقل"
                                        disabled={!token || loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    تأكيد كلمة المرور
                                </label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => {
                                            setFormData({ ...formData, confirmPassword: e.target.value });
                                            setError('');
                                        }}
                                        className="w-full pr-10 pl-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-colors"
                                        placeholder="أعد إدخال كلمة المرور"
                                        disabled={!token || loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
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
                                disabled={loading || !token || !formData.newPassword || !formData.confirmPassword}
                                className="w-full btn-primary justify-center py-3"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        جاري إعادة التعيين...
                                    </>
                                ) : (
                                    'إعادة تعيين كلمة المرور'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm flex items-center justify-center gap-1"
                            >
                                <ArrowRight className="w-4 h-4" />
                                العودة لتسجيل الدخول
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
