import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Search, Printer, Scale, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { showError } from '@/lib/toast';

interface Account {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    balance: number;
    balanceType: 'debit' | 'credit';
}

interface TrialBalanceData {
    asOfDate: Date;
    accounts: Account[];
    totals: {
        totalDebits: number;
        totalCredits: number;
        isBalanced: boolean;
        difference: number;
    };
}

export default function TrialBalance() {
    const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState<TrialBalanceData | null>(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        setLoading(true);
        try {
            const params = { asOf: asOfDate };
            const response = await apiClient.getTrialBalance(params);
            setData(response);
        } catch (error) {
            console.error('Error generating trial balance:', error);
            showError('حدث خطأ أثناء إنشاء ميزان المراجعة');
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
                    <Scale className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        ميزان المراجعة
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            كما في تاريخ
                        </label>
                        <input
                            type="date"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            onClick={generateReport}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 justify-center"
                        >
                            <Search className="w-5 h-5" />
                            {loading ? 'جاري الإنشاء...' : 'إنشاء الميزان'}
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

            {/* Trial Balance Table */}
            {data && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 p-6">
                        <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100 text-center">
                            ميزان المراجعة
                        </h2>
                        <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
                            كما في {format(new Date(asOfDate), 'dd/MM/yyyy')}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                            {data.totals.isBalanced ? (
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">الميزان متوازن</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                    <XCircle className="w-5 h-5" />
                                    <span className="font-semibold">
                                        الميزان غير متوازن (فرق: {formatCurrency(data.totals.difference)})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        الحساب
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        مدين
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        دائن
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        الرصيد
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {data.accounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            لا توجد حسابات
                                        </td>
                                    </tr>
                                ) : (
                                    data.accounts.map((account, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {account.accountName}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                {account.debit > 0 ? formatCurrency(account.debit) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                {account.credit > 0 ? formatCurrency(account.credit) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">
                                                <span className={account.balanceType === 'debit' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                                                    {formatCurrency(account.balance)} {account.balanceType === 'debit' ? 'مدين' : 'دائن'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {data.accounts.length > 0 && (
                                <tfoot className="bg-purple-50 dark:bg-purple-900/20 border-t-2 border-purple-600">
                                    <tr>
                                        <td className="px-4 py-3 text-sm font-bold text-purple-900 dark:text-purple-100 text-right">
                                            الإجمالي
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-purple-900 dark:text-purple-100 whitespace-nowrap">
                                            {formatCurrency(data.totals.totalDebits)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-purple-900 dark:text-purple-100 whitespace-nowrap">
                                            {formatCurrency(data.totals.totalCredits)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-purple-900 dark:text-purple-100">
                                            {data.totals.isBalanced ? (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    متوازن
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <XCircle className="w-4 h-4" />
                                                    غير متوازن
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {!loading && !data && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
                    <Scale className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                        اختر التاريخ وانقر على "إنشاء الميزان" لعرض ميزان المراجعة
                    </p>
                </div>
            )}
        </div>
    );
}
