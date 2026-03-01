import { useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { Search, Printer, Receipt, FileText, DollarSign, Percent, TrendingUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { showWarning, showError } from '@/lib/toast';
import PageTransition from '@/components/ui/PageTransition';
import VatReportPrint from '@/components/VatReportPrint';

interface VatInvoice {
    id: string;
    code: string;
    date: string;
    customerName: string;
    type: string;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
}

interface VatByQuarter {
    key: string;
    year: number;
    quarter: string;
    label: string;
    taxableBase: number;
    vatAmount: number;
    totalWithVat: number;
    count: number;
}

interface VatReportData {
    period: { from: string | null; to: string | null };
    summary: {
        totalTaxableAmount: number;
        totalVatAmount: number;
        totalWithVat: number;
        invoiceCount: number;
    };
    vatByQuarter: VatByQuarter[];
    invoices: VatInvoice[];
}

const QUARTERS = [
    { value: '', label: 'اختر الربع' },
    { value: 'Q1', label: 'الربع الأول (يناير - مارس)' },
    { value: 'Q2', label: 'الربع الثاني (أبريل - يونيو)' },
    { value: 'Q3', label: 'الربع الثالث (يوليو - سبتمبر)' },
    { value: 'Q4', label: 'الربع الرابع (أكتوبر - ديسمبر)' },
];

const TYPE_LABELS: { [key: string]: string } = {
    IMPORT: 'استيراد',
    EXPORT: 'تصدير',
    TRANSIT: 'ترانزيت',
    FREE: 'حرة',
};

export default function VatReport() {
    const currentYear = new Date().getFullYear();

    const getQuarterDates = (quarter: string, year: number) => {
        switch (quarter) {
            case 'Q1': return { from: `${year}-01-01`, to: `${year}-03-31` };
            case 'Q2': return { from: `${year}-04-01`, to: `${year}-06-30` };
            case 'Q3': return { from: `${year}-07-01`, to: `${year}-09-30` };
            case 'Q4': return { from: `${year}-10-01`, to: `${year}-12-31` };
            default: return { from: `${year}-01-01`, to: `${year}-03-31` };
        }
    };

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('');
    const [data, setData] = useState<VatReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
    const [showPrint, setShowPrint] = useState(false);

    const handleQuarterChange = (quarter: string) => {
        setSelectedQuarter(quarter);
        if (quarter) {
            const dates = getQuarterDates(quarter, currentYear);
            setStartDate(dates.from);
            setEndDate(dates.to);
        }
    };

    const generateReport = async () => {
        if (!startDate || !endDate) {
            showWarning('يجب اختيار ربع من السنة او تحديد تاريخ البداية والنهاية');
            return;
        }
        if (startDate > endDate) {
            showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
            return;
        }

        setLoading(true);
        try {
            const params: any = { from: startDate, to: endDate };
            const response = await apiClient.getVatReport(params);
            setData(response);
        } catch (error) {
            console.error('Error generating VAT report:', error);
            showError('حدث خطأ أثناء إنشاء تقرير القيمة المضافة');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ar });
        } catch {
            return dateStr;
        }
    };

    const handlePrint = () => setShowPrint(true);

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header & Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                            <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            تقرير القيمة المضافة
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] items-end gap-3 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الضريبة حسب الربع
                            </label>
                            <select
                                value={selectedQuarter}
                                onChange={(e) => handleQuarterChange(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                            >
                                {QUARTERS.map((q) => (
                                    <option key={q.value} value={q.value}>{q.label}</option>
                                ))}
                            </select>
                        </div>
                        <span className="pb-2 text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                            او قم بتحديد فترة
                        </span>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                من
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setSelectedQuarter(''); }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                إلى
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setSelectedQuarter(''); }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-sm"
                            />
                        </div>
                        <button
                            onClick={generateReport}
                            disabled={loading}
                            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed justify-center whitespace-nowrap"
                        >
                            <Search className="w-5 h-5" />
                            {loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
                        </button>
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
                </motion.div>

                {/* Report Content */}
                {data && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        {/* Report Header */}
                        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold">
                                    إقرار ضريبة القيمة المضافة
                                </h2>
                                <p className="text-teal-100 mt-1 text-sm">
                                    هيئة الزكاة والضريبة والجمارك - المملكة العربية السعودية
                                </p>
                                {data.period.from && data.period.to && (
                                    <p className="text-teal-100 mt-2">
                                        الفترة من {formatDate(data.period.from)} إلى {formatDate(data.period.to)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Summary Cards */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="grid grid-cols-1 md:grid-cols-4 gap-4"
                            >
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm opacity-90">المبيعات الخاضعة</span>
                                        <DollarSign className="w-5 h-5 opacity-75" />
                                    </div>
                                    <p className="text-2xl font-bold">{formatCurrency(data.summary.totalTaxableAmount)}</p>
                                    <p className="text-xs opacity-75 mt-1">المبلغ قبل الضريبة</p>
                                </div>

                                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm opacity-90">ضريبة المخرجات (15%)</span>
                                        <Percent className="w-5 h-5 opacity-75" />
                                    </div>
                                    <p className="text-2xl font-bold">{formatCurrency(data.summary.totalVatAmount)}</p>
                                    <p className="text-xs opacity-75 mt-1">إجمالي الضريبة المحصلة</p>
                                </div>

                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm opacity-90">الإجمالي مع الضريبة</span>
                                        <TrendingUp className="w-5 h-5 opacity-75" />
                                    </div>
                                    <p className="text-2xl font-bold">{formatCurrency(data.summary.totalWithVat)}</p>
                                    <p className="text-xs opacity-75 mt-1">إجمالي المبيعات</p>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm opacity-90">الفواتير الخاضعة</span>
                                        <FileText className="w-5 h-5 opacity-75" />
                                    </div>
                                    <p className="text-2xl font-bold">{data.summary.invoiceCount}</p>
                                    <p className="text-xs opacity-75 mt-1">عدد الفواتير</p>
                                </div>
                            </motion.div>

                            {/* VAT by Quarter */}
                            {data.vatByQuarter && data.vatByQuarter.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.15 }}
                                >
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-emerald-600">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            الإقرار الضريبي الربع سنوي
                                        </h3>
                                        <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">ZATCA</span>
                                    </div>
                                    <div className="overflow-x-auto border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                                                    <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300">الفترة</th>
                                                    <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300">الوعاء الضريبي</th>
                                                    <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300">مبلغ الضريبة</th>
                                                    <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300">الإجمالي مع الضريبة</th>
                                                    <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-800 dark:text-emerald-300">عدد الفواتير</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.vatByQuarter.map((item) => (
                                                    <tr key={item.key} className="border-b border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
                                                        <td className="py-3 px-4">
                                                            <span className="inline-flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                                                                {item.label}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(item.taxableBase)} ر.س</td>
                                                        <td className="py-3 px-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.vatAmount)} ر.س</td>
                                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{formatCurrency(item.totalWithVat)} ر.س</td>
                                                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{item.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-emerald-100 dark:bg-emerald-900/30 font-bold">
                                                    <td className="py-3 px-4 text-sm text-emerald-900 dark:text-emerald-100">الإجمالي السنوي</td>
                                                    <td className="py-3 px-4 text-sm text-emerald-900 dark:text-emerald-100">{formatCurrency(data.summary.totalTaxableAmount)} ر.س</td>
                                                    <td className="py-3 px-4 text-sm text-emerald-900 dark:text-emerald-100">{formatCurrency(data.summary.totalVatAmount)} ر.س</td>
                                                    <td className="py-3 px-4 text-sm text-emerald-900 dark:text-emerald-100">{formatCurrency(data.summary.totalWithVat)} ر.س</td>
                                                    <td className="py-3 px-4 text-sm text-emerald-900 dark:text-emerald-100">{data.summary.invoiceCount}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </motion.div>
                            )}

                            {/* Detailed Invoice List - Collapsible */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                            >
                                <button
                                    onClick={() => setShowInvoiceDetails(!showInvoiceDetails)}
                                    className="w-full flex items-center justify-between gap-2 py-3 px-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                            تفاصيل الفواتير الخاضعة للضريبة
                                        </h3>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                            {data.invoices.length} فاتورة
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                                            {showInvoiceDetails ? 'إخفاء التفاصيل' : 'إظهار التفاصيل'}
                                        </span>
                                        <ChevronDown className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-300 ${showInvoiceDetails ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Collapsible Content */}
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showInvoiceDetails ? 'max-h-[700px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                        {/* Scrollable Table Container - shows ~12 rows then scrolls */}
                                        <div className="overflow-auto max-h-[540px] scrollbar-thin relative">
                                            <table className="w-full">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-gray-50 dark:bg-gray-700/50 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">رقم الفاتورة</th>
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">التاريخ</th>
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">العميل</th>
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">النوع</th>
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">المبلغ قبل الضريبة</th>
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">نسبة الضريبة</th>
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">مبلغ الضريبة</th>
                                                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">الإجمالي</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.invoices.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={8} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                                                لا توجد فواتير خاضعة للضريبة في الفترة المحددة
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        data.invoices.map((inv) => (
                                                            <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                                <td className="py-3 px-4 text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">{inv.code}</td>
                                                                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(inv.date)}</td>
                                                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{inv.customerName}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                                        {TYPE_LABELS[inv.type] || inv.type}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{formatCurrency(inv.subtotal)}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className="text-sm font-medium text-teal-600 dark:text-teal-400">{inv.vatRate}%</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-sm font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(inv.vatAmount)}</td>
                                                                <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Totals Footer - always visible outside scroll */}
                                        {data.invoices.length > 0 && (
                                            <div className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                                                <table className="w-full">
                                                    <tbody>
                                                        <tr className="font-bold">
                                                            <td colSpan={4} className="py-3 px-4 text-sm text-gray-900 dark:text-white">الإجمالي</td>
                                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{formatCurrency(data.summary.totalTaxableAmount)}</td>
                                                            <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">15%</td>
                                                            <td className="py-3 px-4 text-sm text-teal-600 dark:text-teal-400">{formatCurrency(data.summary.totalVatAmount)}</td>
                                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{formatCurrency(data.summary.totalWithVat)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* ZATCA Compliance Note */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.25 }}
                                className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                            >
                                <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-200">
                                    <span className="font-bold text-lg">⚠️</span>
                                    <div>
                                        <p className="font-semibold mb-1">ملاحظة هامة</p>
                                        <p>
                                            هذا التقرير لأغراض محاسبية داخلية ويعرض ضريبة المخرجات (المبيعات) فقط.
                                            يتوافق مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) للمملكة العربية السعودية.
                                            يرجى الرجوع إلى المحاسب المعتمد للإقرار الضريبي النهائي.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !data && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
                        <div className="inline-flex p-4 bg-teal-100 dark:bg-teal-900/30 rounded-full mb-4">
                            <Receipt className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            اختر الفترة وانقر على "إنشاء التقرير" لعرض تقرير القيمة المضافة
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                    </div>
                )}
            </div>

            {/* Print Preview Modal */}
            {showPrint && data && (
                <VatReportPrint data={data} onClose={() => setShowPrint(false)} />
            )}
        </PageTransition>
    );
}
