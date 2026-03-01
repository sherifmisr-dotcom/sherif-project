import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { CheckCircle, XCircle, Save } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';

export default function TreasurySettings() {
    const [preventNegative, setPreventNegative] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await apiClient.getTreasuryBalance();
            if (data) {
                setPreventNegative(data.preventNegativeTreasury || data.prevent_negative || false);
            }
        } catch (error) {
            console.error('Error loading treasury settings:', error);
            showError('حدث خطأ أثناء تحميل الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiClient.updateTreasurySettings({
                preventNegativeTreasury: preventNegative,
            });
            showSuccess('تم تحديث إعدادات الخزنة بنجاح');
            loadSettings();
        } catch (error) {
            console.error('Error updating settings:', error);
            showError('حدث خطأ أثناء تحديث الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    إعدادات الخزنة
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    إدارة إعدادات الخزنة والتحكم في السلوك المالي
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="space-y-6">
                    {/* Current Status */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            {preventNegative ? (
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            )}
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    الحالة الحالية
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {preventNegative
                                        ? 'منع الرصيد السالب مفعّل - لا يمكن إجراء عمليات تؤدي لرصيد سالب'
                                        : 'منع الرصيد السالب معطّل - يمكن إجراء عمليات تؤدي لرصيد سالب'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            إعدادات الخزنة
                        </h3>

                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preventNegative}
                                    onChange={(e) => setPreventNegative(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <span className="font-medium text-gray-900 dark:text-white block mb-1">
                                        منع الرصيد السالب
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        عند التفعيل، لن يتمكن النظام من إجراء أي عملية صرف تؤدي إلى رصيد سالب في الخزنة.
                                        هذا يساعد في منع الأخطاء المالية والحفاظ على دقة الحسابات.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
