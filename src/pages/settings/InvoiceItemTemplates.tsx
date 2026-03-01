import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, FileText, Edit, X, Lock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess, showError, showConfirm } from '@/lib/toast';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface InvoiceItemTemplate {
    id: string;
    description: string;
    vatRate?: number;
    isProtected: boolean;
    sortOrder: number;
    createdAt: string;
}

export default function InvoiceItemTemplates() {
    const [templates, setTemplates] = useState<InvoiceItemTemplate[]>([]);
    const { requirePermission } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<InvoiceItemTemplate | null>(null);
    const [modalDescription, setModalDescription] = useState('');
    const [modalVatRate, setModalVatRate] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => { loadTemplates(); }, []);

    const loadTemplates = async () => {
        try {
            const response = await apiClient.getInvoiceItemTemplates();
            setTemplates(response);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalDescription.trim()) return;
        const duplicate = templates.find(t => t.description.toLowerCase() === modalDescription.trim().toLowerCase());
        if (duplicate) { showError('⚠️ هذا البند موجود مسبقاً في القائمة!'); return; }

        setSubmitting(true);
        try {
            await apiClient.createInvoiceItemTemplate({ description: modalDescription.trim(), vatRate: modalVatRate });
            setModalDescription(''); setModalVatRate(15); setShowModal(false);
            await loadTemplates();
            showSuccess('✅ تم إضافة البند بنجاح!');
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'حدث خطأ أثناء إضافة البند';
            showError(errorMsg.includes('unique') || errorMsg.includes('duplicate') ? '⚠️ هذا البند موجود مسبقاً!' : errorMsg);
        } finally { setSubmitting(false); }
    };

    const handleEditTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;
        setSubmitting(true);
        try {
            await apiClient.updateInvoiceItemTemplate(editingTemplate.id, { vatRate: modalVatRate });
            setEditingTemplate(null); setShowModal(false);
            await loadTemplates();
            showSuccess('✅ تم تحديث البند بنجاح!');
        } catch (error: any) {
            showError(error.response?.data?.message || 'حدث خطأ أثناء تحديث البند');
        } finally { setSubmitting(false); }
    };

    const handleDeleteTemplate = async (id: string, description: string, isProtected: boolean) => {
        if (!requirePermission('settings.delete')) return;
        if (isProtected) { showError(`❌ لا يمكن حذف البند "${description}" لأنه بند افتراضي محمي`); return; }
        showConfirm(
            `هل أنت متأكد من حذف البند "${description}"؟\nلا يمكن التراجع عن هذا الإجراء.`,
            async () => {
                try {
                    await apiClient.deleteInvoiceItemTemplate(id);
                    await loadTemplates();
                    showSuccess('✅ تم حذف البند بنجاح');
                } catch (error: any) {
                    showError(error.response?.data?.message || 'حدث خطأ أثناء حذف البند');
                }
            }
        );
    };

    const handleOpenAddModal = () => { setEditingTemplate(null); setModalDescription(''); setModalVatRate(0); setShowModal(true); };
    const handleOpenEditModal = (t: InvoiceItemTemplate) => { setEditingTemplate(t); setModalDescription(t.description); setModalVatRate(t.vatRate || 0); setShowModal(true); };
    const handleCloseModal = () => { setShowModal(false); setEditingTemplate(null); setModalDescription(''); setModalVatRate(0); };

    const filtered = templates.filter(t => t.description.toLowerCase().includes(search.toLowerCase()));

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">بنود الفواتير المحفوظة</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">إدارة البنود المحفوظة للاستخدام السريع عند إنشاء الفواتير</p>
                </div>
                <button onClick={handleOpenAddModal} className="btn-primary whitespace-nowrap">
                    <Plus className="w-5 h-5" /> إضافة بند
                </button>
            </div>

            {/* Table card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {templates.length} بند محفوظ
                        </span>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="بحث..."
                            className="w-full pr-9 pl-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
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
                            <FileText className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد بنود محفوظة'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">وصف البند</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ض.ق.م</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                <AnimatePresence>
                                    {filtered.map((template, idx) => (
                                        <motion.tr
                                            key={template.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15, delay: idx * 0.02 }}
                                            className="group hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors"
                                        >
                                            <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-gray-500 tabular-nums w-10">
                                                {idx + 1}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 opacity-80">
                                                        <FileText className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{template.description}</span>
                                                    {template.isProtected && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                                                            <Lock className="w-3 h-3" /> افتراضي
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${template.vatRate && template.vatRate > 0
                                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    {template.vatRate && template.vatRate > 0 ? `${template.vatRate}%` : '0%'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenEditModal(template)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" /> تعديل
                                                    </button>
                                                    {template.isProtected ? (
                                                        <div className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 dark:text-gray-500 cursor-not-allowed">
                                                            <Lock className="w-3.5 h-3.5" /> محمي
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeleteTemplate(template.id, template.description, template.isProtected)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> حذف
                                                        </button>
                                                    )}
                                                </div>
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
            <div className="flex items-start gap-3 bg-teal-50 dark:bg-teal-900/15 border border-teal-100 dark:border-teal-900/40 rounded-xl p-4">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-teal-800 dark:text-teal-200 leading-relaxed">
                    <strong>ملاحظة:</strong> البنود المحفوظة تظهر كاقتراحات عند إنشاء الفواتير. البنود المميزة بـ <strong>"افتراضي"</strong> لا يمكن حذفها.
                </p>
            </div>

            {/* Modal */}
            {showModal && (
                <ModalOverlay>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-l from-teal-500 to-teal-600 px-5 py-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                {editingTemplate ? <><Edit className="w-4 h-4" /> تعديل بند</> : <><Plus className="w-4 h-4" /> إضافة بند جديد</>}
                            </h3>
                            <button onClick={handleCloseModal} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                        <form onSubmit={editingTemplate ? handleEditTemplate : handleAddTemplate} className="p-5 space-y-4">
                            {!editingTemplate ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">وصف البند</label>
                                    <input
                                        type="text" value={modalDescription} onChange={e => setModalDescription(e.target.value)}
                                        placeholder="مثال: رسوم تخليص جمركي"
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:bg-gray-700 dark:text-white text-sm transition-all"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 mb-1">وصف البند</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{modalDescription}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">نسبة ضريبة القيمة المضافة (%)</label>
                                <input
                                    type="number" value={modalVatRate} onChange={e => setModalVatRate(Number(e.target.value))}
                                    min="0" max="100" step="0.01" placeholder="15"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:bg-gray-700 dark:text-white text-sm transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || (!editingTemplate && !modalDescription.trim())}
                                    className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                                    ) : editingTemplate ? (
                                        <><Edit className="w-4 h-4" /> تحديث</>
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