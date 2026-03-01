import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PayrollPreviewModal } from './PayrollPreviewModal';
import { ApprovePayrollModal } from './ApprovePayrollModal';


interface PayrollRun {
    id: string;
    month: string;
    status: 'DRAFT' | 'APPROVED';
    totalNet: number;
    approvedAt?: string;
    createdAt: string;
    items: any[];
}

export function PayrollTab() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<'all' | 'DRAFT' | 'APPROVED'>('all');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewRun, setPreviewRun] = useState<PayrollRun | null>(null);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [approveRun, setApproveRun] = useState<PayrollRun | null>(null);

    // Fetch payroll runs
    const { data, isLoading } = useQuery({
        queryKey: ['payrollRuns', statusFilter],
        queryFn: async () => {
            const params: any = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            const response = await apiClient.getPayrollRuns(params);
            return response?.data || [];
        },
    });

    const payrollRuns = data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.deletePayrollRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
        },
    });

    // Unapprove mutation
    const unapproveMutation = useMutation({
        mutationFn: (id: string) => apiClient.unapprovePayrollRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
        },
    });

    const handleDeletePayrollRun = async (run: PayrollRun) => {
        if (run.status === 'APPROVED') {
            alert('لا يمكن حذف كشف رواتب معتمد');
            return;
        }
        if (window.confirm('هل أنت متأكد من حذف كشف الرواتب؟')) {
            deleteMutation.mutate(run.id);
        }
    };

    const handleUnapprove = async (run: PayrollRun) => {
        if (window.confirm('هل أنت متأكد من إلغاء اعتماد كشف الرواتب؟')) {
            unapproveMutation.mutate(run.id);
        }
    };

    const handlePreview = (run: PayrollRun) => {
        setPreviewRun(run);
        setIsPreviewOpen(true);
    };

    const handleApprove = (run: PayrollRun) => {
        setApproveRun(run);
        setIsApproveOpen(true);
    };

    const formatMonth = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        كشوف الرواتب
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        إدارة كشوف الرواتب الشهرية
                    </p>
                </div>
                <button
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    إنشاء كشف رواتب
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                    <option value="all">جميع الحالات</option>
                    <option value="DRAFT">مسودة</option>
                    <option value="APPROVED">معتمد</option>
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
            ) : payrollRuns.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    لا توجد كشوف رواتب
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    الشهر
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    عدد الموظفين
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    إجمالي الصافي
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    الحالة
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    تاريخ الاعتماد
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {payrollRuns.map((run: PayrollRun) => (
                                <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {formatMonth(run.month)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {run.items?.length || 0} موظف
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {Number(run.totalNet).toLocaleString('en-US')} ر.س
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${run.status === 'APPROVED'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                }`}
                                        >
                                            {run.status === 'APPROVED' ? 'معتمد' : 'مسودة'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {run.approvedAt
                                            ? new Date(run.approvedAt).toLocaleDateString('en-GB')
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePreview(run)}
                                                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                title="معاينة"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {run.status === 'DRAFT' && (
                                                <>
                                                    <button
                                                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                        title="تعديل"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(run)}
                                                        className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                        title="اعتماد"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePayrollRun(run)}
                                                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {run.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleUnapprove(run)}
                                                    className="p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                                                    title="إلغاء الاعتماد"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            <PayrollPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                payrollRun={previewRun}
            />
            <ApprovePayrollModal
                isOpen={isApproveOpen}
                onClose={() => setIsApproveOpen(false)}
                payrollRun={approveRun}
            />
        </div>
    );
}
