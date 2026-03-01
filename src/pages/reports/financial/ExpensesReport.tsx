import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, TrendingUp, FileText, Download, Printer } from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { showWarning, showInfo } from '@/lib/toast';
import ExpensesReportPrint from '../../../components/ExpensesReportPrint';
import PageTransition from '@/components/ui/PageTransition';


type ReportTab = 'expenses' | 'revenues';

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
}

interface RevenueItem {
    id: string;
    code: string;
    date: string;
    partyName: string;
    amount: number;
    method: string;
    bankName: string;
    note: string;
}

interface Summary {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    byMethod: Array<{ method: string; amount: number; count: number }>;
    byPartyType: Array<{ type: string; amount: number; count: number }>;
    byCategory?: Array<{ name: string; amount: number; count: number }>;
}

export default function IncomeExpensesReport() {
    const [activeTab, setActiveTab] = useState<ReportTab>('expenses');

    // Expenses
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [expensesSummary, setExpensesSummary] = useState<Summary | null>(null);
    const [expensesLoading, setExpensesLoading] = useState(false);

    // Revenues
    const [revenues, setRevenues] = useState<RevenueItem[]>([]);
    const [revenuesSummary, setRevenuesSummary] = useState<Summary | null>(null);
    const [revenuesLoading, setRevenuesLoading] = useState(false);

    // Filters - Separate for each tab
    const getLocalDate = (date: Date) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    // Expenses Filters
    const [expensesStartDate, setExpensesStartDate] = useState(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return getLocalDate(firstDay);
    });
    const [expensesEndDate, setExpensesEndDate] = useState(() => {
        return getLocalDate(new Date());
    });
    const [expensesCategoryId, setExpensesCategoryId] = useState('');
    const [expensesPartyType, setExpensesPartyType] = useState('');
    const [expensesMethod, setExpensesMethod] = useState('');

    // Revenues Filters
    const [revenuesStartDate, setRevenuesStartDate] = useState(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return getLocalDate(firstDay);
    });
    const [revenuesEndDate, setRevenuesEndDate] = useState(() => {
        return getLocalDate(new Date());
    });
    const [revenuesPartyType, setRevenuesPartyType] = useState('');
    const [revenuesMethod, setRevenuesMethod] = useState('');

    // Chart expansion state
    const [isChartExpanded, setIsChartExpanded] = useState(false);

    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await apiClient.getExpenseCategories();
                setCategories(data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    const fetchExpenses = async () => {
        setExpensesLoading(true);
        try {
            const params: any = {};
            if (expensesStartDate) params.startDate = expensesStartDate;
            if (expensesEndDate) params.endDate = expensesEndDate;
            if (expensesCategoryId) params.categoryId = expensesCategoryId;
            if (expensesPartyType) params.partyType = expensesPartyType;
            if (expensesMethod) params.method = expensesMethod;

            const data = await apiClient.getExpensesReport(params);
            setExpenses(data.expenses);
            setExpensesSummary(data.summary);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setExpensesLoading(false);
        }
    };

    const fetchRevenues = async () => {
        setRevenuesLoading(true);
        try {
            const params: any = {};
            if (revenuesStartDate) params.startDate = revenuesStartDate;
            if (revenuesEndDate) params.endDate = revenuesEndDate;
            // Note: categoryId is NOT sent for revenues (revenues don't have categories)
            if (revenuesPartyType) params.partyType = revenuesPartyType;
            if (revenuesMethod) params.method = revenuesMethod;

            const data = await apiClient.getRevenueReport(params);
            setRevenues(data.revenues);
            setRevenuesSummary(data.summary);
        } catch (error) {
            console.error('Error fetching revenues:', error);
        } finally {
            setRevenuesLoading(false);
        }
    };

    const handleSearch = () => {
        // Validate that both dates are provided based on active tab
        if (activeTab === 'expenses') {
            if (!expensesStartDate || !expensesEndDate) {
                showWarning('يجب تحديد تاريخ البداية والنهاية للفترة المطلوبة');
                return;
            }
            if (expensesStartDate > expensesEndDate) {
                showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
                return;
            }
            fetchExpenses();
        } else {
            if (!revenuesStartDate || !revenuesEndDate) {
                showWarning('يجب تحديد تاريخ البداية والنهاية للفترة المطلوبة');
                return;
            }
            if (revenuesStartDate > revenuesEndDate) {
                showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
                return;
            }
            fetchRevenues();
        }
    };

    const handleReset = () => {
        // Reset to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        if (activeTab === 'expenses') {
            setExpensesStartDate(getLocalDate(firstDay));
            setExpensesEndDate(getLocalDate(new Date()));
            setExpensesCategoryId('');
            setExpensesPartyType('');
            setExpensesMethod('');
            setExpenses([]);
            setExpensesSummary(null);
        } else {
            setRevenuesStartDate(getLocalDate(firstDay));
            setRevenuesEndDate(getLocalDate(new Date()));
            setRevenuesPartyType('');
            setRevenuesMethod('');
            setRevenues([]);
            setRevenuesSummary(null);
        }
    };

    // No longer needed - filters are now separate for each tab

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // Get category color for consistent styling between chart and table
    const getCategoryColor = (categoryName: string) => {
        if (!currentSummary?.byCategory) return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' };

        const index = currentSummary.byCategory.findIndex(cat => cat.name === categoryName);
        if (index === -1) return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' };

        const colors = [
            { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
            { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
            { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
            { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
            { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
            { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
            { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
            { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
        ];

        return colors[index % colors.length];
    };

    const getPaymentMethodLabel = (method: string) => {
        const labels: { [key: string]: string } = {
            'CASH': 'نقدي',
            'BANK_TRANSFER': 'تحويل بنكي',
            'نقدي': 'نقدي',
            'بنكي': 'تحويل بنكي'
        };
        return labels[method] || method;
    };



    const [showPrintModal, setShowPrintModal] = useState(false);

    const currentData = activeTab === 'expenses' ? expenses : revenues;
    const currentSummary = activeTab === 'expenses' ? expensesSummary : revenuesSummary;
    const currentLoading = activeTab === 'expenses' ? expensesLoading : revenuesLoading;

    // Helper to prepare data for print
    const getPrintData = () => {
        return currentData.map(item => ({
            ...item,
            // Ensure data shape matches ReportItem interface if needed
        }));
    };

    return (
        <PageTransition>
            <div id="report-content" className="space-y-6" style={{ minHeight: '800px' }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-between items-center"
                >
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            تقرير الإيرادات والمصروفات
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            عرض تفصيلي للإيرادات والمصروفات مع الإحصائيات
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPrintModal(true)}
                            disabled={currentData.length === 0}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Printer className="w-4 h-4" />
                            طباعة
                        </button>
                        <button
                            onClick={() => showInfo('سيتم إضافة التصدير قريباً')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            تصدير Excel
                        </button>
                    </div>
                </motion.div>

                {/* Print Modal */}
                {showPrintModal && (
                    <ExpensesReportPrint
                        type={activeTab}
                        startDate={activeTab === 'expenses' ? expensesStartDate : revenuesStartDate}
                        endDate={activeTab === 'expenses' ? expensesEndDate : revenuesEndDate}
                        data={getPrintData()}
                        summary={currentSummary}
                        onClose={() => setShowPrintModal(false)}
                    />
                )}

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'expenses'
                                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-900/10'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <TrendingDown className="w-5 h-5" />
                                <span>المصروفات</span>
                                {expensesSummary && (
                                    <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full">
                                        {expensesSummary.totalCount}
                                    </span>
                                )}
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('revenues')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'revenues'
                                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/10'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                <span>الإيرادات</span>
                                {revenuesSummary && (
                                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                                        {revenuesSummary.totalCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="p-6">
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
                                    value={activeTab === 'expenses' ? expensesStartDate : revenuesStartDate}
                                    onChange={(e) => activeTab === 'expenses' ? setExpensesStartDate(e.target.value) : setRevenuesStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    إلى تاريخ
                                </label>
                                <input
                                    type="date"
                                    value={activeTab === 'expenses' ? expensesEndDate : revenuesEndDate}
                                    onChange={(e) => activeTab === 'expenses' ? setExpensesEndDate(e.target.value) : setRevenuesEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            {activeTab === 'expenses' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        الفئة
                                    </label>
                                    <select
                                        value={expensesCategoryId}
                                        onChange={(e) => setExpensesCategoryId(e.target.value)}
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
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    نوع الجهة
                                </label>
                                <select
                                    value={activeTab === 'expenses' ? expensesPartyType : revenuesPartyType}
                                    onChange={(e) => activeTab === 'expenses' ? setExpensesPartyType(e.target.value) : setRevenuesPartyType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">الكل</option>
                                    {activeTab === 'expenses' ? (
                                        <>
                                            <option value="CUSTOMER">عملاء</option>
                                            <option value="EMPLOYEE">موظفين</option>
                                            <option value="AGENT">وكلاء</option>
                                            <option value="CUSTOMS">هيئة الزكاة والضريبة والجمارك</option>
                                            <option value="OTHER">أخرى</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="CUSTOMER">عملاء</option>
                                            <option value="OTHER">أخرى</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    طريقة الدفع
                                </label>
                                <select
                                    value={activeTab === 'expenses' ? expensesMethod : revenuesMethod}
                                    onChange={(e) => activeTab === 'expenses' ? setExpensesMethod(e.target.value) : setRevenuesMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">الكل</option>
                                    <option value="CASH">نقدي</option>
                                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={handleSearch}
                                disabled={currentLoading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                style={{ minWidth: '150px' }}
                            >
                                {currentLoading ? 'جاري التحميل...' : 'بحث'}
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                إعادة تعيين
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Statistics Cards - Always visible to prevent layout shift */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 transition-opacity duration-300" style={{ opacity: currentLoading ? 0.5 : 1 }}
                >
                    <div className={`bg-gradient-to-br ${activeTab === 'expenses' ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} rounded-xl p-4 text-white`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs opacity-90">
                                    {activeTab === 'expenses' ? 'إجمالي المصروفات' : 'إجمالي الإيرادات'}
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {currentSummary ? formatNumber(currentSummary.totalAmount) : '0.00'}
                                </p>
                                <p className="text-xs opacity-75 mt-0.5">ريال سعودي</p>
                            </div>
                            <DollarSign className="w-10 h-10 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs opacity-90">عدد السندات</p>
                                <p className="text-2xl font-bold mt-1">
                                    {currentSummary ? currentSummary.totalCount : '0'}
                                </p>
                                <p className="text-xs opacity-75 mt-0.5">
                                    {activeTab === 'expenses' ? 'سند صرف' : 'سند قبض'}
                                </p>
                            </div>
                            <FileText className="w-10 h-10 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs opacity-90">
                                    {activeTab === 'expenses' ? 'متوسط المصروف' : 'متوسط الإيراد'}
                                </p>
                                <p className="text-2xl font-bold mt-1">
                                    {currentSummary ? formatNumber(currentSummary.averageAmount) : '0.00'}
                                </p>
                                <p className="text-xs opacity-75 mt-0.5">ريال سعودي</p>
                            </div>
                            {activeTab === 'expenses' ? (
                                <TrendingDown className="w-10 h-10 opacity-50" />
                            ) : (
                                <TrendingUp className="w-10 h-10 opacity-50" />
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Toggle button for chart - Only show for expenses */}
                {currentSummary && activeTab === 'expenses' && currentSummary.byCategory && !isChartExpanded && (
                    <div className="mb-6">
                        <button
                            onClick={() => setIsChartExpanded(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-all duration-300 group"
                        >
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                عرض التوزيع حسب الفئة
                            </span>
                        </button>
                    </div>
                )}

                {/* Charts - Only show for expenses (has category) */}
                {currentSummary && activeTab === 'expenses' && currentSummary.byCategory && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-1000 ease-in-out"
                        style={{
                            maxHeight: isChartExpanded ? '1000px' : '0px',
                            opacity: isChartExpanded ? 1 : 0,
                            marginBottom: isChartExpanded ? '24px' : '0px'
                        }}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    التوزيع حسب الفئة
                                </h3>
                                <button
                                    onClick={() => setIsChartExpanded(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                    title="إخفاء"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Stacked Bar */}
                            <div className="mb-6">
                                <div className="flex rounded-lg overflow-hidden h-16 shadow-lg border border-gray-200 dark:border-gray-600">
                                    {currentSummary.byCategory.map((item, index) => {
                                        const percentage = (item.amount / currentSummary.totalAmount) * 100;
                                        const colors = [
                                            { gradient: 'bg-gradient-to-r from-blue-500 to-blue-600', light: 'bg-blue-500' },
                                            { gradient: 'bg-gradient-to-r from-purple-500 to-purple-600', light: 'bg-purple-500' },
                                            { gradient: 'bg-gradient-to-r from-green-500 to-green-600', light: 'bg-green-500' },
                                            { gradient: 'bg-gradient-to-r from-orange-500 to-orange-600', light: 'bg-orange-500' },
                                            { gradient: 'bg-gradient-to-r from-pink-500 to-pink-600', light: 'bg-pink-500' },
                                            { gradient: 'bg-gradient-to-r from-indigo-500 to-indigo-600', light: 'bg-indigo-500' },
                                            { gradient: 'bg-gradient-to-r from-red-500 to-red-600', light: 'bg-red-500' },
                                            { gradient: 'bg-gradient-to-r from-teal-500 to-teal-600', light: 'bg-teal-500' },
                                        ];
                                        const color = colors[index % colors.length];

                                        return (
                                            <div
                                                key={index}
                                                className={`${color.gradient} relative group transition-all duration-300 hover:brightness-110 cursor-pointer`}
                                                style={{ width: `${percentage}%` }}
                                            >
                                                {/* Improved Tooltip on hover - Shows category name */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 backdrop-blur-sm">
                                                    <div className="text-white text-center px-2">
                                                        <div className="text-sm font-bold whitespace-nowrap drop-shadow-lg">{item.name}</div>
                                                        <div className="text-xs font-semibold whitespace-nowrap drop-shadow-lg mt-1">{percentage.toFixed(1)}%</div>
                                                    </div>
                                                </div>

                                                {/* Percentage label for larger segments */}
                                                {percentage > 8 && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
                                                        <span className="text-white text-sm font-bold drop-shadow-lg">
                                                            {percentage.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {currentSummary.byCategory.map((item, index) => {
                                    const percentage = (item.amount / currentSummary.totalAmount) * 100;
                                    const colors = [
                                        'bg-blue-500',
                                        'bg-purple-500',
                                        'bg-green-500',
                                        'bg-orange-500',
                                        'bg-pink-500',
                                        'bg-indigo-500',
                                        'bg-red-500',
                                        'bg-teal-500',
                                    ];
                                    const color = colors[index % colors.length];

                                    return (
                                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                            <div className={`${color} w-4 h-4 rounded-full mt-0.5 flex-shrink-0 shadow-md`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {item.name}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                    {formatNumber(item.amount)} ({percentage.toFixed(1)}%)
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                                    {item.count} سند
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-opacity duration-300" style={{ opacity: currentLoading ? 0.5 : 1 }}
                >
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
                                        {activeTab === 'expenses' ? 'المستفيد' : 'الجهة'}
                                    </th>
                                    {activeTab === 'expenses' && (
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                            الفئة
                                        </th>
                                    )}
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
                                {currentData.map((item: any) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                                            {item.code}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {formatDate(item.date)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {item.partyName}
                                        </td>
                                        {activeTab === 'expenses' && (
                                            <td className="px-4 py-3 text-sm">
                                                {item.categoryName && (() => {
                                                    const colors = getCategoryColor(item.categoryName);
                                                    return (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                            {item.categoryName}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                        <td className={`px-4 py-3 text-sm font-bold font-mono ${activeTab === 'expenses'
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-green-600 dark:text-green-400'
                                            }`}>
                                            {formatNumber(item.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {getPaymentMethodLabel(item.method)}
                                            {(item.method === 'BANK_TRANSFER' || item.method === 'بنكي') && item.bankName && (
                                                <span className="text-xs text-gray-500 block">
                                                    {item.bankName}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {item.note}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {currentData.length === 0 && !currentLoading && (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">
                                {activeTab === 'expenses' ? 'لا توجد مصروفات في الفترة المحددة' : 'لا توجد إيرادات في الفترة المحددة'}
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </PageTransition>
    );
}
