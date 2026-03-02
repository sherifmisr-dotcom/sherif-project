import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { Search, Eye, ChevronDown, X, Users } from 'lucide-react';
import { format } from 'date-fns';
import CustomerStatementPrint from '@/components/CustomerStatementPrint';
import CustomerGroupStatementPrint from '@/components/CustomerGroupStatementPrint';
import { showWarning, showError } from '@/lib/toast';
import { motion } from 'framer-motion';

interface Customer {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function CustomerReports() {
  const [activeTab, setActiveTab] = useState<'customer' | 'group'>('customer');
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [showPrint, setShowPrint] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Group statement state
  const [customerGroups, setCustomerGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const [groupReport, setGroupReport] = useState<any>(null);
  const [hasGeneratedGroup, setHasGeneratedGroup] = useState(false);
  const [showGroupPrint, setShowGroupPrint] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadCustomerGroups();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
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

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomerName = customers.find(c => c.id === selectedCustomer)?.name || '';

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomer(customerId);
    setIsDropdownOpen(false);
    setCustomerSearch('');
  };

  const loadCustomers = async () => {
    try {
      const response = await apiClient.getCustomers({ limit: 0 });

      // Handle both direct array and response.data structure
      const customersData = Array.isArray(response) ? response : (response?.data || []);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadCustomerGroups = async () => {
    try {
      const response = await apiClient.getCustomerGroups();
      setCustomerGroups(response.data || []);
    } catch (error) {
      console.error('Error loading customer groups:', error);
    }
  };

  const selectedGroupName = customerGroups.find(g => g.id === selectedGroup)?.name || '';

  const generateGroupReport = async () => {
    if (!selectedGroup) {
      showWarning('الرجاء اختيار مجموعة');
      return;
    }
    if (startDate > endDate) {
      showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
      return;
    }

    setLoading(true);
    setHasGeneratedGroup(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const data = await apiClient.getCustomerGroupStatement(selectedGroup, { from: startDate, to: endDate });
      setGroupReport(data);
    } catch (error: any) {
      console.error('Error generating group report:', error);
      showError('حدث خطأ أثناء إنشاء تقرير المجموعة: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedCustomer) {
      showWarning('الرجاء اختيار عميل');
      return;
    }
    if (startDate > endDate) {
      showWarning('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
      return;
    }

    setLoading(true);
    setHasGenerated(true);

    // Small delay to ensure loading animation is visible
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const params = {
        from: startDate,
        to: endDate,
      };

      const statementData = await apiClient.getCustomerStatement(selectedCustomer, params);

      // Backend returns: {customer, invoices, vouchers, summary}
      // We need to transform it to transactions format

      const allTransactions: any[] = [];

      // Add invoices as debit transactions
      if (statementData.invoices) {
        statementData.invoices.forEach((inv: any) => {

          // Try multiple possible field names for invoice number
          const invoiceNo = inv.invoiceNo ||
            inv.invoice_no ||
            inv.invoiceNumber ||
            inv.invoice_number ||
            inv.number ||
            inv.code ||
            inv.id ||
            'غير محدد';

          // Try multiple possible field names for amount
          const amount = parseFloat(String(
            inv.totalAmount ||
            inv.total_amount ||
            inv.totalamount ||
            inv.total ||
            inv.amount ||
            inv.grandTotal ||
            inv.grand_total ||
            0
          ));


          allTransactions.push({
            date: inv.date,
            type: 'invoice',
            description: `معاملة تخليص جمركي - فاتورة رقم ${invoiceNo}`,
            debit: amount,
            credit: 0,
            id: inv.id,
          });
        });
      }

      // Add vouchers as credit transactions
      if (statementData.vouchers) {
        statementData.vouchers.forEach((v: any) => {
          const voucherCode = v.code || v.voucherCode || 'غير محدد';
          const voucherNote = v.note || v.notes || v.description || 'سداد';

          allTransactions.push({
            date: v.date,
            type: 'voucher',
            description: `${voucherNote} - سند قبض رقم ${voucherCode}`,
            debit: 0,
            credit: parseFloat(String(v.amount || 0)),
            id: v.id,
          });
        });
      }

      // Sort by date
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Use opening balance from backend (accumulated before the selected period)
      let runningBalance = statementData.openingBalance || 0;
      setOpeningBalance(runningBalance);

      // Create transactions with running balance
      const transactionsList: Transaction[] = allTransactions.map(tx => {
        runningBalance += tx.debit - tx.credit;
        return {
          id: tx.id,
          date: tx.date,
          description: tx.description,
          debit: tx.debit,
          credit: tx.credit,
          balance: runningBalance,
        };
      });

      setTransactions(transactionsList);
    } catch (error: any) {
      console.error('Error generating report:', error);

      showError('حدث خطأ أثناء إنشاء التقرير: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
  const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        تقارير العملاء
      </h2>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('customer')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'customer'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          كشف حساب عميل
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'group'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <Users className="w-4 h-4" />
          كشف حساب مجموعة
        </button>
      </div>

      {activeTab === 'customer' && (
        <>
          <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              كشف حساب عميل
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  العميل
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
                  <span className={`truncate ${!selectedCustomer ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                    {selectedCustomerName || 'اختر العميل'}
                  </span>
                  <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                    {selectedCustomer && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer('');
                          setCustomerSearch('');
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
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="ابحث عن عميل..."
                          className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Customer List */}
                    <ul
                      className="overflow-y-auto py-1 scrollbar-thin"
                      style={{ maxHeight: '280px' }}
                    >
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <li key={customer.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(customer.id)}
                              className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                            ${customer.id === selectedCustomer
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                }`}
                            >
                              {customer.name}
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
                    {filteredCustomers.length > 0 && (
                      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {filteredCustomers.length} عميل
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

            {hasGenerated && !loading && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrint(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  معاينة وطباعة
                </button>
              </div>
            )}
          </div>

          {hasGenerated && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >

              {/* Enhanced Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-gray-100 dark:divide-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="p-6 text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">رصيد أول المدة</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.abs(openingBalance).toFixed(2)}
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">ريال</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${openingBalance >= 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                      {openingBalance >= 0 ? 'مدين' : 'دائن'}
                    </span>
                  </div>
                </div>

                <div className="p-6 text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">عدد الحركات</p>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white block">
                    {transactions.length}
                  </span>
                </div>

                <div className={`p-6 text-center ${closingBalance >= 0 ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-green-50/50 dark:bg-green-900/10'
                  }`}>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">الرصيد الختامي</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-3xl font-bold ${closingBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                      {Math.abs(closingBalance).toFixed(2)}
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">ريال</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${closingBalance >= 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                      {closingBalance >= 0 ? 'مدين' : 'دائن'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="max-h-[1500px] overflow-y-auto overflow-x-auto scrollbar-thin border border-gray-200 dark:border-gray-700 rounded-b-2xl">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100 dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-700 shadow-sm">
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        التاريخ
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">
                        البــيـــــان
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        مدين
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        دائن
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        الرصيد
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
                    {/* Opening Balance Row */}
                    <tr className="bg-sky-50/30 dark:bg-sky-900/10">
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums">
                        {format(new Date(startDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-200">
                        رصيد أول المدة
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-gray-400 font-medium tabular-nums">-</td>
                      <td className="px-6 py-4 text-left text-sm text-gray-400 font-medium tabular-nums">-</td>
                      <td className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white tabular-nums" dir="ltr">
                        {openingBalance.toFixed(2)}
                      </td>
                    </tr>

                    {transactions.map((tx, _index) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 tabular-nums border-l border-transparent">
                          {format(new Date(tx.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                          {tx.description}
                        </td>
                        <td className={`px-6 py-4 text-left text-sm font-semibold tabular-nums ${tx.debit > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'}`}>
                          {tx.debit > 0 ? tx.debit.toFixed(2) : '-'}
                        </td>
                        <td className={`px-6 py-4 text-left text-sm font-semibold tabular-nums ${tx.credit > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}`}>
                          {tx.credit > 0 ? tx.credit.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white tabular-nums bg-gray-50/50 dark:bg-gray-900/20" dir="ltr">
                          {tx.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    {/* Totals Row */}
                    <tr className="bg-gray-100 dark:bg-gray-900 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white" colSpan={2}>
                        الإجماليات
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-red-600 dark:text-red-400 tabular-nums">
                        {totalDebit.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-green-600 dark:text-green-400 tabular-nums">
                        {totalCredit.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 text-left text-sm tabular-nums ${closingBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} dir="ltr">
                        {closingBalance.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {!loading && !hasGenerated && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                اختر العميل والفترة وانقر على "إنشاء التقرير"
              </p>
            </div>
          )}

          {showPrint && hasGenerated && (
            <CustomerStatementPrint
              customerName={customers.find(c => c.id === selectedCustomer)?.name || ''}
              startDate={startDate}
              endDate={endDate}
              openingBalance={openingBalance}
              transactions={transactions}
              closingBalance={closingBalance}
              onClose={() => setShowPrint(false)}
            />
          )}
        </>
      )}

      {/* ===== Group Statement Tab ===== */}
      {activeTab === 'group' && (
        <>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              كشف حساب مجموعة
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div ref={groupDropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المجموعة</label>
                <button
                  type="button"
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                  ${isGroupDropdownOpen
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                >
                  <span className={`truncate ${!selectedGroup ? 'text-gray-400' : ''}`}>
                    {selectedGroupName || 'اختر المجموعة'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isGroupDropdownOpen && (
                  <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden"
                    style={{ animation: 'dropdownIn 0.15s ease-out' }}>
                    <ul className="py-1 max-h-60 overflow-y-auto">
                      {customerGroups.length > 0 ? (
                        customerGroups.map((group) => (
                          <li key={group.id}>
                            <button
                              type="button"
                              onClick={() => { setSelectedGroup(group.id); setIsGroupDropdownOpen(false); }}
                              className={`w-full text-right px-4 py-2.5 text-sm transition-colors
                              ${group.id === selectedGroup
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'}`}
                            >
                              <div className="flex justify-between items-center">
                                <span>{group.name}</span>
                                <span className="text-xs text-gray-400">{group.customerCount} عميل</span>
                              </div>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-6 text-center text-sm text-gray-400">لا توجد مجموعات</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">من تاريخ</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">إلى تاريخ</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>

              <div className="flex items-end">
                <button onClick={generateGroupReport} disabled={loading}
                  className="btn-primary px-6 disabled:opacity-50 w-full justify-center">
                  <Search className="w-5 h-5" />
                  {loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
                </button>
              </div>
            </div>

            {groupReport && groupReport.customerStatements?.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGroupPrint(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  معاينة وطباعة
                </button>
              </div>
            )}
          </div>

          {/* Group Report Results */}
          {groupReport && (() => {
            // Compute group opening balance (sum of all customers' opening balances)
            const groupOpeningBalance = (groupReport.customerStatements || []).reduce(
              (sum: number, cs: any) => sum + (cs.openingBalance || 0), 0
            );

            // Merge all transactions
            const allRows: Array<{ date: string; customer: string; description: string; debit: number; credit: number; id: string; balance: number }> = [];

            (groupReport.customerStatements || []).forEach((cs: any) => {
              const customerName = cs.customer?.name || '';
              (cs.invoices || []).forEach((inv: any) => {
                const amt = parseFloat(String(inv.total || inv.totalAmount || inv.total_amount || inv.amount || 0));
                allRows.push({ date: inv.date, customer: customerName, description: `فاتورة رقم ${inv.invoiceNo || inv.code || inv.id}`, debit: amt, credit: 0, id: `inv-${inv.id}`, balance: 0 });
              });
              (cs.vouchers || []).forEach((v: any) => {
                const amt = parseFloat(String(v.amount || 0));
                allRows.push({ date: v.date, customer: customerName, description: `سند قبض رقم ${v.code}`, debit: 0, credit: amt, id: `v-${v.id}`, balance: 0 });
              });
            });

            allRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Calculate running balance
            let runningBal = groupOpeningBalance;
            allRows.forEach(r => { runningBal += r.debit - r.credit; r.balance = runningBal; });

            const totalDebitGroup = allRows.reduce((s, r) => s + r.debit, 0);
            const totalCreditGroup = allRows.reduce((s, r) => s + r.credit, 0);
            const closingBal = groupOpeningBalance + totalDebitGroup - totalCreditGroup;

            return (
              <div className="space-y-4">
                {/* Group Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    ملخص مجموعة: {groupReport.group?.name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">عدد العملاء</p>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{groupReport.customerStatements?.length || 0}</span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي مدين</p>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">{totalDebitGroup.toFixed(2)} ريال</span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي دائن</p>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCreditGroup.toFixed(2)} ريال</span>
                    </div>
                    <div className={`${closingBal > 0 ? 'bg-red-50 dark:bg-red-900/20' : closingBal < 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'} rounded-xl p-4 text-center`}>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {closingBal > 0 ? 'المستحق على المجموعة' : closingBal < 0 ? 'المستحق للمجموعة' : 'الرصيد'}
                      </p>
                      <span className={`text-2xl font-bold ${closingBal > 0 ? 'text-red-600 dark:text-red-400' : closingBal < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600'}`}>
                        {Math.abs(closingBal).toFixed(2)} ريال
                      </span>
                    </div>
                  </div>
                </div>

                {/* Unified Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="max-h-[1500px] overflow-y-auto overflow-x-auto scrollbar-thin border border-gray-200 dark:border-gray-700 rounded-b-2xl">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">التاريخ</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">المؤسسة</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">البيان</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">مدين</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">دائن</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">الرصيد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Opening balance row */}
                        <tr className="bg-sky-50/30 dark:bg-sky-900/10">
                          <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums">{format(new Date(startDate), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">-</td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-200">رصيد أول المدة</td>
                          <td className="px-6 py-4 text-left text-sm text-gray-400">-</td>
                          <td className="px-6 py-4 text-left text-sm text-gray-400">-</td>
                          <td className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white tabular-nums" dir="ltr">{groupOpeningBalance.toFixed(2)}</td>
                        </tr>
                        {allRows.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{format(new Date(row.date), 'dd/MM/yyyy')}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.customer}</td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{row.description}</td>
                            <td className={`px-6 py-4 text-left text-sm font-semibold tabular-nums ${row.debit > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'}`}>
                              {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                            </td>
                            <td className={`px-6 py-4 text-left text-sm font-semibold tabular-nums ${row.credit > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}`}>
                              {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                            </td>
                            <td className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white tabular-nums bg-gray-50/50 dark:bg-gray-900/20" dir="ltr">
                              {row.balance.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-gray-100 dark:bg-gray-900 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white" colSpan={3}>الإجماليات</td>
                          <td className="px-6 py-4 text-left text-sm text-red-600 dark:text-red-400 tabular-nums">{totalDebitGroup.toFixed(2)}</td>
                          <td className="px-6 py-4 text-left text-sm text-green-600 dark:text-green-400 tabular-nums">{totalCreditGroup.toFixed(2)}</td>
                          <td className={`px-6 py-4 text-left text-sm font-bold tabular-nums ${closingBal >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} dir="ltr">
                            {closingBal.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {!loading && !groupReport && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {hasGeneratedGroup
                  ? 'لا توجد حركات للمجموعة خلال الفترة المحددة'
                  : 'اختر المجموعة والفترة وانقر على "إنشاء التقرير"'
                }
              </p>
            </div>
          )}

          {showGroupPrint && groupReport && (() => {
            const groupOpeningBalance = (groupReport.customerStatements || []).reduce(
              (sum: number, cs: any) => sum + (cs.openingBalance || 0), 0
            );

            const allRows: Array<{ date: string; customer: string; description: string; debit: number; credit: number; id: string; balance: number }> = [];

            (groupReport.customerStatements || []).forEach((cs: any) => {
              const customerName = cs.customer?.name || '';
              (cs.invoices || []).forEach((inv: any) => {
                const amt = parseFloat(String(inv.total || inv.totalAmount || inv.total_amount || inv.amount || 0));
                allRows.push({ date: inv.date, customer: customerName, description: `فاتورة رقم ${inv.invoiceNo || inv.code || inv.id}`, debit: amt, credit: 0, id: `inv-${inv.id}`, balance: 0 });
              });
              (cs.vouchers || []).forEach((v: any) => {
                const amt = parseFloat(String(v.amount || 0));
                allRows.push({ date: v.date, customer: customerName, description: `سند قبض رقم ${v.code}`, debit: 0, credit: amt, id: `v-${v.id}`, balance: 0 });
              });
            });

            allRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let runningBal = groupOpeningBalance;
            allRows.forEach(r => { runningBal += r.debit - r.credit; r.balance = runningBal; });

            const totalDebitGroup = allRows.reduce((s, r) => s + r.debit, 0);
            const totalCreditGroup = allRows.reduce((s, r) => s + r.credit, 0);
            const closingBal = groupOpeningBalance + totalDebitGroup - totalCreditGroup;

            return (
              <CustomerGroupStatementPrint
                groupName={groupReport.group?.name || selectedGroupName}
                customerCount={groupReport.customerStatements?.length || 0}
                startDate={startDate}
                endDate={endDate}
                openingBalance={groupOpeningBalance}
                transactions={allRows}
                closingBalance={closingBal}
                onClose={() => setShowGroupPrint(false)}
              />
            );
          })()}
        </>
      )}
    </motion.div>
  );
}
