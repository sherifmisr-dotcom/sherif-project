import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Search, Printer, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import TreasuryReportPrint from '@/components/TreasuryReportPrint';
import { showError, showInfo, showWarning } from '@/lib/toast';

interface TreasuryTransaction {
  id: string;
  type: string;
  amount: number;
  note: string;
  balance_after: number;
  balanceAfter?: number;
  created_at: string;
  voucher_id: string | null;
  voucher?: {
    code: string;
    type?: string;
    partyName?: string;
    note?: string;
  };
}

export default function TreasuryReport() {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [openingBalanceDesc, setOpeningBalanceDesc] = useState('رصيد أول المدة');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const generateReport = async () => {
    if (startDate > endDate) {
      showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
      return;
    }
    setLoading(true);
    try {
      const params = {
        from: startDate,
        to: endDate,
      };

      const reportData = await apiClient.getTreasuryReport(params);

      setOpeningBalance(reportData.openingBalance || 0);
      setOpeningBalanceDesc(reportData.openingBalanceDescription || 'رصيد أول المدة');

      // Transform the data to match expected field names
      const transformedTransactions = (reportData.transactions || []).map((tx: any) => ({
        ...tx,
        created_at: tx.date || tx.created_at,
        balance_after: parseFloat(String(tx.balanceAfter || tx.balance_after || 0)),
        balanceAfter: parseFloat(String(tx.balanceAfter || tx.balance_after || 0)),
      }));

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error generating report:', error);
      showError('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const handleExportPDF = () => {
    showInfo('تصدير PDF قيد التطوير');
  };

  const totalDebit = transactions
    .filter(tx => tx.type.toUpperCase() === 'IN')
    .reduce((sum, tx) => sum + parseFloat(String(tx.amount)), 0);

  const totalCredit = transactions
    .filter(tx => tx.type.toUpperCase() === 'OUT')
    .reduce((sum, tx) => sum + parseFloat(String(tx.amount)), 0);

  const closingBalance = openingBalance + totalDebit - totalCredit;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          تقرير حركة الخزنة
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
              {loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
            </button>
          </div>
        </div>

        {transactions.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-5 h-5" />
              طباعة
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileDown className="w-5 h-5" />
              تصدير PDF
            </button>
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">رصيد أول المدة</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {openingBalance.toFixed(2)} ريال
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي الحركة</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {transactions.length} عملية
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">رصيد آخر المدة</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {closingBalance.toFixed(2)} ريال
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    رقم السند
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    التاريخ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    البيان
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    مدين
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    دائن
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    الرصيد
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {startDate ? format(new Date(startDate), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {openingBalanceDesc}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400">
                    {openingBalance.toFixed(2)}
                  </td>
                </tr>

                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {tx.voucher?.code || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {tx.created_at ? format(new Date(tx.created_at), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tx.voucher?.type === 'INTERNAL_TRANSFER'
                        ? (tx.voucher?.note || tx.note || '')
                        : (
                          <>
                            {tx.voucher?.note || tx.note || ''}
                            {tx.voucher?.partyName && <span className="text-gray-500 dark:text-gray-400"> - {tx.voucher.partyName}</span>}
                          </>
                        )
                      }
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                      {tx.type.toUpperCase() === 'IN' ? parseFloat(String(tx.amount)).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
                      {tx.type.toUpperCase() === 'OUT' ? parseFloat(String(tx.amount)).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      {(tx.balanceAfter ?? tx.balance_after ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}

                <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white" colSpan={3}>
                    الإجماليات
                  </td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                    {totalDebit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    {totalCredit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400">
                    {closingBalance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            لا توجد بيانات. اختر الفترة وانقر على "إنشاء التقرير"
          </p>
        </div>
      )}

      {showPrintPreview && (
        <TreasuryReportPrint
          startDate={startDate}
          endDate={endDate}
          transactions={transactions}
          openingBalance={openingBalance}
          openingBalanceDescription={openingBalanceDesc}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          closingBalance={closingBalance}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
