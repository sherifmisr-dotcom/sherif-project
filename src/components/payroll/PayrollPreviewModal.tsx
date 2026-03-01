import { X, Printer } from 'lucide-react';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface PayrollRun {
    id: string;
    month: string;
    status: 'DRAFT' | 'APPROVED';
    totalNet: number;
    approvedAt?: string;
    items: Array<{
        id: string;
        employee: {
            id: string;
            name: string;
            department?: string;
        };
        base: number;
        allowances: number;
        deductions: number;
        net: number;
    }>;
}

interface PayrollPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    payrollRun: PayrollRun | null;
}

export function PayrollPreviewModal({ isOpen, onClose, payrollRun }: PayrollPreviewModalProps) {
    if (!isOpen || !payrollRun) return null;

    const handlePrint = () => {
        window.print();
    };

    const formatMonth = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={onClose}
                />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            معاينة كشف الرواتب - {formatMonth(payrollRun.month)}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                title="طباعة"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">الحالة</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {payrollRun.status === 'APPROVED' ? 'معتمد' : 'مسودة'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">عدد الموظفين</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {payrollRun.items?.length || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الصافي</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {Number(payrollRun.totalNet).toLocaleString('en-US')} ر.س
                                </p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            الموظف
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            القسم
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            الأساسي
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            البدلات
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            الخصومات
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            الصافي
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {payrollRun.items?.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {item.employee.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {item.employee.department || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {Number(item.base).toLocaleString('en-US')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {Number(item.allowances).toLocaleString('en-US')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                {Number(item.deductions).toLocaleString('en-US')}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {Number(item.net).toLocaleString('en-US')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
