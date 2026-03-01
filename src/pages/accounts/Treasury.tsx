import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '@/components/ui/PageTransition';
import { apiClient } from '@/lib/api';
import { Settings, Wallet, TrendingUp, TrendingDown, CheckCircle, XCircle, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollLock } from '@/hooks/useScrollLock';
import { showSuccess, showError } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import CarryForwardModal from '@/components/modals/CarryForwardModal';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface TreasuryData {
  id: string;
  opening_balance: number;
  openingBalance?: number;
  current_balance: number;
  currentBalance?: number;
  opening_set_at: string | null;
  opening_set_by: string | null;
  prevent_negative: boolean;
  preventNegativeTreasury?: boolean;
}

interface BankAccount {
  id: string;
  accountNo?: string;
  account_no?: string;
  bank?: {
    name: string;
  };
  banks?: {
    name: string;
  };
}

interface Transaction {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  amount: number;
  note: string;
  balance_after: number;
  balanceAfter?: number;
  voucher_id: string | null;
  sourceAccountId?: string;
  destAccountId?: string;
  sourceType?: string;
  destType?: string;
  voucher?: {
    code: string;
    type?: string;
  };
  vouchers?: {
    code: string;
    type?: string;
  };
}

export default function Treasury() {
  const { user } = useAuth();
  const { requirePermission } = usePermissions();
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [treasurySettings, setTreasurySettings] = useState<any>(null);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [autoCarryForwardEnabled, setAutoCarryForwardEnabled] = useState(false);

  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load independent data in parallel
        await Promise.all([
          loadTreasury(),
          loadTreasurySettings(),
          loadBankAccounts(),
          loadAutoCarryForwardStatus(),
        ]);
        // Load transactions last (using initial limit)
        await loadTransactions(10);
      } catch (error) {
        console.error('Error in initial load:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useScrollLock(showOpeningModal);

  const getTransactionDescription = (transaction: Transaction) => {
    // Check voucher type first for internal transfers
    const voucherType = transaction.voucher?.type || transaction.vouchers?.type;

    if (voucherType === 'INTERNAL_TRANSFER') {
      // If there's a manual note, use it
      if (transaction.note) {
        return transaction.note;
      }

      // Otherwise, generate automatic description
      let bankAccount: BankAccount | undefined;
      if (transaction.type === 'IN') {
        // Money coming IN to treasury, so source is the bank
        bankAccount = bankAccounts.find(a => a.id === transaction.sourceAccountId);
        const bankName = bankAccount
          ? `${bankAccount.bank?.name || bankAccount.banks?.name || 'بنك'} - ${bankAccount.accountNo || bankAccount.account_no}`
          : 'حساب بنكي';
        return `تغذية الخزنة من حساب ${bankName}`;
      } else {
        // Money going OUT from treasury, so destination is the bank
        bankAccount = bankAccounts.find(a => a.id === transaction.destAccountId);
        const bankName = bankAccount
          ? `${bankAccount.bank?.name || bankAccount.banks?.name || 'بنك'} - ${bankAccount.accountNo || bankAccount.account_no}`
          : 'حساب بنكي';
        return `إيداع بنكي من الخزنة في حساب ${bankName}`;
      }
    }

    // Check if note contains "تحويل" which indicates internal transfer
    // Try to extract bank name from the note
    if (transaction.note && (transaction.note.includes('تحويل من') || transaction.note.includes('تحويل إلى'))) {
      // Extract bank account name from note (e.g., "تحويل من شركة الراجحي" or "تحويل إلى شركة الراجحي")
      const match = transaction.note.match(/(?:تحويل من|تحويل إلى)\s+(.+)/);
      const bankInfo = match ? match[1].trim() : 'حساب بنكي';

      if (transaction.type === 'IN') {
        return `تغذية الخزنة من حساب ${bankInfo}`;
      } else {
        return `إيداع بنكي من الخزنة في حساب ${bankInfo}`;
      }
    }

    // If there's a custom note, use it
    if (transaction.note) return transaction.note;

    // Default descriptions
    return transaction.type === 'IN' ? 'إيداع' : 'سحب';
  };

  const loadBankAccounts = async () => {
    try {
      const response = await apiClient.getBankAccounts();
      setBankAccounts(Array.isArray(response) ? response : (response.data || []));
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  // ... existing code ...

  const loadTreasury = async () => {
    try {
      const data = await apiClient.getTreasuryBalance();
      if (data) {
        setTreasury(data);
      }
    } catch (error) {
      console.error('Error loading treasury:', error);
    }
  };

  const loadTransactions = async (currentLimit: number) => {
    try {
      const response = await apiClient.getTreasuryTransactions({ limit: currentLimit });
      if (response.data) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  // Calculate correct balances for displayed transactions
  const transactionsWithCorrectBalances = useMemo(() => {
    if (!treasury || transactions.length === 0) return [];

    const initialBalance = treasury.currentBalance ?? treasury.current_balance ?? 0;
    let currentBalance = initialBalance;

    // Since transactions are ordered from newest to oldest,
    // we start with current balance and work backwards
    return transactions.map((transaction) => {
      const balanceAfter = currentBalance;

      // Calculate balance before this transaction
      if (transaction.type === 'IN') {
        currentBalance = currentBalance - parseFloat(String(transaction.amount));
      } else {
        currentBalance = currentBalance + parseFloat(String(transaction.amount));
      }

      return {
        ...transaction,
        calculatedBalanceAfter: balanceAfter,
      };
    });
  }, [transactions, treasury]);

  const handleSetOpening = async () => {
    if (!user) return;

    try {
      await apiClient.setTreasuryOpeningBalance({
        openingBalance,
      });

      showSuccess('تم تعيين رصيد الخزنة الافتتاحي بنجاح');
      setShowOpeningModal(false);
      loadTreasury();
      loadTreasurySettings(); // Reload settings to update UI
    } catch (error) {
      console.error('Error setting opening balance:', error);
      showError('حدث خطأ أثناء تعيين رصيد الخزنة');
    }
  };

  const loadTreasurySettings = async () => {
    try {
      const data = await apiClient.getTreasuryOpeningBalanceSettings();
      setTreasurySettings(data);
    } catch (error) {
      console.error('Error loading treasury settings:', error);
    }
  };

  const handleCarryForward = async (data: { periodType: 'MONTH' | 'YEAR'; newPeriodStartDate: string }) => {
    try {
      await apiClient.carryForwardTreasury(data);
      showSuccess('تم ترحيل رصيد الخزنة بنجاح');
      loadTreasury();
      loadTreasurySettings();
    } catch (error: any) {
      // Display the actual error message from backend
      const errorMessage = error?.response?.data?.message || 'حدث خطأ أثناء ترحيل الرصيد';
      showError(errorMessage);
      // Don't log error or throw to prevent console errors
    }
  };

  const loadAutoCarryForwardStatus = async () => {
    try {
      const data = await apiClient.getCarryForwardSettings();
      setAutoCarryForwardEnabled(data?.autoCarryForwardEnabled ?? false);
    } catch (error) {
      console.error('Error loading auto carry-forward status:', error);
    }
  };

  useEffect(() => {
    loadTreasurySettings();
  }, []);

  const handleLoadMore = () => {
    const newLimit = 30;
    setLimit(newLimit);
    loadTransactions(newLimit);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">الرصيد الحالي</h3>
              <Wallet className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">
              {treasury ? parseFloat(String(treasury.currentBalance || treasury.current_balance || 0)).toFixed(2) : '0.00'} ريال
            </p>
          </motion.div>

          {/* Opening Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">الرصيد الافتتاحي</h3>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            {(!treasurySettings || !treasury || (treasury.openingBalance === null && treasury.opening_balance === null) || (treasury.openingBalance === undefined && treasury.opening_balance === undefined)) ? (
              <div className="mt-2">
                <p className="text-sm opacity-90 mb-3">لم يتم تعيين رصيد أول المدة بعد</p>
                <button
                  onClick={() => setShowOpeningModal(true)}
                  className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
                >
                  فتح رصيد أول المدة
                </button>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold mb-2">
                  {treasurySettings ? parseFloat(String(treasurySettings.openingBalance || 0)).toFixed(2) : '0.00'} ريال
                </p>
                {treasurySettings && (
                  <div className="space-y-1 text-xs opacity-90">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(treasurySettings.openingBalanceDate), 'dd/MM/yyyy', { locale: ar })}</span>
                    </div>
                    {treasurySettings.carryForwardNote && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{treasurySettings.carryForwardNote}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Settings Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">إعدادات الخزنة</h3>
              <Settings className="w-5 h-5 opacity-80" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              {(treasury?.preventNegativeTreasury || treasury?.prevent_negative) ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <p className="text-sm opacity-90">
                {(treasury?.preventNegativeTreasury || treasury?.prevent_negative) ? 'منع الرصيد السالب مفعّل' : 'منع الرصيد السالب معطّل'}
              </p>
            </div>
          </motion.div>

          {/* Carry Forward Card */}
          {treasurySettings && requirePermission('accounts.treasury.carry_forward') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className={`${autoCarryForwardEnabled ? 'bg-gray-100 border border-gray-300' : 'bg-blue-100 border border-blue-300'} rounded-xl p-6 shadow-lg`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium ${autoCarryForwardEnabled ? 'text-gray-700' : 'text-blue-900'}`}>ترحيل الأرصدة</h3>
                <TrendingUp className={`w-5 h-5 ${autoCarryForwardEnabled ? 'text-gray-400' : 'text-blue-600'}`} />
              </div>
              {autoCarryForwardEnabled ? (
                <p className="text-sm text-gray-600">
                  الترحيل التلقائي مفعّل. لا يمكن الترحيل اليدوي أثناء تفعيل الترحيل التلقائي.
                </p>
              ) : (
                <>
                  <p className="text-sm text-blue-700 mb-4">
                    ترحيل رصيد الخزنة لفترة محاسبية جديدة
                  </p>
                  <button
                    onClick={() => setShowCarryForwardModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm w-full shadow-lg shadow-blue-500/30"
                  >
                    ترحيل رصيد الخزنة
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            آخر العمليات التي تمت على الخزنة
          </h3>
          <div className={`overflow-x-auto relative min-h-[200px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [scrollbar-gutter:stable] ${limit > 10 ? 'max-h-[500px] overflow-y-auto' : 'overflow-y-hidden'}`}>
            <table className="w-full relative">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    التاريخ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    البيان
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    النوع
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    المبلغ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    الرصيد بعد العملية
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    رقم السند
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : transactionsWithCorrectBalances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      لا توجد عمليات
                    </td>
                  </tr>
                ) : (
                  transactionsWithCorrectBalances.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors scroll-item"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ar })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {getTransactionDescription(transaction)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'IN'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                        >
                          {transaction.type === 'IN' ? (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              دخل
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3" />
                              خرج
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {parseFloat(String(transaction.amount)).toFixed(2)} ريال
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {transaction.calculatedBalanceAfter.toFixed(2)} ريال
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {transaction.voucher?.code || transaction.vouchers?.code || '-'}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {transactions.length >= 10 && limit < 30 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <TrendingDown className="w-4 h-4" />
                تحميل المزيد
              </button>
            </div>
          )}
        </motion.div>

        {showOpeningModal && (
          <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  فتح رصيد أول المدة
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  تنبيه: يمكن تعيين رصيد أول المدة مرة واحدة فقط
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الرصيد الافتتاحي
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowOpeningModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSetOpening}
                    className="btn-primary"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}

        {/* Carry Forward Modal */}
        <CarryForwardModal
          isOpen={showCarryForwardModal}
          onClose={() => setShowCarryForwardModal(false)}
          onConfirm={handleCarryForward}
          currentBalance={treasury ? parseFloat(String(treasury.currentBalance || treasury.current_balance || 0)) : 0}
          title="ترحيل رصيد الخزنة"
        />

      </div>
    </PageTransition>
  );
}