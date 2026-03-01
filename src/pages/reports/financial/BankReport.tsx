import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Search, Printer, FileDown, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import BankReportPrint from '@/components/BankReportPrint';
import { showWarning, showError, showInfo } from '@/lib/toast';
import { useRef } from 'react';

interface BankAccount {
  id: string;
  accountNo: string;
  bankId: string;
  bank?: { name: string };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  note: string;
  partyName?: string;
  voucherType?: string;
  created_at: string;
  voucher_code?: string;
  balanceAfter?: number;
}

export default function BankReport() {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const filteredAccounts = accounts.filter(a =>
    (a.bank?.name || '').toLowerCase().includes(accountSearch.toLowerCase()) ||
    a.accountNo.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const selectedAccountDetails = accounts.find(a => a.id === selectedAccount);
  const selectedAccountName = selectedAccountDetails ? `${selectedAccountDetails.bank?.name || 'بنك'} - ${selectedAccountDetails.accountNo}` : '';

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccount(accountId);
    setIsDropdownOpen(false);
    setAccountSearch('');
  };

  const loadAccounts = async () => {
    try {
      const response = await apiClient.getBankAccounts();
      const accountsData = Array.isArray(response) ? response : (response?.data || []);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      if (selectedAccount === 'all') {
        showWarning('الرجاء اختيار حساب بنكي محدد');
        setLoading(false);
        return;
      }
      if (startDate > endDate) {
        showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
        setLoading(false);
        return;
      }

      const params = { from: startDate, to: endDate };
      const reportData = await apiClient.getBankReportData(selectedAccount, params);

      setOpeningBalance(reportData.openingBalance || 0);

      if (reportData.transactions) {
        const transactionsData: Transaction[] = reportData.transactions.map((v: any) => ({
          id: v.id,
          type: v.type,
          amount: parseFloat(String(v.amount)),
          note: v.note || '',
          partyName: v.partyName,
          voucherType: v.voucherType,
          created_at: v.date,
          voucher_code: v.code,
          balanceAfter: v.balanceAfter,
        }));

        setTransactions(transactionsData);
      }
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
    .filter(tx => tx.type === 'receipt')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalCredit = transactions
    .filter(tx => tx.type === 'payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const closingBalance = openingBalance + totalDebit - totalCredit;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          تقرير حركة الحسابات البنكية
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الحساب البنكي
            </label>
            {/* Custom Searchable Dropdown */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                ${isDropdownOpen
                  ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
              <span className={`truncate ${!selectedAccount || selectedAccount === 'all' ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                {selectedAccountName || 'اختر الحساب'}
              </span>
              <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                {selectedAccount && selectedAccount !== 'all' && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount('all');
                      setAccountSearch('');
                    }}
                    className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                style={{ animation: 'dropdownIn 0.15s ease-out' }}
              >
                {/* Search Input */}
                <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      placeholder="ابحث عن حساب..."
                      className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Account List */}
                <ul
                  className="overflow-y-auto py-1 scrollbar-thin"
                  style={{ maxHeight: '280px' }}
                >
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((account) => (
                      <li key={account.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectAccount(account.id)}
                          className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100 flex justify-between items-center
                            ${account.id === selectedAccount
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                            }`}
                        >
                          <span>{account.bank?.name || 'بنك'}</span>
                          <span className="text-gray-500 dark:text-gray-400 mr-2" dir="ltr">{account.accountNo}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                      لا توجد نتائج
                    </li>
                  )}
                </ul>

                {/* Footer with count */}
                {filteredAccounts.length > 0 && (
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {filteredAccounts.length} حساب
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

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
          <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 p-4">
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
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white" colSpan={3}>
                    رصيد أول المدة
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
                      {tx.voucher_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(tx.created_at), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tx.voucherType === 'INTERNAL_TRANSFER'
                        ? (tx.note || '')
                        : (
                          <>
                            {tx.note || ''}
                            {tx.partyName && <span className="text-gray-500 dark:text-gray-400"> - {tx.partyName}</span>}
                          </>
                        )
                      }
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                      {tx.type === 'receipt' ? tx.amount.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
                      {tx.type === 'payment' ? tx.amount.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      {(tx.balanceAfter ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}

                <tr className="bg-green-50 dark:bg-green-900/20 font-semibold">
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
            لا توجد بيانات. اختر الحساب والفترة وانقر على "إنشاء التقرير"
          </p>
        </div>
      )}

      {showPrintPreview && (
        <BankReportPrint
          accountName={accounts.find(a => a.id === selectedAccount)?.bank?.name || ''}
          accountNo={accounts.find(a => a.id === selectedAccount)?.accountNo || ''}
          startDate={startDate}
          endDate={endDate}
          transactions={transactions}
          openingBalance={openingBalance}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          closingBalance={closingBalance}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
