import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Receipt } from 'lucide-react';

import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
interface InvoiceItemCategory {
    id: string;
    name: string;
    createdAt: string;
}

export default function InvoiceItemCategories() {
    const [categories, setCategories] = useState<InvoiceItemCategory[]>([]);
    const { requirePermission } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const response = await apiClient.getInvoiceItemCategories();
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
            await apiClient.createInvoiceItemCategory({ name: newCategoryName.trim() });
            setNewCategoryName('');
            setShowAddForm(false);
            await loadCategories();
        } catch (error: any) {
            console.error('Error creating category:', error);
            showError(error.response?.data?.message || 'حدث خطأ أثناء إضافة التصنيف');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!requirePermission('settings.delete')) return;
        showConfirm(
            `هل أنت متأكد من حذف التصنيف "${name}"؟`,
            async () => {
                try {
                    await apiClient.deleteInvoiceItemCategory(id);
                    await loadCategories();
                    showSuccess('تم حذف التصنيف بنجاح');
                } catch (error: any) {
                    console.error('Error deleting category:', error);
                    showError(error.response?.data?.message || 'حدث خطأ أثناء حذف التصنيف');
                }
            }
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-gray-500 dark:text-gray-400">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        تصنيفات بنود الفواتير
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        إدارة تصنيفات بنود الفواتير (رسوم التخليص، النقل، التحميل، إلخ)
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary"
                >
                    <Plus className="w-5 h-5" />
                    إضافة تصنيف
                </button>
            </div>

            {/* Add Category Form */}
            {showAddForm && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        إضافة تصنيف جديد
                    </h3>
                    <form onSubmit={handleAddCategory} className="flex gap-3">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="اسم التصنيف (مثال: رسوم تخليص، رسوم نقل)"
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={submitting || !newCategoryName.trim()}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(false);
                                setNewCategoryName('');
                            }}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            إلغاء
                        </button>
                    </form>
                </div>
            )}

            {/* Categories List */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {categories.length === 0 ? (
                    <div className="p-12 text-center">
                        <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            لا توجد تصنيفات. اضغط "إضافة تصنيف" لإنشاء تصنيف جديد.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                                        اسم التصنيف
                                    </th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                                        تاريخ الإنشاء
                                    </th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                        الإجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {categories.map((category) => (
                                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-gray-400" />
                                                {category.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(category.createdAt).toLocaleDateString('ar-SA')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDeleteCategory(category.id, category.name)}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>ملاحظة:</strong> التصنيفات تستخدم عند إنشاء الفواتير لتصنيف بنود الفاتورة (رسوم التخليص، النقل، التحميل، إلخ).
                </p>
            </div>
        </div>
    );
}
