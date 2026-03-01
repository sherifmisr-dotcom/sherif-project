import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '@/components/ui/PageTransition';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { ArrowLeftRight, Plus, Trash2, Eye, Edit, ChevronDown, Search, AlertTriangle } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import TransferVoucherPrint from '@/components/TransferVoucherPrint';
import ModalOverlay from '@/components/ui/ModalOverlay';


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

interface InternalTransfer {
    id: string;
    code: string;
    date: string;
    amount: number;
    note: string;
    sourceType: string;
    destType: string;
    sourceAccountId?: string;
    destAccountId?: string;
    partyName: string;
}

export default function InternalTransfers() {
    const { canCreate, canEdit, canDelete } = usePermissions();
    const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

    const [limit, setLimit] = useState(10);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [previewTransfer, setPreviewTransfer] = useState<InternalTransfer | null>(null);
    const [editingTransfer, setEditingTransfer] = useState<InternalTransfer | null>(null);

    // Custom dropdown states
    const [isSourceBankOpen, setIsSourceBankOpen] = useState(false);
    const [isDestBankOpen, setIsDestBankOpen] = useState(false);
    const [sourceBankSearch, setSourceBankSearch] = useState('');
    const [destBankSearch, setDestBankSearch] = useState('');
    const sourceBankRef = useRef<HTMLDivElement>(null);
    const destBankRef = useRef<HTMLDivElement>(null);
    const sourceBankSearchRef = useRef<HTMLInputElement>(null);
    const destBankSearchRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        sourceType: 'TREASURY',
        sourceAccountId: '',
        destType: 'BANK',
        destAccountId: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        note: '',
        hasBankFees: false,
        actualAmountReceived: '',
    });

    useEffect(() => {
        loadBankAccounts();
        loadTransfers(10);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sourceBankRef.current && !sourceBankRef.current.contains(event.target as Node)) {
                setIsSourceBankOpen(false);
            }
            if (destBankRef.current && !destBankRef.current.contains(event.target as Node)) {
                setIsDestBankOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isSourceBankOpen && sourceBankSearchRef.current) {
            sourceBankSearchRef.current.focus();
        }
    }, [isSourceBankOpen]);

    useEffect(() => {
        if (isDestBankOpen && destBankSearchRef.current) {
            destBankSearchRef.current.focus();
        }
    }, [isDestBankOpen]);

    const loadBankAccounts = async () => {
        try {
            const response = await apiClient.getBankAccounts();
            // API returns an object with data array, not direct array
            setBankAccounts(Array.isArray(response) ? response : (response.data || []));
        } catch (error) {
            console.error('Error loading bank accounts:', error);
        }
    };

    const loadTransfers = async (currentLimit: number = 10) => {
        try {
            setLoading(true);
            const response = await apiClient.getVouchers({ type: 'INTERNAL_TRANSFER', limit: currentLimit });
            // API returns an object with data array, not direct array
            setTransfers(Array.isArray(response) ? response : (response.data || []));
        } catch (error) {
            console.error('Error loading transfers:', error);
            showError('فشل تحميل التحويلات');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const newLimit = 30;
        setLimit(newLimit);
        loadTransfers(newLimit);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (formData.sourceType === formData.destType && formData.sourceType === 'TREASURY') {
            showError('لا يمكن التحويل من الخزنة إلى الخزنة');
            return;
        }

        if (formData.sourceType === 'BANK' && !formData.sourceAccountId) {
            showError('الرجاء اختيار الحساب البنكي المصدر');
            return;
        }

        if (formData.destType === 'BANK' && !formData.destAccountId) {
            showError('الرجاء اختيار الحساب البنكي المستقبل');
            return;
        }

        if (formData.sourceType === formData.destType && formData.sourceAccountId === formData.destAccountId) {
            showError('لا يمكن التحويل من نفس الحساب إلى نفس الحساب');
            return;
        }

        if (!formData.note || formData.note.trim() === '') {
            showError('الرجاء إدخال بيان التحويل');
            return;
        }

        try {
            setLoading(true);

            if (editingTransfer) {
                // Update existing transfer
                await apiClient.updateVoucher(editingTransfer.id, {
                    sourceType: formData.sourceType,
                    sourceAccountId: formData.sourceAccountId || undefined,
                    destType: formData.destType,
                    destAccountId: formData.destAccountId || undefined,
                    amount: parseFloat(formData.amount),
                    date: formData.date,
                    note: formData.note.trim(),
                });
                showSuccess('تم تحديث التحويل بنجاح');
            } else {
                // Create new transfer
                await apiClient.createInternalTransfer({
                    sourceType: formData.sourceType,
                    sourceAccountId: formData.sourceAccountId || undefined,
                    destType: formData.destType,
                    destAccountId: formData.destAccountId || undefined,
                    amount: parseFloat(formData.amount),
                    date: formData.date,
                    note: formData.note.trim(),
                    hasBankFees: formData.hasBankFees ? true : undefined,
                    actualAmountReceived: formData.hasBankFees ? parseFloat(formData.actualAmountReceived) : undefined,
                });
                showSuccess('تم إنشاء التحويل بنجاح');
            }

            setShowForm(false);
            resetForm();
            loadTransfers();
        } catch (error: any) {
            console.error('Error saving transfer:', error);
            showError(error.response?.data?.message || `فشل ${editingTransfer ? 'تحديث' : 'إنشاء'} التحويل`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        showConfirm(
            'هل أنت متأكد من حذف هذا التحويل؟',
            async () => {
                try {
                    await apiClient.deleteVoucher(id);
                    showSuccess('تم حذف التحويل بنجاح');
                    loadTransfers();
                } catch (error) {
                    console.error('Error deleting transfer:', error);
                    showError('فشل حذف التحويل');
                }
            }
        );
    };

    const handleEdit = (transfer: InternalTransfer) => {
        setEditingTransfer(transfer);
        setFormData({
            sourceType: transfer.sourceType,
            sourceAccountId: transfer.sourceAccountId || '',
            destType: transfer.destType,
            destAccountId: transfer.destAccountId || '',
            amount: String(transfer.amount),
            date: format(new Date(transfer.date), 'yyyy-MM-dd'),
            note: transfer.note,
            hasBankFees: false,
            actualAmountReceived: '',
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setEditingTransfer(null);
        setFormData({
            sourceType: 'TREASURY',
            sourceAccountId: '',
            destType: 'BANK',
            destAccountId: '',
            amount: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            note: '',
            hasBankFees: false,
            actualAmountReceived: '',
        });
        setSourceBankSearch('');
        setDestBankSearch('');
    };

    const getAccountName = (type: string, accountId?: string) => {
        if (type === 'TREASURY') return 'الخزنة';
        const account = bankAccounts.find(a => a.id === accountId);
        return account ? `${account.bank?.name || account.banks?.name || 'بنك'} - ${account.accountNo || account.account_no}` : 'البنك';
    };

    const getSelectedAccountLabel = (accountId: string) => {
        const account = bankAccounts.find(a => a.id === accountId);
        if (!account) return 'اختر الحساب البنكي';
        return `${account.bank?.name || account.banks?.name || 'بنك'} - ${account.accountNo || account.account_no}`;
    };

    const filteredSourceAccounts = bankAccounts.filter(account => {
        if (!sourceBankSearch) return true;
        const bankName = account.bank?.name || account.banks?.name || '';
        const accountNo = account.accountNo || account.account_no || '';
        return bankName.includes(sourceBankSearch) || accountNo.includes(sourceBankSearch);
    });

    const filteredDestAccounts = bankAccounts.filter(account => {
        if (!destBankSearch) return true;
        const bankName = account.bank?.name || account.banks?.name || '';
        const accountNo = account.accountNo || account.account_no || '';
        return bankName.includes(destBankSearch) || accountNo.includes(destBankSearch);
    });



    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5 md:w-7 md:h-7 text-blue-600" />
                            التحويلات الداخلية
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            إدارة التحويلات بين الخزنة والحسابات البنكية
                        </p>
                    </div>
                    {canCreate('accounts.internal_transfers') && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="btn-primary"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            تحويل جديد
                        </button>
                    )}
                </div>


                {/* Transfer Form Modal */}
                {showForm && (
                    <ModalOverlay>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                            <div className="flex-none p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {editingTransfer ? 'تعديل تحويل' : 'تحويل جديد'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                                <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Date */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                التاريخ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
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
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                                                        checked={formData.sourceType === 'TREASURY'}
                                                        onChange={(e) => setFormData({ ...formData, sourceType: e.target.value, sourceAccountId: '' })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">الخزنة</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="BANK"
                                                        checked={formData.sourceType === 'BANK'}
                                                        onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">حساب بنكي</span>
                                                </label>
                                            </div>
                                            {formData.sourceType === 'BANK' && (
                                                <div ref={sourceBankRef} className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsSourceBankOpen(!isSourceBankOpen)}
                                                        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                                                      ${isSourceBankOpen
                                                                ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                                            }
                                                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                                    >
                                                        <span className={`truncate ${!formData.sourceAccountId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                                                            {getSelectedAccountLabel(formData.sourceAccountId)}
                                                        </span>
                                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isSourceBankOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {isSourceBankOpen && (
                                                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                                                            style={{ animation: 'dropdownIn 0.15s ease-out' }}
                                                        >
                                                            <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                                                                <div className="relative">
                                                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                    <input
                                                                        ref={sourceBankSearchRef}
                                                                        type="text"
                                                                        value={sourceBankSearch}
                                                                        onChange={(e) => setSourceBankSearch(e.target.value)}
                                                                        placeholder="ابحث عن حساب..."
                                                                        className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <ul className="py-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: '224px' }}>
                                                                {filteredSourceAccounts.length > 0 ? (
                                                                    filteredSourceAccounts.map((account) => (
                                                                        <li key={account.id}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFormData({ ...formData, sourceAccountId: account.id });
                                                                                    setIsSourceBankOpen(false);
                                                                                    setSourceBankSearch('');
                                                                                }}
                                                                                className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                                                              ${formData.sourceAccountId === account.id
                                                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                                                                    }`}
                                                                            >
                                                                                {account.bank?.name || account.banks?.name || 'بنك غير محدد'} - {account.accountNo || account.account_no}
                                                                            </button>
                                                                        </li>
                                                                    ))
                                                                ) : (
                                                                    <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">لا توجد نتائج</li>
                                                                )}
                                                            </ul>
                                                            {filteredSourceAccounts.length > 0 && (
                                                                <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{filteredSourceAccounts.length} حساب</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
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
                                                        checked={formData.destType === 'TREASURY'}
                                                        onChange={(e) => setFormData({ ...formData, destType: e.target.value, destAccountId: '' })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">الخزنة</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="BANK"
                                                        checked={formData.destType === 'BANK'}
                                                        onChange={(e) => setFormData({ ...formData, destType: e.target.value })}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-gray-700 dark:text-gray-300">حساب بنكي</span>
                                                </label>
                                            </div>
                                            {formData.destType === 'BANK' && (
                                                <div ref={destBankRef} className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsDestBankOpen(!isDestBankOpen)}
                                                        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                                                      ${isDestBankOpen
                                                                ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                                            }
                                                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                                    >
                                                        <span className={`truncate ${!formData.destAccountId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                                                            {getSelectedAccountLabel(formData.destAccountId)}
                                                        </span>
                                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDestBankOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {isDestBankOpen && (
                                                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                                                            style={{ animation: 'dropdownIn 0.15s ease-out' }}
                                                        >
                                                            <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                                                                <div className="relative">
                                                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                    <input
                                                                        ref={destBankSearchRef}
                                                                        type="text"
                                                                        value={destBankSearch}
                                                                        onChange={(e) => setDestBankSearch(e.target.value)}
                                                                        placeholder="ابحث عن حساب..."
                                                                        className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <ul className="py-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: '224px' }}>
                                                                {filteredDestAccounts.length > 0 ? (
                                                                    filteredDestAccounts.map((account) => (
                                                                        <li key={account.id}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFormData({ ...formData, destAccountId: account.id });
                                                                                    setIsDestBankOpen(false);
                                                                                    setDestBankSearch('');
                                                                                }}
                                                                                className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                                                              ${formData.destAccountId === account.id
                                                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                                                                    }`}
                                                                            >
                                                                                {account.bank?.name || account.banks?.name || 'بنك غير محدد'} - {account.accountNo || account.account_no}
                                                                            </button>
                                                                        </li>
                                                                    ))
                                                                ) : (
                                                                    <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">لا توجد نتائج</li>
                                                                )}
                                                            </ul>
                                                            {filteredDestAccounts.length > 0 && (
                                                                <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{filteredDestAccounts.length} حساب</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bank Transfer Fees — Only for bank-to-bank transfers */}
                                    {formData.sourceType === 'BANK' && formData.destType === 'BANK' && (
                                        <div className="border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-900/10 space-y-3">
                                            {/* Toggle */}
                                            <div className="flex items-center gap-3">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.hasBankFees}
                                                        onChange={(e) => setFormData({ ...formData, hasBankFees: e.target.checked, actualAmountReceived: '' })}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300/20 dark:peer-focus:ring-amber-800/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-500 peer-checked:bg-amber-500"></div>
                                                </label>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                    يوجد رسوم تحويل بنكية
                                                </span>
                                            </div>

                                            {formData.hasBankFees && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                المبلغ الفعلي المخصوم من البنك المصدر <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={formData.actualAmountReceived}
                                                                onChange={(e) => setFormData({ ...formData, actualAmountReceived: e.target.value })}
                                                                placeholder="أدخل المبلغ شامل الرسوم"
                                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                رسوم التحويل
                                                            </label>
                                                            <div className={`w-full px-4 py-2 border rounded-lg text-sm font-bold ${formData.amount && formData.actualAmountReceived && parseFloat(formData.actualAmountReceived) > parseFloat(formData.amount)
                                                                ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                                : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                                }`}>
                                                                {formData.amount && formData.actualAmountReceived && parseFloat(formData.actualAmountReceived) > parseFloat(formData.amount)
                                                                    ? `${(parseFloat(formData.actualAmountReceived) - parseFloat(formData.amount)).toFixed(2)} ريال`
                                                                    : 'سيتم الحساب تلقائياً'
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Info box */}
                                                    {formData.amount && formData.actualAmountReceived && parseFloat(formData.actualAmountReceived) > parseFloat(formData.amount) && (
                                                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                                <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                                                    <p>سيتم خصم <strong>{formData.actualAmountReceived}</strong> ريال من البنك المصدر (شامل الرسوم)</p>
                                                                    <p>سيصل <strong>{formData.amount}</strong> ريال للبنك المستقبل</p>
                                                                    <p>سيتم إنشاء <strong>سند صرف تلقائي</strong> بمبلغ <strong>{(parseFloat(formData.actualAmountReceived) - parseFloat(formData.amount)).toFixed(2)}</strong> ريال (مصروفات بنكية)</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Note */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            البيان <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.note}
                                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            rows={2}
                                            required
                                            placeholder="أدخل وصف التحويل..."
                                        />
                                    </div>

                                    {/* Actions */}
                                </form>
                            </div>
                            <div className="flex-none p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary disabled:opacity-50"
                                    form="transfer-form"
                                >
                                    {loading ? 'جاري الحفظ...' : 'حفظ التحويل'}
                                </button>
                            </div>
                        </div>
                    </ModalOverlay>
                )}

                {/* Transfers List */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className={`overflow-x-auto relative min-h-[200px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [scrollbar-gutter:stable] ${limit > 10 ? 'max-h-[500px] overflow-y-auto' : 'overflow-y-hidden'}`}>
                        <table className="w-full relative">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        رقم السند
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        التاريخ
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        من
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        إلى
                                    </th>
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
                                {loading && transfers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            جاري التحميل...
                                        </td>
                                    </tr>
                                ) : transfers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                            لا توجد تحويلات
                                        </td>
                                    </tr>
                                ) : (
                                    transfers.map((transfer, index) => (
                                        <motion.tr
                                            key={transfer.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                                {transfer.code}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {format(new Date(transfer.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {getAccountName(transfer.sourceType, transfer.sourceAccountId)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {getAccountName(transfer.destType, transfer.destAccountId)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                                                {parseFloat(String(transfer.amount || 0)).toFixed(2)} ريال
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {transfer.note || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setPreviewTransfer(transfer)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="معاينة"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {canEdit('accounts.internal_transfers') && (
                                                        <button
                                                            onClick={() => handleEdit(transfer)}
                                                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                            title="تعديل"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete('accounts.internal_transfers') && (
                                                        <button
                                                            onClick={() => handleDelete(transfer.id)}
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
                    {transfers.length >= 10 && limit < 30 && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center bg-gray-50/50 dark:bg-gray-800/50">
                            <button
                                onClick={handleLoadMore}
                                className="px-6 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                تحميل المزيد
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {previewTransfer && (
                <TransferVoucherPrint
                    transfer={previewTransfer}
                    bankAccounts={bankAccounts}
                    onClose={() => setPreviewTransfer(null)}
                />
            )}
        </PageTransition>
    );
}
