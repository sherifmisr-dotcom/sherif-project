import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Tag, Lock, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface ExpenseCategory {
    id: string;
    name: string;
    isProtected: boolean;
    sortOrder: number;
    createdAt: string;
}

export default function ExpenseCategories() {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const { requirePermission } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => { loadCategories(); }, []);

    const loadCategories = async () => {
        try {
            const response = await apiClient.getExpenseCategories();
            setCategories(response);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setSubmitting(true);
        try {
            await apiClient.createExpenseCategory({ name: newCategoryName.trim() });
            setNewCategoryName('');
            setShowModal(false);
            await loadCategories();
            showSuccess('✅ تم إضافة التصنيف بنجاح!');
        } catch (error: any) {
            showError(error.response?.data?.message || 'حدث خطأ أثناء إضافة التصنيف');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: string, name: string, isProtected: boolean) => {
        if (!requirePermission('settings.delete')) return;
        if (isProtected) { showError(`❌ لا يمكن حذف "${name}" لأنه تصنيف افتراضي محمي`); return; }
        showConfirm(
            `هل أنت متأكد من حذف التصنيف "${name}"؟`,
            async () => {
                try {
                    await apiClient.deleteExpenseCategory(id);
                    await loadCategories();
                    showSuccess('✅ تم حذف التصنيف بنجاح');
                } catch (error: any) {
                    showError(error.response?.data?.message || 'حدث خطأ أثناء حذف التصنيف');
                }
            }
        );
    };

    const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">تصنيفات المصروفات</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">إدارة تصنيفات المصروفات المستخدمة في سندات الصرف</p>
                </div>
                <button onClick={() => { setNewCategoryName(''); setShowModal(true); }} className="btn-primary whitespace-nowrap">
                    <Plus className="w-5 h-5" /> إضافة تصنيف
                </button>
            </div>

            {/* Table card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {categories.length} تصنيف
                        </span>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="بحث..."
                            className="w-full pr-9 pl-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Tag className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد تصنيفات محفوظة'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">اسم التصنيف</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">تاريخ الإنشاء</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                <AnimatePresence>
                                    {filtered.map((category, idx) => (
                                        <motion.tr
                                            key={category.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15, delay: idx * 0.02 }}
                                            className="group hover:bg-purple-50/40 dark:hover:bg-purple-900/10 transition-colors"
                                        >
                                            <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-gray-500 tabular-nums">
                                                {idx + 1}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 opacity-80">
                                                        <Tag className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</span>
                                                    {category.isProtected && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                                                            <Lock className="w-3 h-3" /> افتراضي
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(category.createdAt).toLocaleDateString('ar-SA')}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                {category.isProtected ? (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 dark:text-gray-500 cursor-not-allowed" title="هذا التصنيف محمي">
                                                        <Lock className="w-3.5 h-3.5" /> محمي
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeleteCategory(category.id, category.name, category.isProtected)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> حذف
                                                    </button>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-900/15 border border-purple-100 dark:border-purple-900/40 rounded-xl p-4">
                <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
                    <strong>ملاحظة:</strong> التصنيفات المستخدمة في سندات الصرف تظهر في قائمة الدخل تحت قسم المصروفات. التصنيفات <strong>"الافتراضية"</strong> لا يمكن حذفها.
                </p>
            </div>

            {/* Add Modal */}
            {showModal && (
                <ModalOverlay>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-l from-purple-500 to-purple-600 px-5 py-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                <Plus className="w-4 h-4" /> إضافة تصنيف جديد
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCategory} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">اسم التصنيف</label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="مثال: رواتب ومكافآت"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm transition-all"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !newCategoryName.trim()}
                                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                                    ) : (
                                        <><Plus className="w-4 h-4" /> حفظ</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
}
