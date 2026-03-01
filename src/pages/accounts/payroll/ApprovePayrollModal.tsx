import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { X, CheckCircle, ChevronDown, Search } from 'lucide-react';

import { showSuccess, showError, showWarning, showConfirm } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface PayrollRun {
    id: string;
    month: string;
    totalNet: number;
}

interface BankAccount {
    id: string;
    accountNo: string;
    accountName: string;
    bank: {
        name: string;
    };
}

interface ApprovePayrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    payrollRun: PayrollRun | null;
    onSuccess?: () => void;
}

export default function ApprovePayrollModal({ isOpen, onClose, payrollRun, onSuccess }: ApprovePayrollModalProps) {
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState('');

    // Custom dropdown states
    const [isBankOpen, setIsBankOpen] = useState(false);
    const [bankSearch, setBankSearch] = useState('');
    const bankDropdownRef = useRef<HTMLDivElement>(null);
    const bankSearchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && paymentMethod === 'BANK_TRANSFER') {
            loadBankAccounts();
        }
    }, [isOpen, paymentMethod]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
                setIsBankOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search when dropdown opens
    useEffect(() => {
        if (isBankOpen && bankSearchRef.current) {
            bankSearchRef.current.focus();
        }
    }, [isBankOpen]);

    const loadBankAccounts = async () => {
        try {
            const response = await apiClient.getBankAccounts();
            const accounts = response.data || response;
            setBankAccounts(Array.isArray(accounts) ? accounts : []);
            if (accounts.length > 0) {
                setSelectedBankAccount(accounts[0].id);
            }
        } catch (error) {
            console.error('Error loading bank accounts:', error);
            setBankAccounts([]);
        }
    };

    const handleApprove = async () => {
        if (!payrollRun) return;

        if (paymentMethod === 'BANK_TRANSFER' && !selectedBankAccount) {
            showWarning('يجب اختيار الحساب البنكي');
            return;
        }

        showConfirm('هل أنت متأكد من اعتماد كشف الرواتب؟', async () => {

            setLoading(true);
            try {
                const data: any = {
                    runId: payrollRun.id,
                    paymentMethod,
                };

                if (paymentMethod === 'BANK_TRANSFER') {
                    data.bankAccountId = selectedBankAccount;
                }

                await apiClient.approvePayrollRun(data);
                showSuccess('تم اعتماد كشف الرواتب بنجاح');
                if (onSuccess) onSuccess();
                onClose();
            } catch (error: any) {
                console.error('Error approving payroll:', error);
                const message = error.response?.data?.message || 'حدث خطأ أثناء اعتماد كشف الرواتب';
                showError(message);
            } finally {
                setLoading(false);
            }
        });
    };

    if (!isOpen || !payrollRun) return null;

    const monthName = new Date(payrollRun.month).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
    });

    const getSelectedBankLabel = () => {
        if (!selectedBankAccount) return 'اختر الحساب البنكي';
        const account = bankAccounts.find(a => a.id === selectedBankAccount);
        if (!account) return 'اختر الحساب البنكي';
        return `${account.bank.name} - ${account.accountNo}`;
    };

    const filteredBankAccounts = bankAccounts.filter(account => {
        if (!bankSearch) return true;
        const searchLower = bankSearch.toLowerCase();
        return (
            account.bank.name.toLowerCase().includes(searchLower) ||
            account.accountNo.includes(bankSearch) ||
            account.accountName.toLowerCase().includes(searchLower)
        );
    });

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            اعتماد كشف الرواتب
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                الشهر: <span className="font-medium text-gray-900 dark:text-white">{monthName}</span>
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                إجمالي الصافي: <span className="font-bold text-blue-600 dark:text-blue-400">{parseFloat(String(payrollRun.totalNet)).toFixed(2)} ريال</span>
                            </p>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                طريقة الدفع
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="CASH"
                                        checked={paymentMethod === 'CASH'}
                                        onChange={(e) => setPaymentMethod(e.target.value as 'CASH')}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="mr-3 text-sm text-gray-900 dark:text-white">نقدي (من الخزينة)</span>
                                </label>
                                <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="BANK_TRANSFER"
                                        checked={paymentMethod === 'BANK_TRANSFER'}
                                        onChange={(e) => setPaymentMethod(e.target.value as 'BANK_TRANSFER')}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="mr-3 text-sm text-gray-900 dark:text-white">تحويل بنكي</span>
                                </label>
                            </div>
                        </div>

                        {/* Bank Account Selection - Custom Dropdown */}
                        {paymentMethod === 'BANK_TRANSFER' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    الحساب البنكي
                                </label>
                                <div ref={bankDropdownRef} className="relative">
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
                                        <span className={`truncate ${!selectedBankAccount ? 'text-gray-400 dark:text-gray-500' : ''}`}>
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
                                            <ul className="py-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: '200px' }}>
                                                {filteredBankAccounts.length > 0 ? (
                                                    filteredBankAccounts.map((account) => (
                                                        <li key={account.id}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedBankAccount(account.id);
                                                                    setIsBankOpen(false);
                                                                    setBankSearch('');
                                                                }}
                                                                className={`w-full text-right px-4 py-2.5 text-sm transition-colors duration-100
                                                                  ${selectedBankAccount === account.id
                                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                                                                    }`}
                                                            >
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span>{account.bank.name} - {account.accountNo}</span>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{account.accountName}</span>
                                                                </div>
                                                            </button>
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">لا توجد نتائج</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ بعد الاعتماد، لن يمكن تعديل أو حذف كشف الرواتب.
                            </p>
                            {paymentMethod === 'CASH' && (
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                                    💰 سيتم خصم المبلغ من الخزينة
                                </p>
                            )}
                            {paymentMethod === 'BANK_TRANSFER' && (
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                                    🏦 سيتم خصم المبلغ من الحساب البنكي المحدد
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleApprove}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                            <CheckCircle className="w-4 h-4" />
                            اعتماد
                        </button>
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
}