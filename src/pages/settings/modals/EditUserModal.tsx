import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface User {
    id: string;
    username: string;
    fullName?: string;
    email?: string;
    isAdmin: boolean;
    isActive: boolean;
}

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
    const [formData, setFormData] = useState({
        username: user.username,
        fullName: user.fullName || '',
        email: user.email || '',
        isAdmin: user.isAdmin,
        isActive: user.isActive,
    });
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

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

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData({ ...formData, email: value });
        validateEmail(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail(formData.email)) {
            return;
        }

        try {
            setLoading(true);
            await apiClient.updateUser(user.id, {
                username: formData.username,
                fullName: formData.fullName || undefined,
                email: formData.email || undefined,
                isAdmin: formData.isAdmin,
                isActive: formData.isActive,
            });
            showSuccess('تم تحديث بيانات المستخدم بنجاح');
            onSuccess();
        } catch (error: any) {
            const message = error.response?.data?.message || 'حدث خطأ أثناء تحديث المستخدم';
            if (message.includes('own') || message.includes('نفسك')) {
                showError('لا يمكنك تعديل صلاحيتك الخاصة');
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
    const disabledInputClass = "w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed";

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        تعديل المستخدم
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
                                اسم المستخدم
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                disabled
                                className={disabledInputClass}
                                dir="ltr"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                لا يمكن تغيير اسم المستخدم
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
                                placeholder="الاسم الكامل"
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
                            يُستخدم لاستعادة كلمة المرور
                        </p>
                    </div>

                    {/* Row 3: Admin and Active Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 h-[52px]">
                            <input
                                type="checkbox"
                                id="isAdmin"
                                checked={formData.isAdmin}
                                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isAdmin" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none flex-1">
                                مدير النظام (صلاحيات كاملة)
                            </label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 h-[52px]">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none flex-1">
                                حساب نشط
                            </label>
                        </div>
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
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <span>حفظ التغييرات</span>
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
