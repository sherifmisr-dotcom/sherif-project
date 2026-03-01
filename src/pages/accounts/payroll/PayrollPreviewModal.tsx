import { X, Printer } from 'lucide-react';
import ModalOverlay from '@/components/ui/ModalOverlay';


interface PayrollRun {
    id: string;
    month: string;
    status: string;
    totalNet: number;
    items: Array<{
        id: string;
        employee: { name: string };
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

export default function PayrollPreviewModal({ isOpen, onClose, payrollRun }: PayrollPreviewModalProps) {
    const handlePrint = () => {
        window.print();
    };

    if (!isOpen || !payrollRun) return null;

    const monthName = new Date(payrollRun.month).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
    });

    return (
        <>
            <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #payroll-print-content,
          #payroll-print-content * {
            visibility: visible;
          }
          
          #payroll-print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .no-print {
            display: none !important;
          }
          
          table {
            width: 100%;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th, td {
            border: 1px solid #000 !important;
            padding: 8px !important;
            text-align: right !important;
            color: #000 !important;
          }
          
          thead {
            display: table-header-group;
            background-color: #f3f4f6 !important;
          }
          
          tfoot {
            display: table-footer-group;
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>

            <ModalOverlay>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Close Button - Top Right */}
                        <div className="flex justify-end no-print">
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Printable Content */}
                        <div id="payroll-print-content">
                            {/* Title - Centered */}
                            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
                                معاينة كشف الرواتب
                            </h2>

                            {/* Payroll Details */}
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                        {monthName}
                                    </h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            عدد الموظفين: <span className="font-medium text-gray-900 dark:text-white">{payrollRun.items.length}</span>
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            الحالة: <span className={`font-medium ${payrollRun.status.toUpperCase() === 'APPROVED' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {payrollRun.status.toUpperCase() === 'APPROVED' ? 'تم الاعتماد والصرف' : 'مسودة'}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300">#</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300">الموظف</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300">الأساسي</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300">البدلات</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300">الخصومات</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300">الصافي</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300">الملاحظات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payrollRun.items.map((item, index) => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300">{index + 1}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border border-gray-300">{item.employee.name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300">{parseFloat(String(item.base)).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300">{parseFloat(String(item.allowances)).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300">{parseFloat(String(item.deductions)).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border border-gray-300">{parseFloat(String(item.net)).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-sm border border-gray-300" style={{ minWidth: '150px', height: '40px' }}>
                                                        {/* Empty space for manual notes */}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white border border-gray-300">
                                                    الإجمالي:
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border border-gray-300">
                                                    {parseFloat(String(payrollRun.totalNet)).toFixed(2)} ريال
                                                </td>
                                                <td className="border border-gray-300"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - Bottom */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 no-print">
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            </ModalOverlay>
        </>
    );
}