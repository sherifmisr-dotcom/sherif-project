import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Save, DollarSign, Calendar, CreditCard, ChevronDown, Search } from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { showSuccess, showError, showWarning } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface BatchItem {
    customsNo: string;
    amount: number;
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export default function BatchForm({ onClose, onSuccess }: Props) {
    const [date, setDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`);
    const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
    const [bankAccountId, setBankAccountId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<BatchItem[]>([{ customsNo: '', amount: 0 }]);

    // Custom dropdown states
    const [isMethodOpen, setIsMethodOpen] = useState(false);
    const [isBankOpen, setIsBankOpen] = useState(false);
    const [bankSearch, setBankSearch] = useState('');
    const methodRef = useRef<HTMLDivElement>(null);
    const bankRef = useRef<HTMLDivElement>(null);
    const bankSearchRef = useRef<HTMLInputElement>(null);

    const { data: bankAccounts } = useQuery({
        queryKey: ['bank-accounts-active'],
        queryFn: () => apiClient.getBankAccounts({ active: true }),
    });

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (methodRef.current && !methodRef.current.contains(event.target as Node)) {
                setIsMethodOpen(false);
            }
            if (bankRef.current && !bankRef.current.contains(event.target as Node)) {
                setIsBankOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus bank search when dropdown opens
    useEffect(() => {
        if (isBankOpen && bankSearchRef.current) {
            bankSearchRef.current.focus();
        }
    }, [isBankOpen]);

    const createMutation = useMutation({
        mutationFn: (data: any) => apiClient.createCustomsFeeBatch(data),
        onSuccess: () => {
            showSuccess('تم إنشاء الدفعة بنجاح');
            onSuccess();
        },
        onError: (error: any) => {
            showError(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الدفعة');
        },
    });

    const addItem = () => {
        setItems([...items, { customsNo: '', amount: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) {
            showWarning('يجب أن تحتوي الدفعة على بيان واحد على الأقل');
            return;
        }
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof BatchItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!date) {
            showWarning('التاريخ مطلوب');
            return;
        }

        if (method === 'BANK_TRANSFER' && !bankAccountId) {
            showWarning('الحساب البنكي مطلوب عند اختيار التحويل البنكي');
            return;
        }

        if (items.length === 0) {
            showWarning('يجب إضافة بيان واحد على الأقل');
            return;
        }

        for (let i = 0; i < items.length; i++) {
            if (!items[i].customsNo.trim()) {
                showWarning(`رقم البيان مطلوب في السطر ${i + 1}`);
                return;
            }
            if (items[i].amount <= 0) {
                showWarning(`المبلغ يجب أن يكون أكبر من صفر في السطر ${i + 1}`);
                return;
            }
        }

        // Check for duplicate customs numbers
        const customsNos = items.map(item => item.customsNo.trim());
        const uniqueCustomsNos = new Set(customsNos);
        if (customsNos.length !== uniqueCustomsNos.size) {
            showWarning('يوجد أرقام بيانات مكررة في الدفعة');
            return;
        }

        createMutation.mutate({
            date,
            method,
            bankAccountId: method === 'BANK_TRANSFER' ? bankAccountId : undefined,
            notes: notes.trim() || undefined,
            items: items.map(item => ({
                customsNo: item.customsNo.trim(),
                amount: Number(item.amount),
            })),
        });
    };

    const methodLabels: Record<string, string> = {
        'CASH': 'نقدي',
        'BANK_TRANSFER': 'تحويل بنكي',
    };

    const getSelectedBankLabel = () => {
        if (!bankAccountId) return 'اختر الحساب البنكي';
        const accountsList = bankAccounts?.data || [];
        const account = accountsList.find((a: any) => a.id === bankAccountId);
        if (!account) return 'اختر الحساب البنكي';
        return `${account.bank?.name || 'بنك'} - ${account.accountNo || account.account_no}`;
    };

    const filteredBankAccounts = (bankAccounts?.data || []).filter((account: any) => {
        if (!bankSearch) return true;
        const bankName = account.bank?.name || '';
        const accountNo = account.accountNo || account.account_no || '';
        return bankName.includes(bankSearch) || accountNo.includes(bankSearch);
    });

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        دفعة رسوم جمركية جديدة
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <Calendar className="w-4 h-4 inline ml-2" />
                                    تاريخ الدفع *
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            {/* Payment Method Custom Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <CreditCard className="w-4 h-4 inline ml-2" />
                                    طريقة الدفع *
                                </label>
                                <div ref={methodRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsMethodOpen(!isMethodOpen)}
                                        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                                          ${isMethodOpen
                                                ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                            }
                                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                    >
                                        <span>{methodLabels[method]}</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isMethodOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isMethodOpen && (
                                        <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                                            style={{ animation: 'dropdownIn 0.15s ease-out' }}
                                        >
                                            <ul className="py-1">
                                                {Object.entries(methodLabels).map(([value, label]) => (
                                                    <li key={value}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setMethod(value as 'CASH' | 'BANK_TRANSFER');
                                                                setIsMethodOpen(false);
                                                                if (value === 'CASH') {
                                                                    setBankAccountId('');
                                                                }
                                                            }}
                                                            className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                                              ${method === value
                                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                                                }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Account Custom Dropdown */}
                            {method === 'BANK_TRANSFER' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        الحساب البنكي *
                                    </label>
                                    <div ref={bankRef} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsBankOpen(!isBankOpen)}
                                            className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg text-right transition-all duration-200
                                              ${isBankOpen
                                                    ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                                }
                                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                                        >
                                            <span className={`truncate ${!bankAccountId ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                                                {getSelectedBankLabel()}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isBankOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isBankOpen && (
                                            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
                                                style={{ animation: 'dropdownIn 0.15s ease-out' }}
                                            >
                                                <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                                                    <div className="relative">
                                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            ref={bankSearchRef}
                                                            type="text"
                                                            value={bankSearch}
                                                            onChange={(e) => setBankSearch(e.target.value)}
                                                            placeholder="ابحث عن حساب..."
                                                            className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                                <ul className="py-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: '224px' }}>
                                                    {filteredBankAccounts.length > 0 ? (
                                                        filteredBankAccounts.map((account: any) => (
                                                            <li key={account.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setBankAccountId(account.id);
                                                                        setIsBankOpen(false);
                                                                        setBankSearch('');
                                                                    }}
                                                                    className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                                                      ${bankAccountId === account.id
                                                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                                                        }`}
                                                                >
                                                                    {account.bank?.name || 'بنك'} - {account.accountNo || account.account_no}
                                                                </button>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">لا توجد نتائج</li>
                                                    )}
                                                </ul>
                                                {filteredBankAccounts.length > 0 && (
                                                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">{filteredBankAccounts.length} حساب</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    ملاحظات
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                                    placeholder="ملاحظات اختيارية..."
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    البيانات الجمركية
                                </h3>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    إضافة بيان
                                </button>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                                رقم البيان
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                                المبلغ (ريال)
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-20">
                                                حذف
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                        {items.map((item, index) => (
                                            <tr key={index} className="bg-white dark:bg-gray-800">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.customsNo}
                                                        onChange={(e) => updateItem(index, 'customsNo', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="رقم البيان"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={item.amount || ''}
                                                        onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        disabled={items.length === 1}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                                                الإجمالي
                                            </td>
                                            <td className="px-4 py-3" colSpan={2}>
                                                <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                                                    <DollarSign className="w-5 h-5" />
                                                    {totalAmount.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })} ريال
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-5 h-5" />
                            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الدفعة'}
                        </button>
                    </div>
                </form>
            </div>
        </ModalOverlay>
    );
}