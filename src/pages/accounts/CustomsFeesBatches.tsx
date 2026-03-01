import { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye, Calendar, DollarSign, FileText } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import BatchForm from './customs-fees/BatchForm';
import BatchDetails from './customs-fees/BatchDetails';
import { showSuccess, showError, showWarning, showConfirm } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';

interface CustomsFeeBatch {
    id: string;
    date: string;
    totalAmount: number;
    method: 'CASH' | 'BANK_TRANSFER';
    notes?: string;
    createdAt: string;
    voucher: {
        id: string;
        code: string;
    };
    bankAccount?: {
        id: string;
        accountNo: string;
        bank: {
            name: string;
        };
    };
    createdByUser: {
        username: string;
    };
    items: Array<{
        id: string;
        customsNo: string;
        amount: number;
        invoices: Array<{
            id: string;
            code: string;
            type: string;
        }>;
    }>;
}

export default function CustomsFeesBatches() {
    const { requirePermission } = usePermissions();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<CustomsFeeBatch | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [limit, setLimit] = useState(8);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['customs-fee-batches'],
        queryFn: () => apiClient.getCustomsFeeBatches(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.deleteCustomsFeeBatch(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customs-fee-batches'] });
            showSuccess('تم حذف الدفعة بنجاح');
        },
        onError: (error: any) => {
            showError(error.response?.data?.message || 'حدث خطأ أثناء حذف الدفعة');
        },
    });

    const handleDelete = async (batch: CustomsFeeBatch) => {
        const linkedCount = batch.items.filter(item => item.invoices.length > 0).length;

        if (linkedCount > 0) {
            showWarning(`لا يمكن حذف الدفعة - هناك ${linkedCount} بيان مربوط بفواتير`);
            return;
        }

        showConfirm(
            `هل أنت متأكد من حذف دفعة الرسوم الجمركية؟\nسيتم حذف السند المرتبط وعكس العملية المحاسبية`,
            () => {
                deleteMutation.mutate(batch.id);
            }
        );
    };

    const handleViewDetails = (batch: CustomsFeeBatch) => {
        setSelectedBatch(batch);
        setDetailsOpen(true);
    };

    const handleLoadMore = () => {
        setLimit(prev => prev + 8);
    };

    const allBatches: CustomsFeeBatch[] = data?.data || [];

    // Filter batches by current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthBatches = allBatches.filter(batch => {
        const batchDate = new Date(batch.date);
        return batchDate.getMonth() === currentMonth && batchDate.getFullYear() === currentYear;
    });

    // Slice to show limited batches
    const batches = currentMonthBatches.slice(0, limit);

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            دفعات الرسوم الجمركية
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            إدارة دفعات الرسوم الجمركية المدفوعة
                        </p>
                    </div>
                    {requirePermission('accounts.customs_fees.create_batch') && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            دفعة جديدة
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
                    </div>
                ) : batches.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">لا توجد دفعات مسجلة</p>
                        {requirePermission('accounts.customs_fees.create_batch') && (
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                            >
                                إنشاء أول دفعة
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {batches.map((batch) => {
                            const linkedCount = batch.items.filter(item => item.invoices.length > 0).length;
                            const canDeleteBatch = linkedCount === 0;

                            return (
                                <div
                                    key={batch.id}
                                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">التاريخ</p>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {format(new Date(batch.date), 'dd MMMM yyyy', { locale: ar })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المبلغ الإجمالي</p>
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-green-600" />
                                                    <p className="text-sm font-bold text-green-600">
                                                        {batch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">طريقة الدفع</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {batch.method === 'CASH' ? 'نقدي' :
                                                        `تحويل بنكي - ${batch.bankAccount?.bank.name}`}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">عدد البيانات</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {batch.items.length} بيان
                                                    {linkedCount > 0 && (
                                                        <span className="text-xs text-green-600 mr-2">
                                                            ({linkedCount} مربوط)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mr-4">
                                            {requirePermission('accounts.customs_fees.view_details') && (
                                                <button
                                                    onClick={() => handleViewDetails(batch)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="عرض التفاصيل"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            )}
                                            {requirePermission('accounts.customs_fees.delete') && (
                                                <button
                                                    onClick={() => handleDelete(batch)}
                                                    disabled={!canDeleteBatch}
                                                    className={`p-2 rounded-lg transition-colors ${canDeleteBatch
                                                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        : 'text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    title={canDeleteBatch ? 'حذف' : 'لا يمكن الحذف - بعض البيانات مربوطة بفواتير'}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {batch.notes && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ملاحظات</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{batch.notes}</p>
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>السند: {batch.voucher.code}</span>
                                        <span>بواسطة: {batch.createdByUser.username}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Load More Button */}
                {!isLoading && batches.length > 0 && batches.length < currentMonthBatches.length && (
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={handleLoadMore}
                            className="px-6 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            تحميل المزيد
                        </button>
                    </div>
                )}

                {isFormOpen && (
                    <BatchForm
                        onClose={() => setIsFormOpen(false)}
                        onSuccess={() => {
                            setIsFormOpen(false);
                            queryClient.invalidateQueries({ queryKey: ['customs-fee-batches'] });
                        }}
                    />
                )}

                {detailsOpen && selectedBatch && (
                    <BatchDetails
                        batch={selectedBatch}
                        onClose={() => {
                            setDetailsOpen(false);
                            setSelectedBatch(null);
                        }}
                    />
                )}
            </div>
        </PageTransition>
    );
}
