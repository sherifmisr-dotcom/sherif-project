import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Save, RotateCcw, DollarSign, TrendingDown } from 'lucide-react';
import { showSuccess, showError, showWarning, showConfirm } from '@/lib/toast';

interface InvoiceItemTemplate {
    id: string;
    description: string;
}

interface ExpenseCategory {
    id: string;
    name: string;
}



export default function IncomeStatementSettings() {
    const [templates, setTemplates] = useState<InvoiceItemTemplate[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, categoriesData, settingsData] = await Promise.all([
                apiClient.getInvoiceItemTemplates(),
                apiClient.getExpenseCategories(),
                apiClient.getIncomeStatementSettings(),
            ]);

            setTemplates(templatesData);
            setCategories(categoriesData);
            setSelectedTemplateIds(settingsData.revenueItemTemplateIds || []);
            setSelectedCategoryIds(settingsData.expenseCategoryIds || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showError('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateToggle = (id: string) => {
        setSelectedTemplateIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
    };

    const handleCategoryToggle = (id: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const handleSelectAllTemplates = () => {
        setSelectedTemplateIds(templates.map(t => t.id));
    };

    const handleDeselectAllTemplates = () => {
        setSelectedTemplateIds([]);
    };

    const handleSelectAllCategories = () => {
        setSelectedCategoryIds(categories.map(c => c.id));
    };

    const handleDeselectAllCategories = () => {
        setSelectedCategoryIds([]);
    };

    const handleSave = async () => {
        if (selectedTemplateIds.length === 0) {
            showWarning('يجب اختيار بند واحد على الأقل من مصادر الإيرادات');
            return;
        }

        if (selectedCategoryIds.length === 0) {
            showWarning('يجب اختيار تصنيف واحد على الأقل من المصروفات');
            return;
        }

        setSaving(true);
        try {
            await apiClient.updateIncomeStatementSettings({
                revenueItemTemplateIds: selectedTemplateIds,
                expenseCategoryIds: selectedCategoryIds,
            });
            showSuccess('تم حفظ الإعدادات بنجاح');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            showError(error.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        showConfirm(
            'هل أنت متأكد من استعادة الإعدادات الافتراضية؟',
            () => {
                setSelectedTemplateIds(templates.map(t => t.id));
                setSelectedCategoryIds(categories.map(c => c.id));
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
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    إعدادات قائمة الدخل
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    حدد البنود والتصنيفات التي ستظهر في قائمة الدخل
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Sources */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                مصادر الإيرادات
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSelectAllTemplates}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                تحديد الكل
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                                onClick={handleDeselectAllTemplates}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                إلغاء الكل
                            </button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        اختر بنود الفواتير التي تُحسب كإيرادات
                    </p>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {templates.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                لا توجد بنود محفوظة. أضف بنوداً من صفحة "بنود الفواتير المحفوظة"
                            </p>
                        ) : (
                            templates.map((template) => (
                                <label
                                    key={template.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTemplateIds.includes(template.id)}
                                        onChange={() => handleTemplateToggle(template.id)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {template.description}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            محدد: {selectedTemplateIds.length} من {templates.length}
                        </p>
                    </div>
                </div>

                {/* Expense Categories */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                تصنيفات المصروفات
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSelectAllCategories}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                تحديد الكل
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                                onClick={handleDeselectAllCategories}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                إلغاء الكل
                            </button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        اختر تصنيفات المصروفات التي تظهر في القائمة
                    </p>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {categories.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                لا توجد تصنيفات. أضف تصنيفات من صفحة "تصنيفات المصروفات"
                            </p>
                        ) : (
                            categories.map((category) => (
                                <label
                                    key={category.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCategoryIds.includes(category.id)}
                                        onChange={() => handleCategoryToggle(category.id)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {category.name}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            محدد: {selectedCategoryIds.length} من {categories.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    استعادة الافتراضي
                </button>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>ملاحظة:</strong> ستظهر فقط البنود والتصنيفات المحددة في قائمة الدخل عند إنشائها من التقارير.
                </p>
            </div>
        </div>
    );
}
