import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { Search, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { AgentStatementPrint } from '@/components/AgentStatementPrint';
import { numberToArabicWords } from '@/lib/numberToWords';
import { showWarning, showError } from '@/lib/toast';
import { motion } from 'framer-motion';

interface Agent {
  id: string;
  name: string;
  taxNumber?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  count: string;
  vessel: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function AgentReports() {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [showPrint, setShowPrint] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [agentData, setAgentData] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [agentSearch, setAgentSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAgents();
    loadCompanySettings();
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

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const selectedAgentName = agents.find(a => a.id === selectedAgent)?.name || '';

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    setIsDropdownOpen(false);
    setAgentSearch('');
  };

  const loadAgents = async () => {
    try {
      const response = await apiClient.getAgents();

      // Handle both direct array and response.data structure
      const agentsData = Array.isArray(response) ? response : (response?.data || []);
      setAgents(agentsData);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const response = await apiClient.getCompanySettings();
      const data = response.data || response;
      setCompanySettings(data);
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedAgent) {
      showWarning('الرجاء اختيار وكيل');
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
        startDate,
        endDate,
      };

      const statementData = await apiClient.getAgentStatement(selectedAgent, params);

      // Backend returns: {agent, trips, fees, vouchers, summary}
      const allTransactions: any[] = [];

      // Add trips as CREDIT transactions (دائن) - agent receives money
      if (statementData.trips) {
        statementData.trips.forEach((trip: any) => {
          // Get vessel name from trip data
          const vesselName = trip.vessel?.name || 'غير محدد';

          allTransactions.push({
            date: trip.date,
            type: 'trip',
            description: `رحلة العبارة ${vesselName} `,
            vessel: vesselName,
            count: trip.tripNumber || '-',
            debit: 0,
            credit: parseFloat(String(trip.totalAmount || 0)),
            id: trip.id,
          });
        });
      }

      // Add fees as CREDIT transactions (دائن) - additional fees for agent
      if (statementData.fees) {
        statementData.fees.forEach((fee: any) => {
          // Get vessel name from fee data
          const vesselName = fee.vessel?.name || 'غير محدد';
          const feeType = fee.feeType || 'رسوم إضافية';

          allTransactions.push({
            date: fee.date,
            type: 'fee',
            description: `${feeType} رحلة العبارة ${vesselName} `,
            vessel: vesselName,
            count: fee.tripNumber || '-',
            debit: 0,
            credit: parseFloat(String(fee.amount || 0)),
            id: fee.id,
          });
        });
      }

      // Add payment vouchers as DEBIT transactions (مدين) - payments to agent
      if (statementData.vouchers && statementData.vouchers.length > 0) {
        statementData.vouchers.forEach((voucher: any) => {
          // Get voucher details from notes field
          const counterparty = voucher.notes || 'غير محدد';
          const voucherCode = voucher.code || voucher.voucherCode || voucher.voucherNumber || '-';

          allTransactions.push({
            date: voucher.date,
            type: 'voucher',
            description: counterparty,
            vessel: '-',
            count: voucherCode,
            debit: parseFloat(String(voucher.amount || 0)),
            credit: 0,
            id: voucher.id,
          });
        });
      }

      // Sort by date
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get opening balance from backend (calculated based on period)
      const periodOpeningBalance = statementData.openingBalance || 0;
      let runningBalance = periodOpeningBalance;
      setOpeningBalance(runningBalance);

      // Create transactions with running balance
      const transactionsList: Transaction[] = allTransactions.map(tx => {
        runningBalance += tx.credit - tx.debit;
        return {
          id: tx.id,
          date: tx.date,
          description: tx.description,
          count: tx.count,
          vessel: tx.vessel,
          debit: tx.debit,
          credit: tx.credit,
          balance: runningBalance,
        };
      });

      setTransactions(transactionsList);
      setAgentData(statementData.agent);
    } catch (error: any) {
      console.error('Error generating report:', error);
      showError('حدث خطأ أثناء إنشاء التقرير: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
  const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
  const closingBalance = openingBalance + totalCredit - totalDebit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        تقارير الوكلاء الملاحيين
      </h2>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          كشف حساب وكيل
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الوكيل
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
              <span className={`truncate ${!selectedAgent ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                {selectedAgentName || 'اختر الوكيل'}
              </span>
              <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                {selectedAgent && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAgent('');
                      setAgentSearch('');
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
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      placeholder="ابحث عن وكيل..."
                      className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Agent List */}
                <ul
                  className="overflow-y-auto py-1 scrollbar-thin"
                  style={{ maxHeight: '280px' }}
                >
                  {filteredAgents.length > 0 ? (
                    filteredAgents.map((agent) => (
                      <li key={agent.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectAgent(agent.id)}
                          className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                            ${agent.id === selectedAgent
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                            }`}
                        >
                          {agent.name}
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
                {filteredAgents.length > 0 && (
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {filteredAgents.length} وكيل
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              معاينة وطباعة التقرير
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
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                  {openingBalance >= 0 ? 'دائن' : 'مدين'}
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
                  {closingBalance >= 0 ? 'دائن' : 'مدين'}
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
                    البيان
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الرحلة/السند
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    دائن
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    مدين
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
                  <td className="px-6 py-4 text-center text-sm text-gray-400 font-medium">-</td>
                  <td className="px-6 py-4 text-left text-sm text-gray-400 font-medium tabular-nums">-</td>
                  <td className="px-6 py-4 text-left text-sm text-gray-400 font-medium tabular-nums">-</td>
                  <td className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white tabular-nums" dir="ltr">
                    {openingBalance.toFixed(2)}
                  </td>
                </tr>

                {transactions.map((tx) => (
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
                    <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400 font-medium tabular-nums">
                      {tx.count !== '-' ? tx.count : '-'}
                    </td>
                    <td className={`px-6 py-4 text-left text-sm font-semibold tabular-nums ${tx.credit > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}`}>
                      {tx.credit > 0 ? tx.credit.toFixed(2) : '-'}
                    </td>
                    <td className={`px-6 py-4 text-left text-sm font-semibold tabular-nums ${tx.debit > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'}`}>
                      {tx.debit > 0 ? tx.debit.toFixed(2) : '-'}
                    </td>
                    <td className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white tabular-nums bg-gray-50/50 dark:bg-gray-900/20" dir="ltr">
                      {tx.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-gray-100 dark:bg-gray-900 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white" colSpan={3}>
                    الإجماليات
                  </td>
                  <td className="px-6 py-4 text-left text-sm text-green-600 dark:text-green-400 tabular-nums">
                    {totalCredit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-left text-sm text-red-600 dark:text-red-400 tabular-nums">
                    {totalDebit.toFixed(2)}
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
            اختر الوكيل والفترة وانقر على "إنشاء التقرير"
          </p>
        </div>
      )}

      {showPrint && agentData && hasGenerated && (
        <AgentStatementPrint
          data={{
            companyName: (companySettings?.nameAr || 'نظام إدارة العمليات الجمركية') + (companySettings?.activityAr ? ' ' + companySettings.activityAr : ''),
            companyNameEn: (companySettings?.nameEn || 'Customs Operations Management System') + (companySettings?.activityEn ? ' ' + companySettings.activityEn : ''),
            phone: companySettings?.phone || '---',
            taxNumber: companySettings?.taxNumber || '---',
            licenseNumber: companySettings?.licenseNo || '---',
            logoPath: companySettings?.logoPath,
            statementNo: `ST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
            agentName: agentData.name || '',
            agentTaxNumber: agentData.taxNumber || '-',
            startDate: format(new Date(startDate), 'dd/MM/yyyy'),
            endDate: format(new Date(endDate), 'dd/MM/yyyy'),
            openingBalance: openingBalance,
            transactions: transactions.map(tx => ({
              id: tx.id,
              date: format(new Date(tx.date), 'dd/MM/yyyy'),
              count: tx.count,
              vessel: tx.vessel,
              description: tx.description,
              credit: tx.credit,
              debit: tx.debit,
              balance: tx.balance,
            })),
            totalCredit: totalCredit,
            totalDebit: totalDebit,
            finalBalance: closingBalance,
            balanceInWords: numberToArabicWords(closingBalance),
          }}
          onClose={() => setShowPrint(false)}
        />
      )}
    </motion.div>
  );
}
