import { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface ResetSystemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ResetSystemModal({ isOpen, onClose }: ResetSystemModalProps) {
    const [step, setStep] = useState(1);
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);


    const handleReset = async () => {
        if (confirmText !== 'حذف البيانات') {
            showError('يرجى كتابة النص بشكل صحيح');
            return;
        }

        setLoading(true);
        try {
            await apiClient.resetSystem();
            showSuccess('تم إعادة تعيين النظام بنجاح');
            onClose();
            // Reload page after 1 second
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            showError(error.response?.data?.message || 'حدث خطأ أثناء إعادة تعيين النظام');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setConfirmText('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all duration-300 scale-100">

                {/* Header */}
                <div className="relative bg-red-50 dark:bg-red-950/30 p-6 text-center border-b border-red-100 dark:border-red-900/50">
                    <button
                        onClick={handleClose}
                        className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-500" />
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {step === 1 ? 'إعادة تعيين النظام' : 'تأكيد نهائي'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {step === 1 ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه' : 'أنت على وشك حذف جميع البيانات نهائياً'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-xl p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-1">
                                            سيتم حذف البيانات التالية:
                                        </h3>
                                        <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
                                            جميع الفواتير، السندات، العملاء، الموظفين، الحسابات، والمصروفات. سيعود النظام لحالته الأولية تماماً كما كان عند التثبيت.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">يتم الاحتفاظ بحساب المسؤول (Admin)</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">يتم الاحتفاظ بالإعدادات الأساسية</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm shadow-red-200 dark:shadow-none"
                                >
                                    متابعة الحذف
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    للتأكيد، اكتب "<span className="text-red-600 font-bold">حذف البيانات</span>"
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="حذف البيانات"
                                    className="w-full text-center px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-red-500 focus:ring-0 text-lg font-medium dark:bg-gray-700 dark:text-white transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                    disabled={loading}
                                >
                                    تراجع
                                </button>
                                <button
                                    onClick={handleReset}
                                    disabled={confirmText !== 'حذف البيانات' || loading}
                                    className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>جاري الحذف...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            <span>تأكيد الحذف النهائي</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
}
