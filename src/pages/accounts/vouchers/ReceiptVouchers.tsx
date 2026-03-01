import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { Plus, Edit, Trash2, Eye, X, Save, TrendingDown, Search, ChevronDown, AlertTriangle, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import VoucherPrint from '@/components/VoucherPrint';
import VoucherSuccessModal from '@/components/modals/VoucherSuccessModal';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import ModalOverlay from '@/components/ui/ModalOverlay';

const receiptSchema = z.object({
  party_type: z.enum(['customer', 'other', 'customer_group'], { message: 'نوع الطرف مطلوب' }).refine(val => val !== '' as any, 'يجب اختيار نوع الطرف'),
  party_id: z.string().optional(),
  party_name: z.string().optional(),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  method: z.enum(['cash', 'bank'], { message: 'طريقة الدفع مطلوبة' }),
  bank_account_id: z.string().optional(),
  reference_number: z.string().optional(),
  note: z.string().min(1, 'تفاصيل القبض مطلوبة'),
  date: z.string(),
  has_bank_fees: z.boolean().optional(),
  actual_amount_received: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.party_type === 'customer' && !data.party_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب اختيار العميل',
      path: ['party_id'],
    });
  }
  if (data.party_type === 'customer_group' && !data.party_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب اختيار المجموعة',
      path: ['party_id'],
    });
  }
  if (data.party_type === 'other' && !data.party_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب إدخال اسم الطرف',
      path: ['party_name'],
    });
  }
  if (data.method === 'bank' && !data.bank_account_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب اختيار الحساب البنكي عند اختيار طريقة الدفع البنكي',
      path: ['bank_account_id'],
    });
  }
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface Customer {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  account_no: string;
  accountNo?: string;
  bank?: { name: string };
  banks?: { name: string };
}

interface CustomerGroupItem {
  id: string;
  name: string;
  customers: Array<{ id: string; name: string; currentBalance?: number }>;
  customerCount: number;
  totalBalance: number;
}

interface Voucher {
  id: string;
  code: string;
  party_type: string;
  partyType?: string;
  party_id?: string;
  partyId?: string;
  party_name: string;
  partyName?: string;
  method: string;
  amount: number;
  date: string;
  note: string;
  bank_account_id?: string;
  bankAccountId?: string;
  reference_number?: string;
  referenceNumber?: string;
  bank_accounts?: { account_no: string; banks: { name: string } };
  bankAccounts?: { accountNo: string; bank: { name: string } };
  linkedVoucher?: { id: string; code: string; type: string };
  linkedByVoucher?: { id: string; code: string; type: string };
}

export default function ReceiptVouchers() {
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(10);
  const [previewVoucher, setPreviewVoucher] = useState<Voucher | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdVoucher, setCreatedVoucher] = useState<{ id: string; code: string } | null>(null);

  // Customer group state
  const [customerGroups, setCustomerGroups] = useState<CustomerGroupItem[]>([]);
  const [groupDistribution, setGroupDistribution] = useState<Array<{ customerId: string; customerName: string; amount: number; balance: number }>>([]);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'cash',
      party_type: '' as any,
    },
  });

  // Searchable customer dropdown state
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  // Simple custom dropdown state (no search, visual only)
  const [isPartyTypeDropdownOpen, setIsPartyTypeDropdownOpen] = useState(false);
  const partyTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const methodDropdownRef = useRef<HTMLDivElement>(null);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  const partyType = watch('party_type');
  const method = watch('method');
  const hasBankFees = watch('has_bank_fees');
  const watchedAmount = watch('amount');
  const watchedActualAmount = watch('actual_amount_received');
  const calculatedFee = hasBankFees && watchedAmount && watchedActualAmount && watchedActualAmount < watchedAmount
    ? (watchedAmount - watchedActualAmount).toFixed(2)
    : null;

  useEffect(() => {
    loadVouchers(10);
    loadCustomers();
    loadBankAccounts();
    loadCustomerGroups();
  }, []);

  // Reset distribution amounts when total amount changes
  useEffect(() => {
    if (groupDistribution.length > 0) {
      setGroupDistribution(prev => prev.map(d => ({ ...d, amount: 0 })));
    }
  }, [watchedAmount]);

  // Close // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (partyTypeDropdownRef.current && !partyTypeDropdownRef.current.contains(event.target as Node)) {
        setIsPartyTypeDropdownOpen(false);
      }
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(event.target as Node)) {
        setIsMethodDropdownOpen(false);
      }
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
        setIsBankDropdownOpen(false);
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
    if (isCustomerDropdownOpen && customerSearchInputRef.current) {
      customerSearchInputRef.current.focus();
    }
  }, [isCustomerDropdownOpen]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedPartyId = watch('party_id');
  const selectedCustomerName = customers.find(c => c.id === selectedPartyId)?.name || '';

  const handleSelectCustomer = (customerId: string) => {
    setValue('party_id', customerId, { shouldValidate: true });
    setIsCustomerDropdownOpen(false);
    setCustomerSearch('');
  };

  const loadVouchers = async (currentLimit: number = 10) => {
    try {
      const response = await apiClient.getVouchers({ type: 'RECEIPT', limit: currentLimit });
      if (response.data) {
        setVouchers(response.data);
      }
    } catch (error) {
      console.error('Error loading vouchers:', error);
    }
  };

  const handleLoadMore = () => {
    const newLimit = 30;
    setLimit(newLimit);
    loadVouchers(newLimit);
  };

  const loadCustomers = async () => {
    try {
      const response = await apiClient.getCustomers({ limit: 0 });
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const response = await apiClient.getBankAccounts();
      if (response.data && Array.isArray(response.data)) {
        setBankAccounts(response.data);
      } else if (Array.isArray(response)) {
        setBankAccounts(response);
      } else {

        setBankAccounts([]);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
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

  const handleSelectGroup = async (group: CustomerGroupItem) => {
    setValue('party_id', group.id, { shouldValidate: true });
    setIsGroupDropdownOpen(false);
    // Fetch detailed group data with balances
    try {
      const details = await apiClient.getCustomerGroup(group.id);
      setGroupDistribution(
        (details.customers || []).map((c: any) => ({
          customerId: c.id,
          customerName: c.name,
          amount: 0,
          balance: c.currentBalance || 0,
        }))
      );
    } catch {
      // Fallback without balances
      setGroupDistribution(
        group.customers.map((c) => ({ customerId: c.id, customerName: c.name, amount: 0, balance: 0 }))
      );
    }
  };

  const updateDistributionAmount = (customerId: string, amount: number) => {
    setGroupDistribution((prev) =>
      prev.map((item) =>
        item.customerId === customerId ? { ...item, amount } : item
      )
    );
  };

  const distributeEvenly = () => {
    const total = watchedAmount || 0;
    if (groupDistribution.length === 0) return;
    const perCustomer = Math.floor((total / groupDistribution.length) * 100) / 100;
    const remainder = total - perCustomer * groupDistribution.length;
    setGroupDistribution((prev) =>
      prev.map((item, i) => ({
        ...item,
        amount: i === 0 ? perCustomer + Math.round(remainder * 100) / 100 : perCustomer,
      }))
    );
  };

  const distributeByDebt = () => {
    const total = watchedAmount || 0;
    if (groupDistribution.length === 0 || total <= 0) return;
    // Only distribute to customers with positive (debit) balances
    const debtors = groupDistribution.filter((d) => d.balance > 0);
    const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);

    if (totalDebt <= 0) {
      // No debts — fall back to even distribution
      distributeEvenly();
      return;
    }

    if (total >= totalDebt) {
      // Enough to cover all debts — each customer gets their full debt
      setGroupDistribution((prev) =>
        prev.map((item) => ({
          ...item,
          amount: item.balance > 0 ? item.balance : 0,
        }))
      );
    } else {
      // Not enough — distribute proportionally based on debt
      setGroupDistribution((prev) => {
        let remaining = total;
        return prev.map((item, i) => {
          if (item.balance <= 0) return { ...item, amount: 0 };
          const proportion = item.balance / totalDebt;
          const share = i === debtors.length - 1
            ? Math.round(remaining * 100) / 100
            : Math.floor(proportion * total * 100) / 100;
          remaining -= share;
          return { ...item, amount: share };
        });
      });
    }
  };

  const onSubmit = async (data: ReceiptFormData) => {
    if (!user) return;

    try {
      setLoading(true);

      if (editingVoucher) {
        // For update, don't send type (it cannot be changed)
        const updateData = {
          partyType: data.party_type.toUpperCase(),
          partyId: data.party_type === 'customer' ? data.party_id : null,
          partyName: data.party_type === 'customer'
            ? customers.find(c => c.id === data.party_id)?.name
            : data.party_name,
          method: data.method === 'cash' ? 'CASH' : 'BANK_TRANSFER',
          bankAccountId: data.method === 'bank' ? data.bank_account_id : null,
          referenceNumber: data.method === 'bank' ? data.reference_number : null,
          amount: data.amount,
          note: data.note || null,
          date: new Date(data.date).toISOString(),
        };


        await apiClient.updateVoucher(editingVoucher.id, updateData);
        showSuccess('تم تحديث سند القبض بنجاح');
      } else {
        // For create, include type
        const voucherData: any = {
          type: 'RECEIPT',
          partyType: data.party_type === 'customer_group' ? 'CUSTOMER_GROUP' : data.party_type.toUpperCase(),
          partyId: (data.party_type === 'customer' || data.party_type === 'customer_group') ? data.party_id : null,
          partyName: data.party_type === 'customer'
            ? customers.find(c => c.id === data.party_id)?.name
            : data.party_type === 'customer_group'
              ? customerGroups.find(g => g.id === data.party_id)?.name
              : data.party_name,
          method: data.method === 'cash' ? 'CASH' : 'BANK_TRANSFER',
          bankAccountId: data.method === 'bank' ? data.bank_account_id : null,
          referenceNumber: data.method === 'bank' ? data.reference_number : null,
          amount: data.amount,
          note: data.note || null,
          date: new Date(data.date).toISOString(),
        };

        // Add bank fees fields if applicable
        if (data.has_bank_fees && data.method === 'bank' && data.actual_amount_received) {
          voucherData.hasBankFees = true;
          voucherData.actualAmountReceived = data.actual_amount_received;
        }

        // Add group distribution for customer groups
        if (data.party_type === 'customer_group' && groupDistribution.length > 0) {
          const distTotal = groupDistribution.reduce((sum, d) => sum + d.amount, 0);
          if (Math.abs(distTotal - data.amount) > 0.01) {
            showError(`مجموع التوزيع (${distTotal.toFixed(2)}) لا يساوي المبلغ الإجمالي (${data.amount.toFixed(2)})`);
            setLoading(false);
            return;
          }
          voucherData.groupDistribution = groupDistribution
            .filter(d => d.amount > 0)
            .map(d => ({ customerId: d.customerId, amount: d.amount }));
        }


        const response = await apiClient.createVoucher(voucherData);
        // Close the form before showing success modal
        setShowModal(false);
        setEditingVoucher(null);
        setGroupDistribution([]);
        reset();
        // Set data for success modal — group receipt returns different response shape
        if (response.vouchers && response.vouchers.length > 0) {
          // Group receipt: use first voucher for the success modal
          setCreatedVoucher({ id: response.vouchers[0].id, code: response.vouchers[0].code });
          showSuccess(`تم إنشاء ${response.vouchersCount} سند قبض لمجموعة "${response.groupName}" بنجاح`);
          loadVouchers();
        } else {
          setCreatedVoucher({ id: response.id, code: response.code });
          setShowSuccessModal(true);
        }
      }

      // Reload vouchers only for updates
      // For new vouchers, the success modal will handle reload on close
      if (editingVoucher) {
        loadVouchers();
      }
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message;
      const displayMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || error.message;
      showError(`حدث خطأ أثناء حفظ سند القبض: ${displayMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);

    const partyType = (voucher.partyType || voucher.party_type || 'customer').toLowerCase() as 'customer' | 'other';
    const method = voucher.method?.toLowerCase() === 'cash' || voucher.method?.toLowerCase() === 'نقدي' ? 'cash' : 'bank';

    reset({
      party_type: partyType,
      party_id: partyType === 'customer' ? (voucher.partyId || voucher.party_id) : undefined,
      party_name: partyType === 'other' ? (voucher.partyName || voucher.party_name) : undefined,
      method: method as 'cash' | 'bank',
      bank_account_id: (voucher.bankAccountId || voucher.bank_account_id) || undefined,
      reference_number: (voucher.referenceNumber || voucher.reference_number) || undefined,
      amount: parseFloat(String(voucher.amount)),
      note: voucher.note || '',
      date: format(new Date(voucher.date), 'yyyy-MM-dd'),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, voucher?: Voucher) => {
    const linked = voucher?.linkedVoucher || voucher?.linkedByVoucher;
    const isGroupReceipt = !!(voucher as any)?.groupReceiptId;
    const confirmMessage = isGroupReceipt
      ? 'هذا السند جزء من سند قبض جماعي. سيتم حذف جميع السندات المرتبطة بنفس المجموعة. هل تريد المتابعة؟'
      : linked
        ? `هذا السند مرتبط محاسبيا بسند ${linked.type === 'RECEIPT' ? 'قبض' : 'صرف'} اخر رقم ${linked.code} في حال التاكيد سيتم حذف السندين معا`
        : 'هل أنت متأكد من حذف هذا السند؟';

    showConfirm(
      confirmMessage,
      async () => {
        try {
          await apiClient.deleteVoucher(id);
          showSuccess('تم حذف السند بنجاح');
          loadVouchers();
        } catch (error) {
          console.error('Error deleting voucher:', error);
          showError('حدث خطأ أثناء حذف السند');
        }
      }
    );
  };

  const openNewVoucherModal = () => {
    setEditingVoucher(null);
    reset({
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'cash',
      party_type: '' as any,
      has_bank_fees: false,
      actual_amount_received: undefined,
    });
    setCustomerSearch('');
    setIsCustomerDropdownOpen(false);
    setIsPartyTypeDropdownOpen(false);
    setIsMethodDropdownOpen(false);
    setIsBankDropdownOpen(false);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          آخر السندات التي تم إصدارها
        </h3>
        {canCreate('accounts.vouchers_receipt') && (
          <button
            onClick={openNewVoucherModal}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            سند قبض جديد
          </button>
        )}
      </div>

      <div className={`overflow-x-auto relative min-h-[200px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [scrollbar-gutter:stable] ${limit > 10 ? 'max-h-[500px] overflow-y-auto' : 'overflow-y-hidden'}`}>
        <table className="w-full relative">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                رقم السند
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                التاريخ
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                الطرف
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                الطريقة
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                المبلغ
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  لا توجد سندات قبض
                </td>
              </tr>
            ) : (
              vouchers.map((voucher, index) => (
                <motion.tr
                  key={voucher.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                    {voucher.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(voucher.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {voucher.partyName || voucher.party_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${voucher.method?.toUpperCase() === 'CASH'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        }`}
                    >
                      {voucher.method?.toUpperCase() === 'CASH' ? 'نقدي' : 'تحويل بنكي'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">
                    {parseFloat(String(voucher.amount)).toFixed(2)} ريال
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewVoucher(voucher)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="معاينة وطباعة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit('accounts.vouchers_receipt') && (
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete('accounts.vouchers_receipt') && (
                        <button
                          onClick={() => handleDelete(voucher.id, voucher)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {vouchers.length >= 10 && limit < 30 && (
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

      {showModal && (
        <ModalOverlay>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700/50">
            <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3.5 flex items-center justify-between z-10">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingVoucher ? 'تعديل سند قبض' : 'سند قبض جديد'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
              <form id="receipt-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Row 1: Party Type + Customer/Other */}
                <div className="grid grid-cols-2 gap-4">
                  <div ref={partyTypeDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      نوع الطرف <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPartyTypeDropdownOpen(!isPartyTypeDropdownOpen)}
                      className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                      ${isPartyTypeDropdownOpen
                          ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    >
                      <span className={`truncate ${!partyType ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                        {partyType === 'customer' ? 'عميل' : partyType === 'customer_group' ? 'مجموعة عملاء' : partyType === 'other' ? 'أخرى' : 'اختر نوع الطرف'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isPartyTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isPartyTypeDropdownOpen && (
                      <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                        style={{ animation: 'dropdownIn 0.15s ease-out' }}
                      >
                        <ul className="py-1">
                          {[
                            { value: 'customer', label: 'عميل' },
                            { value: 'customer_group', label: 'مجموعة عملاء' },
                            { value: 'other', label: 'أخرى' },
                          ].map((opt) => (
                            <li key={opt.value}>
                              <button
                                type="button"
                                onClick={() => {
                                  setValue('party_type', opt.value as any, { shouldValidate: true });
                                  setValue('party_id', '', { shouldValidate: false });
                                  setGroupDistribution([]);
                                  setCustomerSearch('');
                                  setIsPartyTypeDropdownOpen(false);
                                }}
                                className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                ${partyType === opt.value
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {partyType === 'customer' ? (
                    <div ref={customerDropdownRef} className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        العميل <span className="text-red-500">*</span>
                      </label>
                      {/* Custom Searchable Customer Dropdown */}
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                        ${isCustomerDropdownOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      >
                        <span className={`truncate ${!selectedPartyId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                          {selectedCustomerName || 'اختر العميل'}
                        </span>
                        <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                          {selectedPartyId && (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setValue('party_id', '', { shouldValidate: true });
                                setCustomerSearch('');
                              }}
                              className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                          )}
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Dropdown Panel */}
                      {isCustomerDropdownOpen && (
                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                          style={{ animation: 'dropdownIn 0.15s ease-out' }}
                        >
                          {/* Search Input */}
                          <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                            <div className="relative">
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                ref={customerSearchInputRef}
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
                                    ${customer.id === selectedPartyId
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
                      {errors.party_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.party_id.message}</p>
                      )}
                    </div>
                  ) : partyType === 'customer_group' ? (
                    <div ref={groupDropdownRef} className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        المجموعة <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                        ${isGroupDropdownOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      >
                        <span className={`truncate ${!selectedPartyId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                          {customerGroups.find(g => g.id === selectedPartyId)?.name || 'اختر المجموعة'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isGroupDropdownOpen && (
                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                          style={{ animation: 'dropdownIn 0.15s ease-out' }}
                        >
                          <ul className="py-1 max-h-60 overflow-y-auto">
                            {customerGroups.length > 0 ? (
                              customerGroups.map((group) => (
                                <li key={group.id}>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectGroup(group)}
                                    className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                    ${group.id === selectedPartyId
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{group.name}</span>
                                      <span className="text-xs text-gray-400">{group.customerCount} عميل</span>
                                    </div>
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                لا توجد مجموعات
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      {errors.party_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.party_id.message}</p>
                      )}
                    </div>
                  ) : partyType === 'other' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        اسم الطرف <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('party_name')}
                        required
                        disabled={!partyType}
                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('يرجى إدخال اسم الطرف')}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {errors.party_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.party_name.message}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        الطرف <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        اختر نوع الطرف أولاً
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700/50"></div>

                {/* Row 2: Date + Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      التاريخ
                    </label>
                    <input
                      type="date"
                      {...register('date')}
                      max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      المبلغ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      {...register('amount', { valueAsNumber: true })}
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('يرجى إدخال المبلغ')}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700/50"></div>

                {/* Row 3: Payment Method + Bank Account */}
                <div className="grid grid-cols-2 gap-4">
                  <div ref={methodDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      طريقة الدفع <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                      className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                      ${isMethodDropdownOpen
                          ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    >
                      <span>{method === 'bank' ? 'تحويل بنكي' : 'نقدي'}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isMethodDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isMethodDropdownOpen && (
                      <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                        style={{ animation: 'dropdownIn 0.15s ease-out' }}
                      >
                        <ul className="py-1">
                          {[
                            { value: 'cash', label: 'نقدي' },
                            { value: 'bank', label: 'تحويل بنكي' },
                          ].map((opt) => (
                            <li key={opt.value}>
                              <button
                                type="button"
                                onClick={() => {
                                  setValue('method', opt.value as any, { shouldValidate: true });
                                  setIsMethodDropdownOpen(false);
                                }}
                                className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                ${method === opt.value
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Re-implementing Bank Row to be cleaner - New Row 4 */}
                <AnimatePresence>
                  {method === 'bank' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div ref={bankDropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          الحساب البنكي <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                          className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                          ${isBankDropdownOpen
                              ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                            }
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                        >
                          <span className={`truncate ${!watch('bank_account_id') ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                            {(() => {
                              const selectedBankId = watch('bank_account_id');
                              const selectedBank = bankAccounts.find(a => a.id === selectedBankId);
                              return selectedBank
                                ? `${selectedBank.bank?.name || selectedBank.banks?.name || 'بنك'} - ${selectedBank.accountNo || selectedBank.account_no}`
                                : 'اختر الحساب';
                            })()}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isBankDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isBankDropdownOpen && (
                          <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                            style={{ animation: 'dropdownIn 0.15s ease-out' }}
                          >
                            <ul className="py-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: '224px' }}>
                              {bankAccounts.length > 0 ? (
                                bankAccounts.map((account) => (
                                  <li key={account.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setValue('bank_account_id', account.id, { shouldValidate: true });
                                        setIsBankDropdownOpen(false);
                                      }}
                                      className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                      ${watch('bank_account_id') === account.id
                                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                        }`}
                                    >
                                      {(account.bank?.name || account.banks?.name || 'بنك')} - {account.accountNo || account.account_no}
                                    </button>
                                  </li>
                                ))
                              ) : (
                                <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                  لا توجد حسابات بنكية متاحة
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                        {errors.bank_account_id && (
                          <p className="text-red-500 text-sm mt-1">{errors.bank_account_id.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          رقم المرجع (اختياري)
                        </label>
                        <input
                          type="text"
                          {...register('reference_number')}
                          placeholder="أدخل رقم المرجع"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bank Fees Section - Only when method is bank */}
                <AnimatePresence>
                  {method === 'bank' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="border-t border-gray-100 dark:border-gray-700/50"></div>

                      {/* Toggle: Has bank fees */}
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('has_bank_fees')}
                            onChange={(e) => {
                              setValue('has_bank_fees', e.target.checked, { shouldValidate: true });
                              if (!e.target.checked) {
                                setValue('actual_amount_received', undefined);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300/20 dark:peer-focus:ring-amber-800/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-500 peer-checked:bg-amber-500"></div>
                        </label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          يوجد رسوم تحويل بنكية
                        </span>
                      </div>

                      {/* Actual amount received + fee display */}
                      <AnimatePresence>
                        {hasBankFees && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  المبلغ الفعلي الذي وصل البنك <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  {...register('actual_amount_received', { valueAsNumber: true })}
                                  placeholder="أدخل المبلغ الفعلي"
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  رسوم التحويل البنكية
                                </label>
                                <div className={`w-full px-4 py-2 border rounded-lg text-sm font-bold ${calculatedFee
                                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                  : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                  }`}>
                                  {calculatedFee ? `${calculatedFee} ريال` : 'سيتم الحساب تلقائياً'}
                                </div>
                              </div>
                            </div>

                            {/* Info box */}
                            {calculatedFee && (
                              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                    <p>سيتم إنشاء <strong>سند قبض</strong> بمبلغ <strong>{watchedAmount?.toFixed(2)}</strong> ريال (إقفال حساب العميل)</p>
                                    <p>سيتم إنشاء <strong>سند صرف تلقائي</strong> بمبلغ <strong>{calculatedFee}</strong> ريال (مصروفات بنكية)</p>
                                    <p>رصيد البنك سيزيد بـ <strong>{watchedActualAmount?.toFixed(2)}</strong> ريال فقط</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Group Distribution Table — Professional Design */}
                {partyType === 'customer_group' && selectedPartyId && groupDistribution.length > 0 && (
                  <>
                    <div className="border-t border-gray-100 dark:border-gray-700/50"></div>
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-l from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/10 px-4 py-3 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          توزيع المبلغ على العملاء
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={distributeByDebt}
                            disabled={!watchedAmount || watchedAmount <= 0 || !groupDistribution.some(d => d.balance > 0)}
                            className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors disabled:opacity-40 font-medium shadow-sm"
                          >
                            حسب المديونية
                          </button>
                          <button
                            type="button"
                            onClick={distributeEvenly}
                            disabled={!watchedAmount || watchedAmount <= 0}
                            className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-40 font-medium shadow-sm"
                          >
                            بالتساوي
                          </button>
                        </div>
                      </div>

                      {/* Table */}
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">العميل</th>
                            <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">الرصيد</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase w-36">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {groupDistribution.map((item) => (
                            <tr key={item.customerId} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.customerName}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.balance > 0 ? (
                                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                    {item.balance.toFixed(2)} مدين
                                  </span>
                                ) : item.balance < 0 ? (
                                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                    {Math.abs(item.balance).toFixed(2)} دائن
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    0.00
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.amount || ''}
                                  onChange={(e) => updateDistributionAmount(item.customerId, parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-left tabular-nums"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Summary Footer */}
                      {(() => {
                        const distTotal = groupDistribution.reduce((sum, d) => sum + d.amount, 0);
                        const totalAmount = watchedAmount || 0;
                        const diff = totalAmount - distTotal;
                        const isMatch = Math.abs(diff) <= 0.01;
                        return (
                          <div className={`px-4 py-3 flex items-center justify-between border-t ${isMatch
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
                            : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'}`}>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600 dark:text-gray-300">
                                إجمالي التوزيع: <strong className="text-gray-900 dark:text-white tabular-nums">{distTotal.toFixed(2)}</strong>
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="text-gray-600 dark:text-gray-300">
                                المبلغ الكلي: <strong className="text-gray-900 dark:text-white tabular-nums">{totalAmount.toFixed(2)}</strong>
                              </span>
                            </div>
                            {isMatch ? (
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">✓ مطابق</span>
                            ) : (
                              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                المتبقي: {diff.toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* Row 4: Notes */}
                <div className="border-t border-gray-100 dark:border-gray-700/50"></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    وذلك مقابل (تفاصيل القبض) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('note')}
                    required
                    rows={3}
                    placeholder="أدخل تفاصيل القبض"
                    onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('يرجى إدخال تفاصيل القبض')}
                    onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 resize-none"
                  />
                  {errors.note && (
                    <p className="text-red-500 text-sm mt-1">{errors.note.message}</p>
                  )}
                </div>

                {errors.root && (
                  <p className="text-red-500 text-sm">{errors.root.message}</p>
                )}

              </form>
            </div>


            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                form="receipt-form"
              >
                <Save className="w-4 h-4" />
                {loading ? 'جاري الحفظ...' : editingVoucher ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}


      {
        previewVoucher && (
          <VoucherPrint
            voucher={{
              ...previewVoucher,
              type: 'receipt'
            }}
            onClose={() => setPreviewVoucher(null)}
          />
        )
      }

      {
        showSuccessModal && createdVoucher && (
          <VoucherSuccessModal
            isOpen={showSuccessModal}
            voucherCode={createdVoucher.code}
            voucherId={createdVoucher.id}
            voucherType="receipt"
            onClose={() => {
              setShowSuccessModal(false);
              setCreatedVoucher(null);
              setShowModal(false);
              setEditingVoucher(null);
              reset();
              loadVouchers();
            }}
            onPreview={async (id) => {
              try {
                const voucher = await apiClient.getVoucher(id);
                setPreviewVoucher(voucher);
              } catch (error) {
                console.error('Error loading voucher:', error);
                showError('حدث خطأ أثناء تحميل بيانات السند');
              }
            }}
            onPrint={async (id) => {
              try {
                const voucher = await apiClient.getVoucher(id);
                setPreviewVoucher(voucher);
                // Wait for the preview to render, then trigger print
                setTimeout(() => {
                  const printButton = document.querySelector('.print-container button') as HTMLButtonElement;
                  if (printButton) {
                    printButton.click();
                  }
                }, 500);
              } catch (error) {
                console.error('Error loading voucher:', error);
                showError('حدث خطأ أثناء تحميل بيانات السند');
              }
            }}
          />
        )
      }
    </div >
  );
}