import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Save, Trash2, History, Ship, AlertTriangle } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SettingLog {
    id: string;
    freight: string | number;
    portFees: string | number;
    transitPortFees: string | number;
    isCurrent: boolean;
    createdAt: string;
}

export default function AgentSettings() {
    const [freight, setFreight] = useState<string>('0');
    const [portFees, setPortFees] = useState<string>('0');
    const [transitPortFees, setTransitPortFees] = useState<string>('0');
    const [logs, setLogs] = useState<SettingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [settings, logsData] = await Promise.all([
                apiClient.getAgentSettings(),
                apiClient.getAgentSettingsLogs(),
            ]);
            setFreight(String(settings.defaultFreightPerTruck || 0));
            setPortFees(String(settings.defaultPortFeesPerTruck || 0));
            setTransitPortFees(String(settings.defaultTransitPortFees || 0));
            setLogs(logsData || []);
        } catch (error) {
            console.error('Error loading agent settings:', error);
            showError('حدث خطأ أثناء تحميل الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const freightVal = parseFloat(freight) || 0;
        const portFeesVal = parseFloat(portFees) || 0;
        const transitPortFeesVal = parseFloat(transitPortFees) || 0;

        if (freightVal < 0 || portFeesVal < 0 || transitPortFeesVal < 0) {
            showError('القيم يجب أن تكون أكبر من أو تساوي صفر');
            return;
        }

        try {
            setSaving(true);
            await apiClient.updateAgentSettings({
                defaultFreightPerTruck: freightVal,
                defaultPortFeesPerTruck: portFeesVal,
                defaultTransitPortFees: transitPortFeesVal,
            });
            showSuccess('تم تحديث الإعدادات بنجاح');
            await loadData();
        } catch (error) {
            console.error('Error saving settings:', error);
            showError('حدث خطأ أثناء حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLog = async (id: string) => {
        try {
            await apiClient.deleteAgentSettingLog(id);
            showSuccess('تم حذف السجل بنجاح');
            await loadData();
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'حدث خطأ أثناء حذف السجل';
            showError(msg);
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
                    إعدادات الوكلاء الملاحيين
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    إدارة القيم الافتراضية للنولون وأجور الموانئ
                </p>
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="space-y-6">
                    {/* Fields */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Ship className="w-5 h-5 text-blue-600" />
                            القيم الافتراضية للنولون وأجور الموانئ
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    أجور الدخول (للشاحنة الواحدة)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={portFees}
                                        onChange={(e) => setPortFees(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="0"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                                        ريال
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    أجور الترانزيت (للشاحنة الواحدة)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={transitPortFees}
                                        onChange={(e) => setTransitPortFees(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="0"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                                        ريال
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    النولون (للشاحنة الواحدة)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={freight}
                                        onChange={(e) => setFreight(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="0"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                                        ريال
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning Note */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                                    ملاحظة مهمة:
                                </h4>
                                <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                                    <li>هذه القيم للرحلات الجديدة فقط</li>
                                    <li>الرحلات القديمة لن تتأثر</li>
                                    <li>كل رحلة تحفظ بالقيم وقت إنشائها</li>
                                </ul>
                            </div>
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

            {/* Change Log */}
            {logs.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        📊 سجل التغييرات
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-indigo-600 text-white">
                                    <th className="px-4 py-3 text-right font-semibold rounded-tr-lg">التاريخ</th>
                                    <th className="px-4 py-3 text-right font-semibold">أجور الدخول</th>
                                    <th className="px-4 py-3 text-right font-semibold">أجور الترانزيت</th>
                                    <th className="px-4 py-3 text-right font-semibold">النولون</th>
                                    <th className="px-4 py-3 text-center font-semibold">الحالة</th>
                                    <th className="px-4 py-3 text-center font-semibold rounded-tl-lg">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                            {format(new Date(log.createdAt), 'dd/MM/yyyy', { locale: ar })}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                            {parseFloat(String(log.portFees)).toLocaleString()} ريال
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                            {parseFloat(String(log.transitPortFees || 0)).toLocaleString()} ريال
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                            {parseFloat(String(log.freight)).toLocaleString()} ريال
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {log.isCurrent ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    حالي
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    قديم
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {!log.isCurrent && (
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="حذف السجل"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
