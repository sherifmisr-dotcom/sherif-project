import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Search, Printer, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { showWarning, showError } from '@/lib/toast';

interface DirectCostItem {
    description: string;
    amount: number;
    percentage: number;
}

interface OperatingExpenseItem {
    category: string;
    amount: number;
    percentage: number;
}

interface IncomeStatementData {
    period: { from: Date; to: Date };
    current: {
        revenue: {
            clearanceFees: number;
            customsFeesCollected: number;
            freightCollected: number;
            portChargesCollected: number;
            loadingUnloadingCollected: number;
            vatCollected: number;
            otherRevenue: number;
            total: number;
        };
        directCosts: {
            total: number;
            breakdown: DirectCostItem[];
        };
        grossProfit: {
            amount: number;
            margin: number;
        };
        operatingExpenses: {
            total: number;
            breakdown: OperatingExpenseItem[];
        };
        operatingProfit: {
            amount: number;
            margin: number;
        };
        netIncome: {
            amount: number;
            margin: number;
        };
    };
    previous: {
        revenue: number;
        grossProfit: number;
        operatingProfit: number;
        netIncome: number;
    };
    comparison: {
        revenueChange: number;
        grossProfitChange: number;
        operatingProfitChange: number;
        netIncomeChange: number;
    };
}

export default function IncomeStatement() {
    const getLocalDate = (date: Date) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return getLocalDate(firstDay);
    });
    const [endDate, setEndDate] = useState(() => {
        return getLocalDate(new Date());
    });
    const [data, setData] = useState<IncomeStatementData | null>(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        if (!startDate || !endDate) {
            showWarning('يجب تحديد تاريخ البداية والنهاية');
            return;
        }
        if (startDate > endDate) {
            showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
            return;
        }

        setLoading(true);
        try {
            const params = { from: startDate, to: endDate };
            const response = await apiClient.getIncomeStatement(params);
            setData(response);
        } catch (error) {
            console.error('Error generating income statement:', error);
            showError('حدث خطأ أثناء إنشاء قائمة الدخل');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const renderChangeIndicator = (change: number) => {
        if (change === 0) return null;
        const isPositive = change > 0;
        return (
            <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(change).toFixed(1)}%
            </span>
        );
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    قائمة الدخل
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            من تاريخ
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            إلى تاريخ
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={generateReport}
                            disabled={loading}
                            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                        >
                            <Search className="w-5 h-5" />
                            {loading ? 'جاري الإنشاء...' : 'إنشاء القائمة'}
                        </button>
                    </div>
                </div>

                {data && (
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Printer className="w-5 h-5" />
                            طباعة
                        </button>
                    </div>
                )}
            </div>

            {/* Income Statement */}
            {data && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                        <h2 className="text-2xl font-bold text-center">
                            قائمة الدخل
                        </h2>
                        <p className="text-center text-blue-100 mt-2">
                            من {format(new Date(data.period.from), 'dd/MM/yyyy')} إلى {format(new Date(data.period.to), 'dd/MM/yyyy')}
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Key Metrics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm opacity-90">الإيرادات</span>
                                    <DollarSign className="w-5 h-5 opacity-75" />
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(data.current.revenue.total)}</p>
                                {renderChangeIndicator(data.comparison.revenueChange)}
                            </div>

                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm opacity-90">مجمل الربح</span>
                                    <Percent className="w-5 h-5 opacity-75" />
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(data.current.grossProfit.amount)}</p>
                                <p className="text-xs opacity-75">{data.current.grossProfit.margin.toFixed(1)}%</p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm opacity-90">الربح التشغيلي</span>
                                    <TrendingUp className="w-5 h-5 opacity-75" />
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(data.current.operatingProfit.amount)}</p>
                                <p className="text-xs opacity-75">{data.current.operatingProfit.margin.toFixed(1)}%</p>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm opacity-90">صافي الدخل</span>
                                    <DollarSign className="w-5 h-5 opacity-75" />
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(data.current.netIncome.amount)}</p>
                                <p className="text-xs opacity-75">{data.current.netIncome.margin.toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* 1. Revenue Section */}
                        <div>
                            <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-green-600">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">الإيرادات (المحصّلة)</h3>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-700 dark:text-gray-300">أجور التخليص الجمركي</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.current.revenue.clearanceFees)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-700 dark:text-gray-300">رسوم جمركية محصلة</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.current.revenue.customsFeesCollected)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-700 dark:text-gray-300">نولون محصل</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.current.revenue.freightCollected)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-700 dark:text-gray-300">أجور موانئ محصلة</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.current.revenue.portChargesCollected)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-700 dark:text-gray-300">رسوم تحميل وتنزيل محصلة</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.current.revenue.loadingUnloadingCollected)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-gray-700 dark:text-gray-300">ضريبة القيمة المضافة المحصلة (15%)</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.current.revenue.vatCollected)}
                                    </span>
                                </div>
                                {data.current.revenue.otherRevenue > 0 && (
                                    <div className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <span className="text-gray-700 dark:text-gray-300">إيرادات أخرى</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(data.current.revenue.otherRevenue)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center mt-2 py-3 px-4 bg-green-50 dark:bg-green-900/20 rounded-lg font-bold">
                                <div className="flex items-center gap-3">
                                    <span className="text-green-900 dark:text-green-100">إجمالي الإيرادات</span>
                                    {renderChangeIndicator(data.comparison.revenueChange)}
                                </div>
                                <span className="text-green-900 dark:text-green-100 text-lg">
                                    {formatCurrency(data.current.revenue.total)}
                                </span>
                            </div>
                        </div>

                        {/* 2. Direct Costs Section */}
                        <div>
                            <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-orange-600">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">التكاليف المباشرة</h3>
                            </div>
                            <div className="space-y-2">
                                {data.current.directCosts.breakdown.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-500">
                                                {item.percentage.toFixed(1)}%
                                            </span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(item.amount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-2 py-3 px-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg font-bold">
                                <span className="text-orange-900 dark:text-orange-100">إجمالي التكاليف المباشرة</span>
                                <span className="text-orange-900 dark:text-orange-100 text-lg">
                                    ({formatCurrency(data.current.directCosts.total)})
                                </span>
                            </div>
                        </div>

                        {/* 3. Gross Profit */}
                        <div className="py-4 px-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                                        مجمل الربح
                                    </h3>
                                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                                        {data.current.grossProfit.margin.toFixed(1)}%
                                    </span>
                                    {renderChangeIndicator(data.comparison.grossProfitChange)}
                                </div>
                                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                    {formatCurrency(data.current.grossProfit.amount)}
                                </span>
                            </div>
                        </div>

                        {/* 4. Operating Expenses */}
                        <div>
                            <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-red-600">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">المصروفات التشغيلية</h3>
                            </div>
                            <div className="space-y-2">
                                {data.current.operatingExpenses.breakdown.map((expense, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <span className="text-gray-700 dark:text-gray-300">{expense.category}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-500">
                                                {expense.percentage.toFixed(1)}%
                                            </span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(expense.amount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-2 py-3 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg font-bold">
                                <span className="text-red-900 dark:text-red-100">إجمالي المصروفات التشغيلية</span>
                                <span className="text-red-900 dark:text-red-100 text-lg">
                                    ({formatCurrency(data.current.operatingExpenses.total)})
                                </span>
                            </div>
                        </div>

                        {/* 5. Operating Profit */}
                        <div className="py-4 px-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">
                                        الربح التشغيلي
                                    </h3>
                                    <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold">
                                        {data.current.operatingProfit.margin.toFixed(1)}%
                                    </span>
                                    {renderChangeIndicator(data.comparison.operatingProfitChange)}
                                </div>
                                <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                    {formatCurrency(data.current.operatingProfit.amount)}
                                </span>
                            </div>
                        </div>

                        {/* 6. Net Income */}
                        <div className="py-5 px-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-bold text-white">
                                        صافي الدخل
                                    </h3>
                                    <span className="px-3 py-1 bg-white/30 text-white rounded-full text-sm font-semibold">
                                        {data.current.netIncome.margin.toFixed(1)}%
                                    </span>
                                    <div className="text-white">
                                        {renderChangeIndicator(data.comparison.netIncomeChange)}
                                    </div>
                                </div>
                                <span className="text-3xl font-bold text-white">
                                    {formatCurrency(data.current.netIncome.amount)}
                                </span>
                            </div>
                        </div>

                        {/* Previous Period Comparison */}
                        <div className="mt-6 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                مقارنة مع الفترة السابقة
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-1">الإيرادات</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.previous.revenue)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-1">مجمل الربح</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.previous.grossProfit)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-1">الربح التشغيلي</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.previous.operatingProfit)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-1">صافي الدخل</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(data.previous.netIncome)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!loading && !data && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        اختر الفترة وانقر على "إنشاء القائمة" لعرض قائمة الدخل
                    </p>
                </div>
            )}
        </div>
    );
}
