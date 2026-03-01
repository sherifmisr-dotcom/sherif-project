import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X, Users } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import { useScrollLock } from '@/hooks/useScrollLock';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { motion } from 'framer-motion';

interface CustomerGroup {
    id: string;
    name: string;
    notes: string | null;
    customerCount: number;
    totalBalance: number;
    customers: Array<{
        id: string;
        name: string;
        type: string | null;
        isActive: boolean;
        currentBalance?: number;
    }>;
}

interface AvailableCustomer {
    id: string;
    name: string;
    type: string | null;
    isActive: boolean;
}

export default function CustomerGroupsTab() {
    const [groups, setGroups] = useState<CustomerGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [allCustomers, setAllCustomers] = useState<AvailableCustomer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');

    useScrollLock(showForm);

    useEffect(() => {
        fetchGroups();
    }, [searchQuery]);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getCustomerGroups({ q: searchQuery || undefined });
            setGroups(response.data || []);
        } catch (error: any) {
            showError(error.response?.data?.message || 'حدث خطأ في تحميل المجموعات');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCustomers = async () => {
        try {
            const response = await apiClient.getCustomers({ limit: 0, activeStatus: 'all' });
            setAllCustomers(response.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const openCreateForm = () => {
        setEditingGroup(null);
        setFormName('');
        setFormNotes('');
        setSelectedCustomerIds([]);
        setCustomerSearch('');
        fetchAllCustomers();
        setShowForm(true);
    };

    const openEditForm = async (group: CustomerGroup) => {
        try {
            const details = await apiClient.getCustomerGroup(group.id);
            setEditingGroup(details);
            setFormName(details.name);
            setFormNotes(details.notes || '');
            setSelectedCustomerIds(details.customers.map((c: any) => c.id));
            setCustomerSearch('');
            await fetchAllCustomers();
            setShowForm(true);
        } catch (error: any) {
            showError('حدث خطأ في تحميل بيانات المجموعة');
        }
    };

    const handleSubmit = async () => {
        if (!formName.trim()) {
            showError('اسم المجموعة مطلوب');
            return;
        }

        try {
            setSubmitting(true);
            const data = {
                name: formName.trim(),
                notes: formNotes.trim() || undefined,
                customerIds: selectedCustomerIds,
            };

            if (editingGroup) {
                await apiClient.updateCustomerGroup(editingGroup.id, data);
                showSuccess('تم تحديث المجموعة بنجاح');
            } else {
                await apiClient.createCustomerGroup(data);
                showSuccess('تم إنشاء المجموعة بنجاح');
            }

            setShowForm(false);
            fetchGroups();
        } catch (error: any) {
            showError(error.response?.data?.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (group: CustomerGroup) => {
        showConfirm(
            `هل أنت متأكد من حذف المجموعة "${group.name}"؟\nسيتم فك ارتباط العملاء بالمجموعة فقط، ولن يتم حذف العملاء.`,
            async () => {
                try {
                    await apiClient.deleteCustomerGroup(group.id);
                    showSuccess('تم حذف المجموعة بنجاح');
                    fetchGroups();
                } catch (error: any) {
                    showError(error.response?.data?.message || 'حدث خطأ أثناء الحذف');
                }
            }
        );
    };

    const toggleCustomer = (customerId: string) => {
        setSelectedCustomerIds((prev) =>
            prev.includes(customerId)
                ? prev.filter((id) => id !== customerId)
                : [...prev, customerId]
        );
    };

    const filteredCustomers = allCustomers.filter(
        (c) =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.type && c.type.toLowerCase().includes(customerSearch.toLowerCase()))
    );

    const formatBalance = (balance: number) => {
        const abs = Math.abs(balance);
        const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (balance > 0) return `${formatted} مدين`;
        if (balance < 0) return `${formatted} دائن`;
        return '0.00';
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="البحث في المجموعات..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-gray-400"
                    />
                </div>
                <button
                    onClick={openCreateForm}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl transition-colors mr-3"
                >
                    <Plus className="w-5 h-5" />
                    <span>إنشاء مجموعة</span>
                </button>
            </div>

            {/* Groups List */}
            {loading ? (
                <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                </div>
            ) : groups.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">لا توجد مجموعات</p>
                    <p className="text-sm mt-1">أنشئ مجموعة جديدة لربط العملاء ببعضهم</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((group, index) => (
                        <motion.div
                            key={group.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: Math.min(index * 0.1, 0.5) }}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{group.name}</h3>
                                    {group.notes && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.notes}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEditForm(group)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="تعديل"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(group)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="حذف"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                    <Users className="w-4 h-4" />
                                    <span>{group.customerCount} عميل</span>
                                </div>
                                <div className={`font-medium ${group.totalBalance > 0 ? 'text-red-600' : group.totalBalance < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {formatBalance(group.totalBalance)}
                                </div>
                            </div>

                            {group.customers && group.customers.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.customers.slice(0, 5).map((c) => (
                                            <span
                                                key={c.id}
                                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                                            >
                                                {c.name}
                                            </span>
                                        ))}
                                        {group.customers.length > 5 && (
                                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
                                                +{group.customers.length - 5} آخرين
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showForm && (
                <ModalOverlay>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto scrollbar-thin">
                        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingGroup ? 'تعديل المجموعة' : 'إنشاء مجموعة جديدة'}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Group Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    اسم المجموعة <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                                    placeholder="مثال: مجموعة شركات أحمد"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    ملاحظات
                                </label>
                                <textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all resize-none"
                                    placeholder="ملاحظات اختيارية"
                                />
                            </div>

                            {/* Customer Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    العملاء ({selectedCustomerIds.length} مُحدد)
                                </label>
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all text-sm"
                                    placeholder="ابحث عن عميل..."
                                />
                                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl">
                                    {filteredCustomers.length === 0 ? (
                                        <p className="p-3 text-sm text-gray-500 text-center">لا توجد نتائج</p>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <label
                                                key={customer.id}
                                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${selectedCustomerIds.includes(customer.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCustomerIds.includes(customer.id)}
                                                    onChange={() => toggleCustomer(customer.id)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-white flex-1">{customer.name}</span>
                                                {!customer.isActive && (
                                                    <span className="text-xs text-red-500">معطل</span>
                                                )}
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>جاري الحفظ...</span>
                                        </>
                                    ) : (
                                        <span>{editingGroup ? 'تحديث' : 'إنشاء'}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
}
