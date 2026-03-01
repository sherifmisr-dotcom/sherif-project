import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '@/components/ui/PageTransition';
import { apiClient } from '@/lib/api';
import { Plus, Edit, Trash2, X, Save, Building2, TrendingUp, TrendingDown, ChevronDown, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CarryForwardModal from '@/components/modals/CarryForwardModal';
import ModalOverlay from '@/components/ui/ModalOverlay';

// Schema for creating new account
const createAccountSchema = z.object({
  bank_name: z.string().min(1, 'اسم البنك مطلوب'),
  account_no: z.string().min(1, 'رقم الحساب مطلوب'),
  opening_balance: z.number().min(0, 'الرصيد الافتتاحي مطلوب'),
});

// Schema for editing account (only bank_name is editable)
const editAccountSchema = z.object({
  bank_name: z.string().min(1, 'اسم البنك مطلوب'),
});


type BankAccountFormData = { bank_name: string; account_no: string; opening_balance?: number };

interface Bank {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  account_no: string;
  accountNo?: string;
  opening_balance: number;
  openingBalance?: number;
  openingBalanceDate?: string;
  carryForwardNote?: string;
  isInitialBalance?: boolean;
  current_balance: number;
  currentBalance?: number;
  is_active: boolean;
  isActive?: boolean;
  bank?: { name: string };
  banks?: { name: string };
}

export default function BankAccounts() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [autoCarryForwardEnabled, setAutoCarryForwardEnabled] = useState(false);
  const [limit, setLimit] = useState(10);
  const { canCreate, canEdit, canDelete, requirePermission } = usePermissions();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(editingAccount ? editAccountSchema : createAccountSchema) as any,
    defaultValues: {
      opening_balance: 0,
    },
  });

  useEffect(() => {
    loadBanks();
    loadAccounts();
    loadTransactions(10);
    loadAutoCarryForwardStatus();
  }, []);

  useScrollLock(showModal);

  const loadBanks = async () => {
    try {
      const response = await apiClient.getBanks();
      if (response.data) {
        setBanks(response.data);
      }
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await apiClient.getBankAccounts();
      if (response.data) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadTransactions = async (currentLimit: number) => {
    try {
      const response = await apiClient.getBankTransactions({ limit: currentLimit });
      if (response.transactions) {
        setTransactions(response.transactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  // Calculate correct balances for displayed transactions
  const transactionsWithCorrectBalances = useMemo(() => {
    if (transactions.length === 0 || accounts.length === 0) return [];

    // Create a map of account balances by account number
    const accountBalancesByNo = new Map<string, number>();
    accounts.forEach(account => {
      const balance = parseFloat(String(account.currentBalance ?? account.current_balance ?? 0));
      const accountNo = account.accountNo ?? account.account_no;
      if (accountNo) {
        accountBalancesByNo.set(accountNo, balance);
      }
    });

    // Group transactions by account number
    const transactionsByAccount = new Map<string, any[]>();
    transactions.forEach((tx: any, index) => {
      const accountNo = tx.accountNo;
      if (!transactionsByAccount.has(accountNo)) {
        transactionsByAccount.set(accountNo, []);
      }
      transactionsByAccount.get(accountNo)!.push({ ...tx, originalIndex: index });
    });

    // Calculate balances for each account's transactions
    const transactionsWithBalances = new Map<number, any>();

    transactionsByAccount.forEach((accountTransactions, accountNo) => {
      let currentBalance = accountBalancesByNo.get(accountNo) ?? 0;

      // Process transactions from newest to oldest (they're already sorted)
      accountTransactions.forEach((transaction) => {
        const balanceAfter = currentBalance;

        // Calculate balance before this transaction
        if (transaction.type === 'IN') {
          currentBalance = currentBalance - parseFloat(String(transaction.amount));
        } else {
          currentBalance = currentBalance + parseFloat(String(transaction.amount));
        }

        // Remove originalIndex before storing
        const { originalIndex, ...cleanTx } = transaction;
        transactionsWithBalances.set(originalIndex, {
          ...cleanTx,
          balanceAfter: balanceAfter,
        });
      });
    });

    // Restore original order
    return transactions.map((_, index) => {
      const tx = transactionsWithBalances.get(index);
      if (!tx) {
        return {
          ...transactions[index],
          balanceAfter: 0,
        };
      }
      return tx;
    });
  }, [transactions, accounts]);

  const handleLoadMore = () => {
    const newLimit = 30; // Or increment by 10, but user asked for "like Treasury" which seemed to jump to 30 or similar.
    // Actually Treasury does setLimit(30). I will follow that pattern or check standard.
    // Treasury logic: const newLimit = 30; setLimit(newLimit); loadTransactions(newLimit);
    setLimit(newLimit);
    loadTransactions(newLimit);
  };

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      setLoading(true);

      // Check for duplicate account number
      const accountNoToCheck = editingAccount ? (editingAccount.accountNo || editingAccount.account_no) : data.account_no;
      const duplicateAccount = accounts.find(
        (acc) =>
          acc.account_no === accountNoToCheck &&
          (!editingAccount || acc.id !== editingAccount.id)
      );

      if (duplicateAccount) {
        showError('رقم الحساب موجود مسبقاً');
        setLoading(false);
        return;
      }

      // Find or create bank
      let bank = banks.find((b) => b.name === data.bank_name);

      if (!bank) {
        // Create new bank
        const newBank = await apiClient.createBank({ name: data.bank_name });
        bank = newBank;
        await loadBanks(); // Reload banks list
      }

      // Ensure bank is defined
      if (!bank) {
        showError('حدث خطأ في إنشاء البنك');
        setLoading(false);
        return;
      }

      const accountData = {
        bankId: bank.id,
        accountNo: data.account_no,
        openingBalance: data.opening_balance || 0,
      };



      if (editingAccount) {
        // For update, send bankId to update bank name
        const updateData = {
          bankId: bank.id,
        };

        await apiClient.updateBankAccount(editingAccount.id, updateData);
        showSuccess('تم تحديث الحساب البنكي بنجاح');
      } else {
        // For create, send full data

        await apiClient.createBankAccount(accountData);
        showSuccess('تم إضافة الحساب البنكي بنجاح');
      }

      setShowModal(false);
      setEditingAccount(null);
      reset();
      loadAccounts();
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message;
      const displayMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || error.message;
      showError(`حدث خطأ أثناء حفظ الحساب البنكي: ${displayMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: BankAccount) => {
    if (!requirePermission('accounts.bank_accounts.edit')) return;
    setEditingAccount(account);
    reset({
      bank_name: account.bank?.name || account.banks?.name || '',
      account_no: account.account_no,
      opening_balance: parseFloat(String(account.opening_balance)),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!requirePermission('accounts.bank_accounts.delete')) return;

    showConfirm(
      'هل أنت متأكد من حذف هذا الحساب البنكي؟',
      async () => {
        try {
          await apiClient.deleteBankAccount(id);
          showSuccess('تم حذف الحساب بنجاح');
          loadAccounts();
        } catch (error: any) {
          console.error('Error deleting account:', error);
          const errorMsg = error.response?.data?.message;
          if (errorMsg) {
            showError(errorMsg);
          } else {
            showError('حدث خطأ أثناء حذف الحساب');
          }
        }
      }
    );
  };

  const openNewAccountModal = () => {
    setEditingAccount(null);
    reset({ opening_balance: 0 });
    setShowModal(true);
  };

  const toggleCard = (accountId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const handleCarryForwardAll = async (data: { periodType: 'MONTH' | 'YEAR'; newPeriodStartDate: string }) => {
    try {
      await apiClient.carryForwardAllBankAccounts(data);
      showSuccess('تم ترحيل أرصدة جميع الحسابات بنجاح');
      loadAccounts();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'حدث خطأ أثناء ترحيل الأرصدة';
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

  return (
    <PageTransition>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between flex-wrap gap-3"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            الحسابات البنكية
          </h2>
          <div className="flex gap-2">
            {accounts.length > 0 && (
              <button
                onClick={() => {
                  if (autoCarryForwardEnabled) {
                    showError('الترحيل التلقائي مفعّل حالياً. يرجى تعطيله أولاً من الإعدادات قبل الترحيل اليدوي.');
                    return;
                  }
                  setShowCarryForwardModal(true);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm shadow-lg flex items-center gap-2 transition-colors ${autoCarryForwardEnabled
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-gray-300/30'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                  }`}
              >
                <TrendingUp className="w-4 h-4" />
                ترحيل جميع الأرصدة
              </button>
            )}
            {canCreate('accounts.bank_accounts') && (
              <button
                onClick={openNewAccountModal}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                إضافة حساب بنكي
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {accounts.map((account, index) => {
            const isExpanded = expandedCards.has(account.id);
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={account.id}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                {/* Header - Always Visible */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {account.bank?.name || account.banks?.name || 'غير محدد'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {account.accountNo || account.account_no || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit('accounts.bank_accounts') && (
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {canDelete('accounts.bank_accounts') && (
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleCard(account.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all"
                        title={isExpanded ? 'طي' : 'توسيع'}
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Details */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-600">
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-600/30 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            الرصيد الافتتاحي
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {parseFloat(String(account.openingBalance || account.opening_balance || 0)).toFixed(2)} ريال
                          </span>
                        </div>
                        {account.openingBalanceDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(account.openingBalanceDate), 'dd/MM/yyyy', { locale: ar })}</span>
                          </div>
                        )}
                        {account.carryForwardNote && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <FileText className="w-3 h-3" />
                            <span>{account.carryForwardNote}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          الرصيد الحالي
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                          {parseFloat(String(account.currentBalance || account.current_balance || 0)).toFixed(2)} ريال
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">الحالة</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${(account.isActive ?? account.is_active ?? true)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}
                        >
                          {(account.isActive ?? account.is_active ?? true) ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد حسابات بنكية</p>
          </div>
        )}

        {/* Bank Transactions Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-8"
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            آخر العمليات البنكية
          </h3>

          {transactionsWithCorrectBalances.length > 0 ? (
            <>
              <div className={`overflow-x-auto relative min-h-[200px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [scrollbar-gutter:stable] ${limit > 10 ? 'max-h-[500px] overflow-y-auto' : 'overflow-y-hidden'}`}>
                <table className="w-full relative">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">البيان</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">النوع</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">البنك</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">المبلغ</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">الرصيد بعد العملية</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">رقم السند</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactionsWithCorrectBalances.map((tx: any, index: number) => (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(tx.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {tx.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${tx.type === 'IN'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}
                          >
                            {tx.type === 'IN' ? (
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
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          <div>
                            <div className="font-medium">{tx.bankName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{tx.accountNo}</div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${tx.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {tx.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                          {(typeof tx.balanceAfter === 'number' ? tx.balanceAfter : 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                          {tx.voucherCode || '-'}
                        </td>
                      </motion.tr>
                    ))}
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
            </>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">لا توجد عمليات بنكية</p>
            </div>
          )}
        </motion.div>


        {showModal && (
          <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingAccount ? 'تعديل حساب بنكي' : 'إضافة حساب بنكي جديد'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم البنك <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('bank_name')}
                    list="banks-list"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${errors.bank_name
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                      }`}
                  />
                  <datalist id="banks-list">
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رقم الحساب {!editingAccount && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    {...(!editingAccount ? register('account_no') : { value: editingAccount.accountNo || editingAccount.account_no })}
                    readOnly={!!editingAccount}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white read-only:bg-gray-100 dark:read-only:bg-gray-800 read-only:cursor-not-allowed ${!editingAccount && errors.account_no
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الرصيد الافتتاحي {!editingAccount && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...(!editingAccount ? register('opening_balance', { valueAsNumber: true }) : { value: editingAccount.opening_balance || editingAccount.openingBalance || 0 })}
                    readOnly={!!editingAccount}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white read-only:bg-gray-100 dark:read-only:bg-gray-800 read-only:cursor-not-allowed ${!editingAccount && errors.opening_balance
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                      }`}
                  />
                  {editingAccount && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      لا يمكن تعديل الرصيد الافتتاحي بعد إنشاء الحساب
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'جاري الحفظ...' : editingAccount ? 'تحديث' : 'حفظ'}
                  </button>
                </div>
              </form>
            </div>
          </ModalOverlay>
        )}

        {/* Carry Forward Modal */}
        <CarryForwardModal
          isOpen={showCarryForwardModal}
          onClose={() => {
            setShowCarryForwardModal(false);
          }}
          onConfirm={handleCarryForwardAll}
          currentBalance={accounts.reduce((sum, acc) => sum + parseFloat(String(acc.currentBalance || acc.current_balance || 0)), 0)}
          title="ترحيل أرصدة جميع الحسابات البنكية"
        />
      </div>
    </PageTransition >
  );
}