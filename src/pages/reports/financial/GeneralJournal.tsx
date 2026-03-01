import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Search, Printer, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { showError, showWarning } from '@/lib/toast';

interface JournalEntry {
    id: string;
    date: Date;
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    reference: string;
    type: string;
}

interface JournalData {
    period: { from: Date | null; to: Date | null };
    entries: JournalEntry[];
    summary: {
        totalDebits: number;
        totalCredits: number;
        entryCount: number;
    };
}

export default function GeneralJournal() {
    const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState<JournalData | null>(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        if (startDate > endDate) {
            showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
            return;
        }
        setLoading(true);
        try {
            const params = { from: startDate, to: endDate };
            const response = await apiClient.getGeneralJournal(params);
            setData(response);
        } catch (error) {
            console.error('Error generating general journal:', error);
            showError('حدث خطأ أثناء إنشاء اليومية');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        اليومية العامة
                    </h3>
                </div>

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

                    <div className="flex items-end gap-2">
                        <button
                            onClick={generateReport}
                            disabled={loading}
                            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed flex-1 justify-center"
                        >
                            <Search className="w-5 h-5" />
                            {loading ? 'جاري الإنشاء...' : 'إنشاء اليومية'}
                        </button>
                        {data && (
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Journal Table */}
            {data && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-6">
                        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 text-center">
                            اليومية العامة
                        </h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
                            من {format(new Date(startDate), 'dd/MM/yyyy')} إلى {format(new Date(endDate), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                            عدد القيود: {data.summary.entryCount}
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        التاريخ
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        البيان
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        من حـ/ (المدين)
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        إلى حـ/ (الدائن)
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        المبلغ
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        المرجع
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {data.entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            لا توجد قيود محاسبية في هذه الفترة
                                        </td>
                                    </tr>
                                ) : (
                                    data.entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                                {format(new Date(entry.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {entry.description}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {entry.debitAccount}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {entry.creditAccount}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                                {formatCurrency(entry.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {entry.reference}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {data.entries.length > 0 && (
                                <tfoot className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-600">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-sm font-bold text-blue-900 dark:text-blue-100 text-right">
                                            الإجمالي
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-blue-900 dark:text-blue-100 whitespace-nowrap">
                                            {formatCurrency(data.summary.totalDebits)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {!loading && !data && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                        اختر الفترة وانقر على "إنشاء اليومية" لعرض القيود المحاسبية
                    </p>
                </div>
            )}
        </div>
    );
}
