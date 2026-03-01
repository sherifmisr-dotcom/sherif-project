import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { Plus, Edit, Trash2, Eye, X, Save, TrendingDown, Search, ChevronDown, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import VoucherPrint from '@/components/VoucherPrint';
import VoucherSuccessModal from '@/components/modals/VoucherSuccessModal';
import ModalOverlay from '@/components/ui/ModalOverlay';

const paymentSchema = z.object({
  party_type: z.enum(['customer', 'employee', 'agent', 'customs', 'other'], { message: 'نوع الجهة مطلوب' }).refine(val => val !== '' as any, 'يجب اختيار نوع الجهة'),
  party_id: z.string().optional(),
  party_name: z.string().optional(),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  method: z.enum(['cash', 'bank'], { message: 'طريقة الدفع مطلوبة' }),
  bank_account_id: z.string().optional(),
  reference_number: z.string().optional(),
  expense_category_id: z.string().min(1, 'تصنيف المصروف مطلوب'),
  note: z.string().min(1, 'تفاصيل الصرف مطلوبة'),
  date: z.string(),
  has_bank_fees: z.boolean().optional(),
  actual_amount_received: z.number().optional(),
}).superRefine((data, ctx) => {
  if ((data.party_type === 'customer' || data.party_type === 'employee' || data.party_type === 'agent') && !data.party_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب اختيار الجهة',
      path: ['party_id'],
    });
  }
  if (data.party_type === 'other' && !data.party_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب إدخال اسم الجهة',
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

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Customer {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
}

interface BankAccount {
  id: string;
  account_no: string;
  accountNo?: string;
  banks: { name: string };
  bank?: { name: string };
}

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Voucher {
  id: string;
  code: string;
  party_type?: string;
  partyType?: string;
  party_name?: string;
  partyName?: string;
  party_id?: string;
  partyId?: string;
  method: string;
  amount: number;
  date: string;
  note: string;
  expense_categories?: { id: string; name: string };
  category?: { id: string; name: string };
  expenseCategory?: { id: string; name: string };
  categoryId?: string;
  bank_account_id?: string;
  bankAccountId?: string;
  referenceNumber?: string;
  reference_number?: string;
  bank_accounts?: { account_no: string; banks: { name: string } };
  linkedVoucher?: { id: string; code: string; type: string };
  linkedByVoucher?: { id: string; code: string; type: string };
}

export default function PaymentVouchers() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(10);
  const [previewVoucher, setPreviewVoucher] = useState<Voucher | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdVoucher, setCreatedVoucher] = useState<{ id: string; code: string } | null>(null);
  const { canCreate, canEdit, canDelete, requirePermission } = usePermissions();

  // Searchable party dropdown state
  const [partySearch, setPartySearch] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const partySearchInputRef = useRef<HTMLInputElement>(null);

  // Searchable expense category dropdown state
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);

  // Simple custom dropdown state (no search, visual only)
  const [isPartyTypeDropdownOpen, setIsPartyTypeDropdownOpen] = useState(false);
  const partyTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const methodDropdownRef = useRef<HTMLDivElement>(null);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'cash',
      party_type: '' as any,
      party_name: '', // Initialize to prevent controlled/uncontrolled warning
    },
  });

  const partyType = watch('party_type');
  const method = watch('method');
  const hasBankFees = watch('has_bank_fees');
  const watchedAmount = watch('amount');
  const watchedActualAmount = watch('actual_amount_received');
  const calculatedFee = hasBankFees && watchedAmount && watchedActualAmount && watchedActualAmount > watchedAmount
    ? (watchedActualAmount - watchedAmount).toFixed(2)
    : null;

  useEffect(() => {
    loadVouchers(10);
    loadCustomers();
    loadEmployees();
    loadAgents();
    loadBankAccounts();
    loadExpenseCategories();
  }, []);

  // Clear party_name when switching party types
  useEffect(() => {
    if (partyType === 'customs') {
      // When switching TO 'customs', set the fixed name
      setValue('party_name', 'الجمارك');
    } else if (partyType === 'other') {
      // When switching TO 'other', clear the field so user can enter new name
      setValue('party_name', '');
    } else if (partyType) {
      // When switching to customer/employee/agent, clear party_name
      setValue('party_name', '');
    }
  }, [partyType, setValue]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when party dropdown opens
  useEffect(() => {
    if (isPartyDropdownOpen && partySearchInputRef.current) {
      partySearchInputRef.current.focus();
    }
  }, [isPartyDropdownOpen]);

  // Auto-focus search input when category dropdown opens
  useEffect(() => {
    if (isCategoryDropdownOpen && categorySearchInputRef.current) {
      categorySearchInputRef.current.focus();
    }
  }, [isCategoryDropdownOpen]);

  // Reset party dropdown when party type changes
  useEffect(() => {
    setPartySearch('');
    setIsPartyDropdownOpen(false);
  }, [partyType]);

  useScrollLock(showModal);

  const loadVouchers = async (currentLimit: number = 10) => {
    try {
      const response = await apiClient.getVouchers({ type: 'PAYMENT', limit: currentLimit });
      if (response.data) {
        // Backend already returns sorted by date desc
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
      setCustomers(response.data || response || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.getEmployees();
      setEmployees(response.data || response || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await apiClient.getAgents();
      setAgents(response.data || response || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const response = await apiClient.getBankAccounts();
      setBankAccounts(response.data || response || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadExpenseCategories = async () => {
    try {
      const response = await apiClient.getExpenseCategories();
      setExpenseCategories(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error loading expense categories:', error);
    }
  };


  const onSubmit = async (data: PaymentFormData) => {
    if (!user) return;

    try {
      setLoading(true);

      let partyName = data.party_name;
      if (data.party_type === 'customer') {
        partyName = customers.find(c => c.id === data.party_id)?.name;
      } else if (data.party_type === 'employee') {
        partyName = employees.find(e => e.id === data.party_id)?.name;
      } else if (data.party_type === 'agent') {
        partyName = agents.find(a => a.id === data.party_id)?.name;
      } else if (data.party_type === 'customs') {
        partyName = 'الجمارك';
      }

      if (editingVoucher) {
        // For update, don't send type (it cannot be changed)
        const updateData = {
          partyType: data.party_type.toUpperCase(),
          partyId: (data.party_type !== 'other' && data.party_type !== 'customs') ? data.party_id : null,
          partyName,
          method: data.method === 'cash' ? 'CASH' : 'BANK_TRANSFER',
          bankAccountId: data.method === 'bank' ? data.bank_account_id : null,
          referenceNumber: data.method === 'bank' ? data.reference_number : null,
          amount: data.amount,
          categoryId: data.expense_category_id,
          note: data.note || null,
          date: new Date(data.date).toISOString(),
        };

        await apiClient.updateVoucher(editingVoucher.id, updateData);
        showSuccess('تم تحديث سند الصرف بنجاح');
      } else {
        // For create, include type
        const voucherData = {
          type: 'PAYMENT',
          partyType: data.party_type.toUpperCase(),
          partyId: (data.party_type !== 'other' && data.party_type !== 'customs') ? data.party_id : null,
          partyName,
          method: data.method === 'cash' ? 'CASH' : 'BANK_TRANSFER',
          bankAccountId: data.method === 'bank' ? data.bank_account_id : null,
          referenceNumber: data.method === 'bank' ? data.reference_number : null,
          amount: data.amount,
          categoryId: data.expense_category_id,
          note: data.note || null,
          date: new Date(data.date).toISOString(),
          hasBankFees: data.has_bank_fees && data.method === 'bank' ? true : undefined,
          actualAmountReceived: data.has_bank_fees && data.method === 'bank' ? data.actual_amount_received : undefined,
        };

        const response = await apiClient.createVoucher(voucherData);
        // Close the form before showing success modal
        setShowModal(false);
        setEditingVoucher(null);
        reset();
        // Set data for success modal
        setCreatedVoucher({ id: response.id, code: response.code });
        setShowSuccessModal(true);
      }

      // Reload vouchers only for updates
      // For new vouchers, the success modal will handle reload on close
      if (editingVoucher) {
        loadVouchers();
      }
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      showError(error.response?.data?.message || 'حدث خطأ أثناء حفظ سند الصرف');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, voucher?: Voucher) => {
    if (!requirePermission('accounts.vouchers_payment.delete')) return;

    const linked = voucher?.linkedVoucher || voucher?.linkedByVoucher;
    const confirmMessage = linked
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

  const handleEdit = (voucher: Voucher) => {
    if (!requirePermission('accounts.vouchers_payment.edit')) return;
    setEditingVoucher(voucher);
    reset({
      date: format(new Date(voucher.date), 'yyyy-MM-dd'),
      party_type: (voucher.party_type?.toLowerCase() || voucher.partyType?.toLowerCase() || 'customer') as any,
      party_id: voucher.party_id || voucher.partyId || undefined,
      party_name: voucher.party_name || voucher.partyName || undefined,
      amount: parseFloat(String(voucher.amount)),
      method: voucher.method?.toLowerCase() === 'cash' ? 'cash' : 'bank',
      bank_account_id: voucher.bank_account_id || voucher.bankAccountId || undefined,
      reference_number: voucher.referenceNumber || voucher.reference_number || undefined,
      expense_category_id: voucher.category?.id || voucher.expense_categories?.id || voucher.expenseCategory?.id || voucher.categoryId || '',
      note: voucher.note || undefined,
    });
    setShowModal(true);
  };

  const openNewVoucherModal = () => {
    setEditingVoucher(null);
    reset({
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'cash',
      party_type: '' as any,
    });
    setPartySearch('');
    setIsPartyDropdownOpen(false);
    setCategorySearch('');
    setIsCategoryDropdownOpen(false);
    setIsPartyTypeDropdownOpen(false);
    setIsMethodDropdownOpen(false);
    setIsBankDropdownOpen(false);
    setShowModal(true);
  };

  const getPartyOptions = () => {
    switch (partyType) {
      case 'customer':
        return customers.map(c => ({ id: c.id, name: c.name }));
      case 'employee':
        return employees.map(e => ({ id: e.id, name: e.name }));
      case 'agent':
        return agents.map(a => ({ id: a.id, name: a.name }));
      default:
        return [];
    }
  };

  const partyOptions = getPartyOptions();
  const filteredPartyOptions = partyOptions.filter(o =>
    o.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  const selectedPartyId = watch('party_id');
  const selectedPartyName = partyOptions.find(o => o.id === selectedPartyId)?.name || '';

  const getPartyLabel = () => {
    switch (partyType) {
      case 'customer': return 'العميل';
      case 'employee': return 'الموظف';
      case 'agent': return 'الوكيل';
      default: return 'المستفيد';
    }
  };

  const getPartySearchPlaceholder = () => {
    switch (partyType) {
      case 'customer': return 'ابحث عن عميل...';
      case 'employee': return 'ابحث عن موظف...';
      case 'agent': return 'ابحث عن وكيل...';
      default: return 'ابحث...';
    }
  };

  const handleSelectParty = (partyId: string) => {
    setValue('party_id', partyId, { shouldValidate: true });
    setIsPartyDropdownOpen(false);
    setPartySearch('');
  };

  // Expense category dropdown helpers
  const selectedCategoryId = watch('expense_category_id');
  const filteredCategories = expenseCategories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const selectedCategoryName = expenseCategories.find(c => c.id === selectedCategoryId)?.name || '';

  const handleSelectCategory = (categoryId: string) => {
    setValue('expense_category_id', categoryId, { shouldValidate: true });
    setIsCategoryDropdownOpen(false);
    setCategorySearch('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          آخر السندات التي تم إصدارها
        </h3>
        {canCreate('accounts.vouchers_payment') && (
          <button
            onClick={openNewVoucherModal}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            سند صرف جديد
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
                الجهة
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                التصنيف
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
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  لا توجد سندات صرف
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
                  <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
                    {voucher.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(voucher.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {voucher.partyName || voucher.party_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {voucher.category?.name || voucher.expenseCategory?.name || voucher.expense_categories?.name || '-'}
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
                  <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
                    {parseFloat(String(voucher.amount)).toFixed(2)} ريال
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewVoucher(voucher)}
                        className="btn-icon"
                        title="معاينة وطباعة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit('accounts.vouchers_payment') && (
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="btn-icon"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete('accounts.vouchers_payment') && (
                        <button
                          onClick={() => handleDelete(voucher.id, voucher)}
                          className="btn-icon-danger"
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
                {editingVoucher ? 'تعديل سند صرف' : 'سند صرف جديد'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
              <form id="payment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Row 1: Party Type + Party */}
                <div className="grid grid-cols-2 gap-4">
                  <div ref={partyTypeDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      نوع المستفيد <span className="text-red-500">*</span>
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
                        {partyType === 'customer' ? 'عميل' : partyType === 'employee' ? 'موظف' : partyType === 'agent' ? 'وكيل ملاحي' : partyType === 'customs' ? 'هيئة الزكاة والضريبة والجمارك' : partyType === 'other' ? 'أخرى' : 'اختر نوع المستفيد'}
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
                            { value: 'employee', label: 'موظف' },
                            { value: 'agent', label: 'وكيل ملاحي' },
                            { value: 'customs', label: 'هيئة الزكاة والضريبة والجمارك' },
                            { value: 'other', label: 'أخرى' },
                          ].map((opt) => (
                            <li key={opt.value}>
                              <button
                                type="button"
                                onClick={() => {
                                  setValue('party_type', opt.value as any, { shouldValidate: true });
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

                  {/* Party Selection - same row */}
                  {partyType && partyType !== 'other' && partyType !== 'customs' ? (
                    <div ref={partyDropdownRef} className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {getPartyLabel()}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                        ${isPartyDropdownOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      >
                        <span className={`truncate ${!selectedPartyId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                          {selectedPartyName || `اختر ${getPartyLabel()}`}
                        </span>
                        <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                          {selectedPartyId && (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setValue('party_id', '', { shouldValidate: true });
                                setPartySearch('');
                              }}
                              className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                          )}
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isPartyDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isPartyDropdownOpen && (
                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                          style={{ animation: 'dropdownIn 0.15s ease-out' }}
                        >
                          <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                            <div className="relative">
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                ref={partySearchInputRef}
                                type="text"
                                value={partySearch}
                                onChange={(e) => setPartySearch(e.target.value)}
                                placeholder={getPartySearchPlaceholder()}
                                className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                          <ul className="overflow-y-auto py-1 scrollbar-thin" style={{ maxHeight: '280px' }}>
                            {filteredPartyOptions.length > 0 ? (
                              filteredPartyOptions.map((option) => (
                                <li key={option.id}>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectParty(option.id)}
                                    className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                    ${option.id === selectedPartyId
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                      }`}
                                  >
                                    {option.name}
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">لا توجد نتائج</li>
                            )}
                          </ul>
                          {filteredPartyOptions.length > 0 && (
                            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                              <span className="text-xs text-gray-400 dark:text-gray-500">{filteredPartyOptions.length} {getPartyLabel()}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {errors.party_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.party_id.message}</p>
                      )}
                    </div>
                  ) : partyType === 'customs' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        المستفيد <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value="الجمارك"
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      />
                      <input type="hidden" {...register('party_name')} />
                    </div>
                  ) : partyType === 'other' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        اسم المستفيد <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('party_name')}
                        value={watch('party_name') || ''}
                        onChange={(e) => setValue('party_name', e.target.value)}
                        required
                        disabled={!partyType}
                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('يرجى إدخال اسم المستفيد')}
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
                        المستفيد <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        اختر نوع المستفيد أولاً
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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700/50"></div>

                {/* Row 3: Expense Category + Payment Method */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Searchable Expense Category Dropdown */}
                  <div ref={categoryDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      تصنيف المصروف <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                      ${isCategoryDropdownOpen
                          ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    >
                      <span className={`truncate ${!selectedCategoryId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                        {selectedCategoryName || 'اختر التصنيف'}
                      </span>
                      <div className="flex items-center gap-1 mr-2 flex-shrink-0">
                        {selectedCategoryId && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setValue('expense_category_id', '', { shouldValidate: true });
                              setCategorySearch('');
                            }}
                            className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isCategoryDropdownOpen && (
                      <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                        style={{ animation: 'dropdownIn 0.15s ease-out' }}
                      >
                        <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                          <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              ref={categorySearchInputRef}
                              type="text"
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              placeholder="ابحث عن تصنيف..."
                              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                        <ul className="overflow-y-auto py-1 scrollbar-thin" style={{ maxHeight: '224px' }}>
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((category) => (
                              <li key={category.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectCategory(category.id)}
                                  className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                  ${category.id === selectedCategoryId
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                    }`}
                                >
                                  {category.name}
                                </button>
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">لا توجد نتائج</li>
                          )}
                        </ul>
                        {filteredCategories.length > 0 && (
                          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{filteredCategories.length} تصنيف</span>
                          </div>
                        )}
                      </div>
                    )}
                    {errors.expense_category_id && (
                      <p className="text-red-500 text-sm mt-1">{errors.expense_category_id.message}</p>
                    )}
                  </div>

                  <div ref={methodDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      طريقة الصرف <span className="text-red-500">*</span>
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

                {/* Row 4: Bank Account + Reference (only when bank method) */}
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
                          رقم المرجع
                        </label>
                        <input
                          type="text"
                          {...register('reference_number')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                          placeholder="ادخل رقم المرجع"
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

                      {/* Actual amount + fee display */}
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
                                  المبلغ الفعلي المحول من البنك <span className="text-red-500">*</span>
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
                                    <p>سيتم إنشاء <strong>سند صرف</strong> بمبلغ <strong>{watchedAmount?.toFixed(2)}</strong> ريال (المستحق للمستفيد)</p>
                                    <p>سيتم إنشاء <strong>سند صرف تلقائي</strong> بمبلغ <strong>{calculatedFee}</strong> ريال (مصروفات بنكية)</p>
                                    <p>إجمالي الخصم من البنك: <strong>{watchedAmount?.toFixed(2)}</strong> + <strong>{calculatedFee}</strong> = <strong>{watchedActualAmount?.toFixed(2)}</strong> ريال</p>
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

                {/* Row 5: Note */}
                <div className="border-t border-gray-100 dark:border-gray-700/50"></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    وذلك مقابل (تفاصيل الصرف) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('note')}
                    required
                    rows={3}
                    placeholder="أدخل تفاصيل الصرف"
                    onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('يرجى إدخال تفاصيل الصرف')}
                    onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 resize-none"
                  />
                  {errors.note && (
                    <p className="text-red-500 text-sm mt-1">{errors.note.message}</p>
                  )}
                </div>

              </form>
            </div>

            <div className="flex-none flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                form="payment-form"
              >
                <Save className="w-4 h-4" />
                {loading ? 'جاري الحفظ...' : editingVoucher ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {previewVoucher && (
        <VoucherPrint
          voucher={{
            ...previewVoucher,
            type: 'payment'
          }}
          onClose={() => setPreviewVoucher(null)}
        />
      )}

      {showSuccessModal && createdVoucher && (
        <VoucherSuccessModal
          isOpen={showSuccessModal}
          voucherCode={createdVoucher.code}
          voucherId={createdVoucher.id}
          voucherType="payment"
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedVoucher(null);
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
      )}
    </div>
  );
}