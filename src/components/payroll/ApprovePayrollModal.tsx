import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface PayrollRun {
    id: string;
    month: string;
    status: 'DRAFT' | 'APPROVED';
    totalNet: number;
    items: any[];
}

interface ApprovePayrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    payrollRun: PayrollRun | null;
}

export function ApprovePayrollModal({ isOpen, onClose, payrollRun }: ApprovePayrollModalProps) {
    const queryClient = useQueryClient();

    const approveMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            apiClient.approvePayrollRun({ id, ...data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
            onClose();
        },
    });

    const handleApprove = () => {
        if (!payrollRun) return;

        if (window.confirm('هل أنت متأكد من اعتماد كشف الرواتب؟ لن تتمكن من تعديله بعد الاعتماد.')) {
            approveMutation.mutate({
                id: payrollRun.id,
                data: {},
            });
        }
    };

    if (!isOpen || !payrollRun) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={onClose}
                />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
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
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                سيتم اعتماد كشف الرواتب ولن تتمكن من تعديله بعد ذلك.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">الشهر:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {new Date(payrollRun.month).toLocaleDateString('en-GB', {
                                        year: 'numeric',
                                        month: 'long',
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">عدد الموظفين:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {payrollRun.items?.length || 0}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">إجمالي الصافي:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {Number(payrollRun.totalNet).toLocaleString('en-US')} ر.س
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={approveMutation.isPending}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {approveMutation.isPending ? 'جاري الاعتماد...' : 'اعتماد'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
