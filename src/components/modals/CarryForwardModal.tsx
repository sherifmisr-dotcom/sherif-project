import { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, addMonths, addYears, startOfMonth, startOfYear } from 'date-fns';
import { ar } from 'date-fns/locale';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface CarryForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { periodType: 'MONTH' | 'YEAR'; newPeriodStartDate: string }) => Promise<void>;
    currentBalance: number;
    title: string;
    accountName?: string;
}

export default function CarryForwardModal({
    isOpen,
    onClose,
    onConfirm,
    currentBalance,
    title,
    accountName,
}: CarryForwardModalProps) {
    const [periodType, setPeriodType] = useState<'MONTH' | 'YEAR'>('MONTH');
    const [loading, setLoading] = useState(false);
    const [customDate, setCustomDate] = useState<string>('');

    // Calculate default date based on period type
    const getDefaultDate = () => {
        const now = new Date();
        if (periodType === 'MONTH') {
            return format(startOfMonth(addMonths(now, 1)), 'yyyy-MM-dd');
        } else {
            return format(startOfYear(addYears(now, 1)), 'yyyy-MM-dd');
        }
    };

    // Initialize custom date when modal opens
    useEffect(() => {
        if (isOpen) {
            setCustomDate(getDefaultDate());
        }
    }, [isOpen]);

    // Update date when period type changes
    const handlePeriodTypeChange = (type: 'MONTH' | 'YEAR') => {
        setPeriodType(type);
        // Update date based on new period type
        const now = new Date();
        const newDate = type === 'MONTH'
            ? format(startOfMonth(addMonths(now, 1)), 'yyyy-MM-dd')
            : format(startOfYear(addYears(now, 1)), 'yyyy-MM-dd');
        setCustomDate(newDate);
    };

    if (!isOpen) return null;

    // Check if selected date is mid-period
    const isMidPeriod = () => {
        if (!customDate) return false;
        const selected = new Date(customDate);
        const now = new Date();

        if (periodType === 'MONTH') {
            // Check if we're still in current month
            return selected.getMonth() === now.getMonth() &&
                selected.getFullYear() === now.getFullYear();
        } else {
            // Check if we're still in current year
            return selected.getFullYear() === now.getFullYear();
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm({
                periodType,
                newPeriodStartDate: customDate
            });
            onClose();
        } catch (error) {
            console.error('Error carrying forward balance:', error);
        } finally {
            setLoading(false);
        }
    };


    const getCurrentPeriodName = () => {
        const now = new Date();
        if (periodType === 'MONTH') {
            return format(now, 'MMMM yyyy', { locale: ar });
        } else {
            return now.getFullYear().toString();
        }
    };

    if (!isOpen) return null;

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{title}</h2>
                                {accountName && (
                                    <p className="text-blue-100 text-sm mt-1">{accountName}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Main Warning */}
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800 dark:text-red-200">
                                <p className="font-bold text-base mb-2">⚠️ تحذير مهم جداً</p>
                                <ul className="list-disc list-inside space-y-1.5">
                                    <li><strong>لا يمكن التراجع</strong> عن هذه العملية بعد التنفيذ</li>
                                    <li><strong>يُنصح بشدة</strong> بأخذ نسخة احتياطية قبل المتابعة</li>
                                    <li><strong>يمكن الترحيل مرة واحدة فقط</strong> في الشهر الواحد</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Early Month Warning */}
                    {new Date().getDate() < 25 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-800 dark:text-orange-200">
                                    <p className="font-bold mb-1">⚠️ تنبيه: الترحيل قبل نهاية الشهر</p>
                                    <p>
                                        أنت الآن في يوم <strong>{new Date().getDate()}</strong> من الشهر.
                                        يُنصح بالانتظار حتى نهاية الشهر (بعد يوم 25) لضمان إتمام جميع العمليات المالية.
                                    </p>
                                    <p className="mt-2 font-semibold">
                                        هل أنت متأكد من إتمام جميع العمليات المالية لهذا الشهر؟
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Period Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            نوع الفترة
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handlePeriodTypeChange('MONTH')}
                                className={`p-3 rounded-xl border-2 transition-all ${periodType === 'MONTH'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <Calendar className="w-4 h-4 mx-auto mb-1" />
                                <div className="font-semibold text-sm">شهر جديد</div>
                            </button>
                            <button
                                onClick={() => handlePeriodTypeChange('YEAR')}
                                className={`p-3 rounded-xl border-2 transition-all ${periodType === 'YEAR'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <Calendar className="w-4 h-4 mx-auto mb-1" />
                                <div className="font-semibold text-sm">سنة جديدة</div>
                            </button>
                        </div>

                        {/* Period Type Info */}
                        <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                            <div className="flex gap-2">
                                <div className="text-xs text-blue-800 dark:text-blue-200">
                                    {periodType === 'MONTH' ? (
                                        <>
                                            <span className="font-semibold">💡 ملاحظة:</span> يُنصح بالترحيل الشهري في بداية كل شهر ميلادي جديد (اليوم الأول من الشهر) لضمان دقة الحسابات.
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-semibold">💡 ملاحظة:</span> يُنصح بالترحيل السنوي في بداية كل سنة ميلادية جديدة (1 يناير) لضمان دقة الحسابات السنوية.
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            تاريخ بداية الفترة الجديدة
                        </label>
                        <input
                            type="date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            التاريخ الافتراضي: {format(new Date(getDefaultDate()), 'dd/MM/yyyy', { locale: ar })}
                        </p>
                    </div>

                    {/* Mid-Period Warning */}
                    {isMidPeriod() && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
                            <div className="flex gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-orange-800 dark:text-orange-200">
                                    <p className="font-semibold mb-1">تنبيه</p>
                                    <p>
                                        {periodType === 'MONTH'
                                            ? 'الشهر الحالي لم ينتهِ بعد. سيتم الترحيل من التاريخ المحدد.'
                                            : 'السنة الحالية لم تنتهِ بعد. سيتم الترحيل من التاريخ المحدد.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">الرصيد الحالي:</span>
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                {currentBalance.toLocaleString('en-US')} ريال
                            </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-600 dark:text-gray-400">من:</span>
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">{getCurrentPeriodName()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">إلى:</span>
                                <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                                    {customDate ? format(new Date(customDate), 'dd MMMM yyyy', { locale: ar }) : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">الرصيد الافتتاحي الجديد:</span>
                                <span className="text-base font-bold text-green-600 dark:text-green-400">
                                    {currentBalance.toLocaleString('en-US')} ريال
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed at bottom */}
                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex gap-2 flex-shrink-0 border-t border-gray-200 dark:border-gray-600">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || !customDate}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 text-sm"
                    >
                        {loading ? 'جاري الترحيل...' : 'تأكيد الترحيل'}
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
}