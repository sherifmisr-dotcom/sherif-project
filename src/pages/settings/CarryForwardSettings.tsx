import { useState, useEffect } from 'react';
import { Save, Calendar, Bell, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { showSuccess, showError } from '../../lib/toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CarryForwardSettings {
    id: string;
    autoCarryForwardEnabled: boolean;
    carryForwardDay: number;
    carryForwardType: string;
    notifyBeforeCarryForward: boolean;
    notifyDaysBefore: number;
    lastAutoCarryForward: string | null;
    createdAt: string;
    updatedAt: string;
}

interface CarryForwardLog {
    id: string;
    type: string;
    entityId: string | null;
    executionType: string;
    executedBy: string | null;
    periodType: string;
    fromDate: string;
    toDate: string;
    balanceAmount: number;
    status: string;
    errorMessage: string | null;
    createdAt: string;
}

export default function CarryForwardSettings() {
    const [settings, setSettings] = useState<CarryForwardSettings | null>(null);
    const [logs, setLogs] = useState<CarryForwardLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
        loadLogs();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.getCarryForwardSettings();
            setSettings(data);
        } catch (error: any) {
            showError('فشل تحميل الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async () => {
        try {
            const data = await api.getCarryForwardLogs({ limit: 20 });
            setLogs(data);
        } catch (error: any) {
            console.error('Failed to load logs:', error);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await api.updateCarryForwardSettings({
                autoCarryForwardEnabled: settings.autoCarryForwardEnabled,
                carryForwardDay: settings.carryForwardDay,
                carryForwardType: settings.carryForwardType,
                notifyBeforeCarryForward: settings.notifyBeforeCarryForward,
                notifyDaysBefore: settings.notifyDaysBefore,
            });
            showSuccess('تم حفظ الإعدادات بنجاح');
            loadSettings();
        } catch (error: any) {
            showError(error.response?.data?.message || 'فشل حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">إعدادات الترحيل التلقائي</h1>
                        <p className="text-blue-100 text-sm mt-1">
                            تكوين الترحيل التلقائي للخزنة والحسابات البنكية
                        </p>
                    </div>
                </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.autoCarryForwardEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                            <CheckCircle className={`w-5 h-5 ${settings.autoCarryForwardEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">تفعيل الترحيل التلقائي</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                سيتم ترحيل الأرصدة تلقائياً في التاريخ المحدد
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.autoCarryForwardEnabled}
                            onChange={(e) => setSettings({ ...settings, autoCarryForwardEnabled: e.target.checked })}
                        />
                        <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Period Type */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        نوع الفترة
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setSettings({ ...settings, carryForwardType: 'MONTH' })}
                            className={`p-4 rounded-xl border-2 transition-all ${settings.carryForwardType === 'MONTH'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <Calendar className="w-5 h-5 mx-auto mb-2" />
                            <div className="font-semibold">شهري</div>
                            <div className="text-xs mt-1 opacity-75">ترحيل كل شهر</div>
                        </button>
                        <button
                            onClick={() => setSettings({ ...settings, carryForwardType: 'YEAR' })}
                            className={`p-4 rounded-xl border-2 transition-all ${settings.carryForwardType === 'YEAR'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <Calendar className="w-5 h-5 mx-auto mb-2" />
                            <div className="font-semibold">سنوي</div>
                            <div className="text-xs mt-1 opacity-75">ترحيل كل سنة</div>
                        </button>
                    </div>


                    {/* Info Box */}
                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex gap-2 text-sm text-blue-800 dark:text-blue-200">
                            <span className="font-semibold text-base">💡</span>
                            <div>
                                {settings.carryForwardType === 'MONTH' ? (
                                    <>
                                        <span className="font-semibold">الترحيل الشهري:</span> سيتم ترحيل الأرصدة تلقائياً في يوم <span className="font-bold">{settings.carryForwardDay}</span> من <span className="font-bold underline">كل شهر</span> (يناير، فبراير، مارس... إلخ)
                                    </>
                                ) : (
                                    <>
                                        <span className="font-semibold">الترحيل السنوي:</span> سيتم ترحيل الأرصدة تلقائياً في <span className="font-bold">{settings.carryForwardDay} يناير</span> من <span className="font-bold underline">كل سنة فقط</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Carry Forward Day */}
                <div>
                    <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {settings.carryForwardType === 'MONTH' ? 'يوم الترحيل من الشهر' : 'يوم الترحيل من شهر يناير'}
                    </label>
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={settings.carryForwardDay}
                            onChange={(e) => setSettings({ ...settings, carryForwardDay: parseInt(e.target.value) || 1 })}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            (1-31)
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {settings.carryForwardType === 'MONTH' ? (
                            <>💡 سيتم الترحيل في اليوم <span className="font-semibold">{settings.carryForwardDay}</span> من كل شهر ميلادي</>
                        ) : (
                            <>💡 سيتم الترحيل في <span className="font-semibold">{settings.carryForwardDay} يناير</span> من كل سنة ميلادية</>
                        )}
                    </p>
                </div>

                {/* Notification Settings */}
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">إشعارات الترحيل</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    إرسال تنبيه قبل الترحيل التلقائي
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.notifyBeforeCarryForward}
                                onChange={(e) => setSettings({ ...settings, notifyBeforeCarryForward: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {settings.notifyBeforeCarryForward && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                عدد الأيام قبل الإشعار
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={settings.notifyDaysBefore}
                                onChange={(e) => setSettings({ ...settings, notifyDaysBefore: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    )}
                </div>

                {/* Last Execution Info */}
                {settings.lastAutoCarryForward && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-semibold">آخر ترحيل تلقائي:</span>
                            <span>{format(new Date(settings.lastAutoCarryForward), 'PPP p', { locale: ar })}</span>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    سجل عمليات الترحيل
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">التاريخ</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">النوع</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">الفترة</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">المبلغ</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">طريقة التنفيذ</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        لا توجد عمليات ترحيل مسجلة
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                                            {format(new Date(log.createdAt), 'PPp', { locale: ar })}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                            {log.type === 'TREASURY' ? 'الخزنة' : 'حساب بنكي'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                            {log.periodType === 'MONTH' ? 'شهري' : 'سنوي'}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {log.balanceAmount.toLocaleString('ar-EG')} ر.س
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.executionType === 'AUTO'
                                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                }`}>
                                                {log.executionType === 'AUTO' ? 'تلقائي' : 'يدوي'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            {log.status === 'SUCCESS' ? (
                                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>نجح</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <XCircle className="w-4 h-4" />
                                                    <span>فشل</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
