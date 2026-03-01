import { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { Search, FileText, Eye, X, ChevronDown, ChevronUp, Filter, Edit, Trash2, Save } from 'lucide-react';
import { showError, showSuccess, showConfirm } from '@/lib/toast';

import VoucherPrint from '@/components/VoucherPrint';
import Pagination from '@/components/ui/Pagination';
import TransferVoucherPrint from '@/components/TransferVoucherPrint';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ModalOverlay from '@/components/ui/ModalOverlay';

// Form validation schema
const voucherSchema = z.object({
    party_type: z.string().min(1, 'نوع الطرف مطلوب'),
    party_id: z.string().optional(),
    party_name: z.string().optional(),
    amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
    method: z.enum(['cash', 'bank']),
    bank_account_id: z.string().optional(),
    reference_number: z.string().optional(),
    note: z.string().min(1, 'البيان مطلوب'), // Made required
    date: z.string(),
    expense_category_id: z.string().optional(),
}).refine((data) => {
    if (data.party_type === 'customer' && !data.party_id) return false;
    if (data.party_type === 'other' && !data.party_name) return false;
    if (data.party_type === 'customs' && !data.party_name) return false;
    if (data.method === 'bank' && !data.bank_account_id) return false;
    return true;
}, { message: 'الرجاء إكمال جميع الحقول المطلوبة' });

type VoucherFormData = z.infer<typeof voucherSchema>;

interface Voucher {
    id: string;
    code: string;
    type: string;
    date: string;
    partyName: string;
    party_name?: string;
    amount: number;
    note?: string;
    method: string;
    partyType?: string;
    party_type?: string;
    partyId?: string;
    party_id?: string;
    bankAccountId?: string;
    bank_account_id?: string;
    referenceNumber?: string;
    reference_number?: string;
    expenseCategoryId?: string;
    expense_category_id?: string;
    category?: { id: string; name: string };
    categoryId?: string;
    sourceType?: string;
    source_type?: string;
    destType?: string;
    dest_type?: string;
    sourceAccountId?: string;
    source_account_id?: string;
    destAccountId?: string;
    dest_account_id?: string;
}

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
    bank?: { name: string };
    banks?: { name: string };
}

interface ExpenseCategory {
    id: string;
    name: string;
}

export default function VoucherSearch() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    // Internal Transfer states
    const [showTransferPreview, setShowTransferPreview] = useState(false);
    const [previewTransfer, setPreviewTransfer] = useState<Voucher | null>(null);
    const [showTransferEditModal, setShowTransferEditModal] = useState(false);
    const [editingTransfer, setEditingTransfer] = useState<Voucher | null>(null);
    const [transferFormData, setTransferFormData] = useState({
        sourceType: 'TREASURY',
        sourceAccountId: '',
        destType: 'BANK',
        destAccountId: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        note: '',
    });

    // Dropdown data
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<VoucherFormData>({
        resolver: zodResolver(voucherSchema),
    });

    const watchPartyType = watch('party_type');
    const watchMethod = watch('method');

    // Search filters
    const [filters, setFilters] = useState({
        type: '',
        code: '',
        partyName: '',
        dateFrom: '',
        dateTo: '',
        amountFrom: '',
        amountTo: '',
    });

    const handleSearch = async () => {
        // Check if at least one filter is provided
        const hasFilters = filters.type || filters.code || filters.partyName ||
            filters.dateFrom || filters.dateTo ||
            filters.amountFrom || filters.amountTo;

        if (!hasFilters) {
            showError('الرجاء إدخال معيار بحث واحد على الأقل');
            return;
        }

        try {
            setLoading(true);
            const params: any = {};

            if (filters.type) params.type = filters.type;
            if (filters.dateFrom) params.from = filters.dateFrom;
            if (filters.dateTo) params.to = filters.dateTo;
            if (filters.code || filters.partyName) {
                // Use 'q' parameter for general search (code or party name)
                params.q = filters.code || filters.partyName;
            }
            if (filters.amountFrom) params.amountFrom = parseFloat(filters.amountFrom);
            if (filters.amountTo) params.amountTo = parseFloat(filters.amountTo);

            params.limit = 1000;

            const response = await apiClient.getVouchers(params);
            setVouchers(Array.isArray(response) ? response : (response.data || []));
            setCurrentPage(1);
        } catch (error) {
            console.error('Error searching vouchers:', error);
            showError('فشل البحث في السندات');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFilters({
            type: '',
            code: '',
            partyName: '',
            dateFrom: '',
            dateTo: '',
            amountFrom: '',
            amountTo: '',
        });
        setVouchers([]);
    };

    // Internal Transfer Handlers
    const handleEditTransfer = (voucher: Voucher) => {
        setEditingTransfer(voucher);
        setTransferFormData({
            sourceType: voucher.sourceType || voucher.source_type || 'TREASURY',
            sourceAccountId: voucher.sourceAccountId || voucher.source_account_id || '',
            destType: voucher.destType || voucher.dest_type || 'BANK',
            destAccountId: voucher.destAccountId || voucher.dest_account_id || '',
            amount: String(voucher.amount),
            date: format(new Date(voucher.date), 'yyyy-MM-dd'),
            note: voucher.note || '',
        });
        setShowTransferEditModal(true);
    };

    const handleSaveTransfer = async () => {
        if (!editingTransfer) return;

        // Validation
        if (transferFormData.sourceType === transferFormData.destType && transferFormData.sourceType === 'TREASURY') {
            showError('لا يمكن التحويل من الخزنة إلى الخزنة');
            return;
        }

        if (transferFormData.sourceType === 'BANK' && !transferFormData.sourceAccountId) {
            showError('يجب اختيار الحساب البنكي المصدر');
            return;
        }

        if (transferFormData.destType === 'BANK' && !transferFormData.destAccountId) {
            showError('يجب اختيار الحساب البنكي الوجهة');
            return;
        }

        if (!transferFormData.amount || parseFloat(transferFormData.amount) <= 0) {
            showError('يجب إدخال مبلغ صحيح');
            return;
        }

        try {
            setLoading(true);

            const transferData = {
                sourceType: transferFormData.sourceType,
                destType: transferFormData.destType,
                sourceAccountId: transferFormData.sourceAccountId || undefined,
                destAccountId: transferFormData.destAccountId || undefined,
                amount: parseFloat(transferFormData.amount),
                date: transferFormData.date,
                note: transferFormData.note,
            };

            await apiClient.updateVoucher(editingTransfer.id, transferData);
            showSuccess('تم تحديث التحويل بنجاح');
            setShowTransferEditModal(false);
            setEditingTransfer(null);
            handleSearch(); // Reload results
        } catch (error: any) {
            showError(error.response?.data?.message || 'فشل تحديث التحويل');
        } finally {
            setLoading(false);
        }
    };



    const handleDelete = (voucherId: string, voucherCode: string) => {
        showConfirm(
            `سيتم حذف السند ${voucherCode} نهائياً`,
            async () => {
                try {
                    await apiClient.deleteVoucher(voucherId);
                    showSuccess('تم حذف السند بنجاح');
                    // Refresh the list
                    handleSearch();
                } catch (error) {
                    console.error('Error deleting voucher:', error);
                    showError('فشل حذف السند');
                }
            }
        );
    };

    // Load dropdown data
    useEffect(() => {
        loadDropdownData();
    }, []);

    const loadDropdownData = async () => {
        try {
            const [customersRes, employeesRes, agentsRes, banksRes, categoriesRes] = await Promise.all([
                apiClient.getCustomers({ limit: 0 }),
                apiClient.getEmployees(),
                apiClient.getAgents(),
                apiClient.getBankAccounts(),
                apiClient.getExpenseCategories(),
            ]);

            setCustomers(customersRes.data || customersRes || []);
            setEmployees(employeesRes.data || employeesRes || []);
            setAgents(agentsRes.data || agentsRes || []);
            setBankAccounts(banksRes.data || banksRes || []);
            setExpenseCategories(categoriesRes.data || categoriesRes || []);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    };

    const handleEdit = (voucher: Voucher) => {
        setEditingVoucher(voucher);

        // Pre-fill form
        reset({
            party_type: (voucher.partyType || voucher.party_type || '').toLowerCase() as any,
            party_id: voucher.partyId || voucher.party_id || '',
            party_name: voucher.partyName || voucher.party_name || '',
            amount: Number(voucher.amount),
            method: (voucher.method?.toLowerCase() === 'cash' || voucher.method?.toLowerCase() === 'نقدي' ? 'cash' : 'bank') as 'cash' | 'bank',
            bank_account_id: voucher.bankAccountId || voucher.bank_account_id || '',
            reference_number: voucher.referenceNumber || voucher.reference_number || '',
            note: voucher.note || '',
            date: voucher.date ? format(new Date(voucher.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            expense_category_id: voucher.category?.id || voucher.categoryId || voucher.expenseCategoryId || voucher.expense_category_id || '',
        });

        setShowEditModal(true);
    };

    const onSubmitEdit = async (data: VoucherFormData) => {
        if (!editingVoucher) return;

        try {
            // Map form data to match backend DTO
            const updateData: any = {
                partyType: data.party_type?.toUpperCase(), // Convert to UPPERCASE for backend enum
                partyId: data.party_id,
                partyName: data.party_name,
                method: data.method === 'cash' ? 'CASH' : 'BANK_TRANSFER',
                bankAccountId: data.bank_account_id,
                referenceNumber: data.reference_number,
                amount: Number(data.amount),
                categoryId: data.expense_category_id,
                note: data.note,
                date: data.date,
            };

            // Remove undefined/empty values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined || updateData[key] === '') {
                    delete updateData[key];
                }
            });


            await apiClient.updateVoucher(editingVoucher.id, updateData);

            showSuccess('تم تحديث السند بنجاح');
            setShowEditModal(false);
            setEditingVoucher(null);
            reset();
            // Refresh the list
            handleSearch();
        } catch (error: any) {
            console.error('Error updating voucher:', error);
            console.error('Error response:', error.response?.data);
            const errorMsg = error.response?.data?.message;
            const displayMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || error.message;
            showError(`فشل تحديث السند: ${displayMsg}`);
        }
    };

    const getVoucherTypeLabel = (type: string) => {
        switch (type) {
            case 'RECEIPT': return 'سند قبض';
            case 'PAYMENT': return 'سند صرف';
            case 'INTERNAL_TRANSFER': return 'تحويل داخلي';
            default: return type;
        }
    };

    const getVoucherTypeColor = (type: string) => {
        switch (type) {
            case 'RECEIPT': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'PAYMENT': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            case 'INTERNAL_TRANSFER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }
    };

    const getVoucherDescription = (voucher: Voucher) => {
        if (voucher.type === 'INTERNAL_TRANSFER') {
            // If there's a manual note, use it
            if (voucher.note) return voucher.note;

            // Otherwise, generate automatic description
            const sourceType = voucher.sourceType || voucher.source_type;
            const destType = voucher.destType || voucher.dest_type;
            const sourceAccountId = voucher.sourceAccountId || voucher.source_account_id;
            const destAccountId = voucher.destAccountId || voucher.dest_account_id;

            let sourceAccount: BankAccount | undefined;
            let destAccount: BankAccount | undefined;

            if (sourceType === 'BANK' && sourceAccountId) {
                sourceAccount = bankAccounts.find(a => a.id === sourceAccountId);
            }
            if (destType === 'BANK' && destAccountId) {
                destAccount = bankAccounts.find(a => a.id === destAccountId);
            }

            const sourceName = sourceType === 'TREASURY' ? 'الخزنة' :
                sourceAccount ? `${sourceAccount.bank?.name || sourceAccount.banks?.name || 'بنك'} - ${sourceAccount.account_no || sourceAccount.accountNo}` : 'حساب بنكي';
            const destName = destType === 'TREASURY' ? 'الخزنة' :
                destAccount ? `${destAccount.bank?.name || destAccount.banks?.name || 'بنك'} - ${destAccount.account_no || destAccount.accountNo}` : 'حساب بنكي';

            // Generate description based on direction
            if (sourceType === 'TREASURY' && destType === 'BANK') {
                return `إيداع بنكي من الخزنة في حساب ${destName}`;
            } else if (sourceType === 'BANK' && destType === 'TREASURY') {
                return `تغذية الخزنة من حساب ${sourceName}`;
            } else if (sourceType === 'BANK' && destType === 'BANK') {
                return `تحويل بنكي من ${sourceName} إلى ${destName}`;
            }
            return `تحويل من ${sourceName} إلى ${destName}`;
        }
        return voucher.note || '-';
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Search Filters */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-600" />
                        البحث في السندات
                    </h3>

                    {/* Quick Search - Always Visible */}
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={filters.code}
                                    onChange={(e) => setFilters({ ...filters, code: e.target.value })}
                                    placeholder="ابحث برقم السند (مثال: RV-24-0001)"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="btn-primary px-3 py-2 md:px-6 disabled:opacity-50 whitespace-nowrap text-sm md:text-base"
                            >
                                <Search className="w-4 h-4" />
                                {loading ? 'جاري البحث...' : 'بحث'}
                            </button>
                        </div>

                        {/* Advanced Filters Toggle */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium"
                        >
                            <Filter className="w-4 h-4" />
                            فلاتر متقدمة
                            {showAdvancedFilters ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>

                        {/* Advanced Filters - Collapsible */}
                        {showAdvancedFilters && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Voucher Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            نوع السند
                                        </label>
                                        <select
                                            value={filters.type}
                                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="">الكل</option>
                                            <option value="RECEIPT">سند قبض</option>
                                            <option value="PAYMENT">سند صرف</option>
                                            <option value="INTERNAL_TRANSFER">تحويل داخلي</option>
                                        </select>
                                    </div>

                                    {/* Party Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            اسم الطرف
                                        </label>
                                        <input
                                            type="text"
                                            value={filters.partyName}
                                            onChange={(e) => setFilters({ ...filters, partyName: e.target.value })}
                                            placeholder="العميل/الموظف/الوكيل"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    {/* Date From */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            من تاريخ
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.dateFrom}
                                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    {/* Date To */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            إلى تاريخ
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.dateTo}
                                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    {/* Amount From */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            من مبلغ
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={filters.amountFrom}
                                            onChange={(e) => setFilters({ ...filters, amountFrom: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    {/* Amount To */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            إلى مبلغ
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={filters.amountTo}
                                            onChange={(e) => setFilters({ ...filters, amountTo: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Advanced Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        إعادة تعيين
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            نتائج البحث ({vouchers.length})
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        رقم السند
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        النوع
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        التاريخ
                                    </th>
                                    {/* Dynamic headers based on voucher type */}
                                    {vouchers.length > 0 && vouchers.every(v => v.type === 'INTERNAL_TRANSFER') ? (
                                        <>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                من
                                            </th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                إلى
                                            </th>
                                        </>
                                    ) : (
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            الطرف
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        المبلغ
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        البيان
                                    </th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        الإجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            جاري البحث...
                                        </td>
                                    </tr>
                                ) : vouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            لا توجد نتائج. استخدم الفلاتر أعلاه للبحث في السندات.
                                        </td>
                                    </tr>
                                ) : (
                                    vouchers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((voucher) => (
                                        <tr key={voucher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                                {voucher.code}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVoucherTypeColor(voucher.type)}`}>
                                                    {getVoucherTypeLabel(voucher.type)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {format(new Date(voucher.date), 'dd/MM/yyyy')}
                                            </td>
                                            {/* Dynamic columns based on voucher type */}
                                            {vouchers.every(v => v.type === 'INTERNAL_TRANSFER') ? (
                                                <>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                        {(() => {
                                                            const sourceType = voucher.sourceType || voucher.source_type;
                                                            const sourceAccountId = voucher.sourceAccountId || voucher.source_account_id;
                                                            if (sourceType === 'TREASURY') return 'الخزنة';
                                                            const sourceAccount = sourceType === 'BANK' && sourceAccountId
                                                                ? bankAccounts.find(a => a.id === sourceAccountId)
                                                                : undefined;
                                                            return sourceAccount ? `${sourceAccount.bank?.name || sourceAccount.banks?.name || 'بنك'} - ${sourceAccount.account_no || sourceAccount.accountNo}` : 'حساب بنكي';
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                        {(() => {
                                                            const destType = voucher.destType || voucher.dest_type;
                                                            const destAccountId = voucher.destAccountId || voucher.dest_account_id;
                                                            if (destType === 'TREASURY') return 'الخزنة';
                                                            const destAccount = destType === 'BANK' && destAccountId
                                                                ? bankAccounts.find(a => a.id === destAccountId)
                                                                : undefined;
                                                            return destAccount ? `${destAccount.bank?.name || destAccount.banks?.name || 'بنك'} - ${destAccount.account_no || destAccount.accountNo}` : 'حساب بنكي';
                                                        })()}
                                                    </td>
                                                </>
                                            ) : (
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                    {voucher.partyName}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                                                {parseFloat(voucher.amount as any).toFixed(2)} ريال
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {getVoucherDescription(voucher)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (voucher.type === 'INTERNAL_TRANSFER') {
                                                                setPreviewTransfer(voucher);
                                                                setShowTransferPreview(true);
                                                            } else {
                                                                setSelectedVoucher(voucher);
                                                            }
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="معاينة وطباعة"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (voucher.type === 'INTERNAL_TRANSFER') {
                                                                handleEditTransfer(voucher);
                                                            } else {
                                                                handleEdit(voucher);
                                                            }
                                                        }}
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                        title="تعديل"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(voucher.id, voucher.code)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalItems={vouchers.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                    />
                </div>

                {/* Preview Modal with VoucherPrint */}
                {selectedVoucher && (
                    <VoucherPrint
                        voucher={selectedVoucher}
                        onClose={() => setSelectedVoucher(null)}
                    />
                )}

                {/* Transfer Preview Modal */}
                {showTransferPreview && previewTransfer && (
                    <TransferVoucherPrint
                        transfer={previewTransfer as any}
                        bankAccounts={bankAccounts}
                        onClose={() => {
                            setShowTransferPreview(false);
                            setPreviewTransfer(null);
                        }}
                    />
                )}

                {/* Edit Modal */}
                {showEditModal && editingVoucher && (
                    <ModalOverlay>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700/50">
                            <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3.5 flex items-center justify-between z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {editingVoucher.type === 'RECEIPT' ? 'تعديل سند قبض' :
                                            editingVoucher.type === 'PAYMENT' ? 'تعديل سند صرف' :
                                                'تعديل تحويل داخلي'}
                                    </h2>
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                        رقم السند: {editingVoucher.code}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingVoucher(null);
                                        reset();
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
                                <form id="edit-voucher-form" onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
                                    {/* Row 1: Party Type + Customer/Employee/Agent/Other */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                نوع الطرف <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                {...register('party_type')}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="">اختر نوع الطرف</option>
                                                {editingVoucher.type === 'RECEIPT' && <option value="customer">عميل</option>}
                                                {editingVoucher.type === 'PAYMENT' && (
                                                    <>
                                                        <option value="customer">عميل</option>
                                                        <option value="employee">موظف</option>
                                                        <option value="agent">وكيل</option>
                                                        <option value="customs">هيئة الزكاة والضريبة والجمارك</option>
                                                    </>
                                                )}
                                                <option value="other">أخرى</option>
                                            </select>
                                        </div>

                                        {watchPartyType === 'customer' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    العميل <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register('party_id')}
                                                    disabled={!watchPartyType}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">اختر العميل</option>
                                                    {customers.map((customer) => (
                                                        <option key={customer.id} value={customer.id}>
                                                            {customer.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : watchPartyType === 'employee' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    الموظف <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register('party_id')}
                                                    disabled={!watchPartyType}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">اختر الموظف</option>
                                                    {employees.map((employee) => (
                                                        <option key={employee.id} value={employee.id}>
                                                            {employee.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : watchPartyType === 'agent' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    الوكيل <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register('party_id')}
                                                    disabled={!watchPartyType}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">اختر الوكيل</option>
                                                    {agents.map((agent) => (
                                                        <option key={agent.id} value={agent.id}>
                                                            {agent.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : watchPartyType === 'other' || watchPartyType === 'customs' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    اسم الطرف <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    {...register('party_name')}
                                                    disabled={!watchPartyType}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="أدخل اسم الطرف"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    الطرف
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white opacity-50 cursor-not-allowed"
                                                    placeholder="اختر نوع الطرف أولاً"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 2: Amount + Date */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                المبلغ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register('amount', { valueAsNumber: true })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                التاريخ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                {...register('date')}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Payment Method + Expense Category (for payment) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                طريقة الدفع <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                {...register('method')}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="cash">نقدي</option>
                                                <option value="bank">بنكي</option>
                                            </select>
                                        </div>

                                        {editingVoucher.type === 'PAYMENT' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    فئة المصروف <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register('expense_category_id')}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                >
                                                    <option value="">اختر فئة المصروف</option>
                                                    {expenseCategories.map((category) => (
                                                        <option key={category.id} value={category.id}>
                                                            {category.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bank Account - if bank method */}
                                    {watchMethod === 'bank' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    الحساب البنكي <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register('bank_account_id')}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                >
                                                    <option value="">اختر الحساب البنكي</option>
                                                    {bankAccounts.map((account) => (
                                                        <option key={account.id} value={account.id}>
                                                            {account.bank?.name || account.banks?.name || 'بنك'} - {account.account_no || account.accountNo}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    رقم المرجع
                                                </label>
                                                <input
                                                    type="text"
                                                    {...register('reference_number')}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="رقم المرجع"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Note */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            الملاحظات / البيان <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            {...register('note')}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="أدخل البيان أو تفاصيل الصرف"
                                        />
                                        {errors.note && (
                                            <p className="text-red-500 text-sm mt-1">{errors.note.message}</p>
                                        )}
                                    </div>

                                </form>
                            </div>

                            {/* Sticky Footer */}
                            <div className="flex-none bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-3.5 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingVoucher(null);
                                        reset();
                                    }}
                                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    form="edit-voucher-form"
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    <Save className="w-5 h-5" />
                                    {loading ? 'جاري الحفظ...' : 'تحديث'}
                                </button>
                            </div>
                        </div>
                    </ModalOverlay>
                )}

                {/* Transfer Edit Modal */}
                {showTransferEditModal && editingTransfer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/50">
                            <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3.5 flex items-center justify-between z-10">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        تعديل تحويل داخلي
                                    </h3>
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                        رقم السند: {editingTransfer.code}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowTransferEditModal(false);
                                        setEditingTransfer(null);
                                    }}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Date */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                التاريخ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={transferFormData.date}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, date: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                required
                                            />
                                        </div>

                                        {/* Amount */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                المبلغ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={transferFormData.amount}
                                                onChange={(e) => setTransferFormData({ ...transferFormData, amount: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Source */}
                                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            من (المصدر) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="space-y-3">
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="TREASURY"
                                                        checked={transferFormData.sourceType === 'TREASURY'}
                                                        onChange={(e) => setTransferFormData({ ...transferFormData, sourceType: e.target.value, sourceAccountId: '' })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">الخزنة</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="BANK"
                                                        checked={transferFormData.sourceType === 'BANK'}
                                                        onChange={(e) => setTransferFormData({ ...transferFormData, sourceType: e.target.value })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">حساب بنكي</span>
                                                </label>
                                            </div>
                                            {transferFormData.sourceType === 'BANK' && (
                                                <select
                                                    value={transferFormData.sourceAccountId}
                                                    onChange={(e) => setTransferFormData({ ...transferFormData, sourceAccountId: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                    required
                                                >
                                                    <option value="">اختر الحساب البنكي</option>
                                                    {bankAccounts.map((account) => (
                                                        <option key={account.id} value={account.id}>
                                                            {account.bank?.name || account.banks?.name || 'بنك غير محدد'} - {account.account_no || account.accountNo}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {/* Destination */}
                                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            إلى (الوجهة) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="space-y-3">
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="TREASURY"
                                                        checked={transferFormData.destType === 'TREASURY'}
                                                        onChange={(e) => setTransferFormData({ ...transferFormData, destType: e.target.value, destAccountId: '' })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">الخزنة</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="BANK"
                                                        checked={transferFormData.destType === 'BANK'}
                                                        onChange={(e) => setTransferFormData({ ...transferFormData, destType: e.target.value })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">حساب بنكي</span>
                                                </label>
                                            </div>
                                            {transferFormData.destType === 'BANK' && (
                                                <select
                                                    value={transferFormData.destAccountId}
                                                    onChange={(e) => setTransferFormData({ ...transferFormData, destAccountId: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                    required
                                                >
                                                    <option value="">اختر الحساب البنكي</option>
                                                    {bankAccounts.map((account) => (
                                                        <option key={account.id} value={account.id}>
                                                            {account.bank?.name || account.banks?.name || 'بنك غير محدد'} - {account.account_no || account.accountNo}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {/* Note */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            البيان <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={transferFormData.note}
                                            onChange={(e) => setTransferFormData({ ...transferFormData, note: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            rows={2}
                                            required
                                            placeholder="أدخل وصف التحويل..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="flex-none bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-3.5 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTransferEditModal(false);
                                        setEditingTransfer(null);
                                    }}
                                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTransfer}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    {loading ? 'جاري الحفظ...' : 'تحديث'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}