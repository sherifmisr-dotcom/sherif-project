import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { X, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';


interface AddUserModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        isAdmin: false,
    });
    const [loading, setLoading] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validateUsername = (username: string): boolean => {
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;

        if (!username) {
            setUsernameError('');
            return true;
        }

        if (!usernameRegex.test(username)) {
            setUsernameError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط');
            return false;
        }

        if (username.length < 3) {
            setUsernameError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
            return false;
        }

        setUsernameError('');
        return true;
    };

    const validateEmail = (email: string): boolean => {
        if (!email) {
            setEmailError('');
            return true;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('البريد الإلكتروني غير صحيح');
            return false;
        }

        setEmailError('');
        return true;
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData({ ...formData, username: value });
        validateUsername(value);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData({ ...formData, email: value });
        validateEmail(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateUsername(formData.username)) {
            return;
        }

        if (!validateEmail(formData.email)) {
            return;
        }

        if (formData.password.length < 8) {
            showError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            showError('كلمات المرور غير متطابقة');
            return;
        }

        try {
            setLoading(true);
            await apiClient.createUser({
                username: formData.username,
                fullName: formData.fullName || undefined,
                email: formData.email || undefined,
                password: formData.password,
                isAdmin: formData.isAdmin,
            });
            showSuccess('تم إضافة المستخدم بنجاح');
            onSuccess();
        } catch (error: any) {
            const message = error.response?.data?.message || 'حدث خطأ أثناء إضافة المستخدم';
            if (message.includes('already exists') || message.includes('موجود')) {
                showError('اسم المستخدم موجود مسبقاً');
            } else if (message.includes('البريد الإلكتروني مستخدم')) {
                showError('البريد الإلكتروني مستخدم بالفعل');
            } else {
                showError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500";
    const inputErrorClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-red-500 dark:border-red-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500";

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        إضافة مستخدم جديد
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Row 1: Username and Full Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                اسم المستخدم <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleUsernameChange}
                                className={usernameError ? inputErrorClass : inputClass}
                                placeholder="اسم المستخدم"
                                dir="ltr"
                            />
                            {usernameError && (
                                <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-xs">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>{usernameError}</span>
                                </div>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                أحرف إنجليزية وأرقام فقط (a-z, 0-9, _, -)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                الاسم الكامل
                            </label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className={inputClass}
                                placeholder="الاسم الكامل (اختياري)"
                            />
                        </div>
                    </div>

                    {/* Row 2: Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            البريد الإلكتروني
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={handleEmailChange}
                            className={emailError ? inputErrorClass : inputClass}
                            placeholder="example@email.com"
                            dir="ltr"
                        />
                        {emailError && (
                            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-xs">
                                <AlertCircle className="w-3 h-3" />
                                <span>{emailError}</span>
                            </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            يُستخدم لاستعادة كلمة المرور (اختياري)
                        </p>
                    </div>

                    {/* Row 3: Password and Confirm Password */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                كلمة المرور <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={inputClass + ' pl-10'}
                                    placeholder="8 أحرف على الأقل"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                تأكيد كلمة المرور <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className={inputClass + ' pl-10'}
                                    placeholder="أعد إدخال كلمة المرور"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Admin Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                        <input
                            type="checkbox"
                            id="isAdmin"
                            checked={formData.isAdmin}
                            onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isAdmin" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            مدير النظام (صلاحيات كاملة)
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري الإضافة...</span>
                                </>
                            ) : (
                                <span>إضافة</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
}
