import { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, FileText, Download, Printer } from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { showInfo, showWarning } from '@/lib/toast';

interface ExpenseItem {
    id: string;
    code: string;
    date: string;
    partyName: string;
    categoryName: string;
    amount: number;
    method: string;
    bankName: string;
    note: string;
    createdBy: string;
}

interface ExpensesSummary {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    byCategory: Array<{ name: string; amount: number; count: number }>;
    byMethod: Array<{ method: string; amount: number; count: number }>;
    byPartyType: Array<{ type: string; amount: number; count: number }>;
}

export default function ExpensesReport() {
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [summary, setSummary] = useState<ExpensesSummary | null>(null);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [partyType, setPartyType] = useState('');
    const [method, setMethod] = useState('');

    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        fetchCategories();
        fetchExpenses();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await apiClient.getExpenseCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchExpenses = async () => {
        if (startDate && endDate && startDate > endDate) {
            showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
            return;
        }
        setLoading(true);
        try {
            const params: any = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (categoryId) params.categoryId = categoryId;
            if (partyType) params.partyType = partyType;
            if (method) params.method = method;

            const data = await apiClient.getExpensesReport(params);
            setExpenses(data.expenses);
            setSummary(data.summary);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        // TODO: Implement Excel export
        showInfo('سيتم إضافة التصدير قريباً');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        تقرير المصروفات
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        عرض تفصيلي لجميع المصروفات مع الإحصائيات
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        طباعة
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        تصدير Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    الفلاتر
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            من تاريخ
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            الفئة
                        </label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">الكل</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            نوع الجهة
                        </label>
                        <select
                            value={partyType}
                            onChange={(e) => setPartyType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">الكل</option>
                            <option value="CUSTOMER">عملاء</option>
                            <option value="EMPLOYEE">موظفين</option>
                            <option value="AGENT">وكلاء</option>
                            <option value="OTHER">أخرى</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            طريقة الدفع
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">الكل</option>
                            <option value="CASH">نقدي</option>
                            <option value="BANK_TRANSFER">بنكي</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={fetchExpenses}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'جاري التحميل...' : 'بحث'}
                    </button>
                    <button
                        onClick={() => {
                            setStartDate('');
                            setEndDate('');
                            setCategoryId('');
                            setPartyType('');
                            setMethod('');
                            fetchExpenses();
                        }}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        إعادة تعيين
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">إجمالي المصروفات</p>
                                <p className="text-3xl font-bold mt-2">{formatNumber(summary.totalAmount)}</p>
                                <p className="text-xs opacity-75 mt-1">ريال سعودي</p>
                            </div>
                            <DollarSign className="w-12 h-12 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">عدد السندات</p>
                                <p className="text-3xl font-bold mt-2">{summary.totalCount}</p>
                                <p className="text-xs opacity-75 mt-1">سند صرف</p>
                            </div>
                            <FileText className="w-12 h-12 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">متوسط المصروف</p>
                                <p className="text-3xl font-bold mt-2">{formatNumber(summary.averageAmount)}</p>
                                <p className="text-xs opacity-75 mt-1">ريال سعودي</p>
                            </div>
                            <TrendingDown className="w-12 h-12 opacity-50" />
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            {summary && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* By Category */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            التوزيع حسب الفئة
                        </h3>
                        <div className="space-y-3">
                            {summary.byCategory.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {item.name}
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {formatNumber(item.amount)} ({item.count} سند)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{
                                                    width: `${(item.amount / summary.totalAmount) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* By Method */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            التوزيع حسب طريقة الدفع
                        </h3>
                        <div className="space-y-3">
                            {summary.byMethod.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {item.method}
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {formatNumber(item.amount)} ({item.count} سند)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{
                                                    width: `${(item.amount / summary.totalAmount) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Expenses Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                    رقم السند
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                    التاريخ
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                    المستفيد
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                    الفئة
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                    المبلغ
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                    طريقة الدفع
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                    البيان
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {expenses.map((expense) => (
                                <tr
                                    key={expense.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                                        {expense.code}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {formatDate(expense.date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                        {expense.partyName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                                            {expense.categoryName}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 font-mono">
                                        {formatNumber(expense.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {expense.method}
                                        {expense.method === 'بنكي' && (
                                            <span className="text-xs text-gray-500 block">
                                                {expense.bankName}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {expense.note}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {expenses.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            لا توجد مصروفات في الفترة المحددة
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
