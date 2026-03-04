import { format } from 'date-fns';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface CustomsInvoice {
    id: string;
    date: Date;
    customerName: string;
    declarationNo: string;
    type: 'IMPORT' | 'EXPORT' | 'TRANSIT' | 'FREE';
    total: number;
    clearanceFees: number;
    customsDuties: number;
}

interface CustomsStatementPrintProps {
    startDate: string;
    endDate: string;
    selectedTypes: string[];
    invoices: CustomsInvoice[];
    totalCount: number;
    totalAmount: number;
    totalClearanceFees: number;
    totalCustomsDuties: number;
    onClose: () => void;
}

const TYPE_LABELS = {
    IMPORT: 'وارد',
    EXPORT: 'صادر',
    TRANSIT: 'ترانزيت',
    FREE: 'حر',
};

const TYPE_COLORS = {
    IMPORT: 'bg-blue-100 text-blue-800',
    EXPORT: 'bg-green-100 text-green-800',
    TRANSIT: 'bg-orange-100 text-orange-800',
    FREE: 'bg-purple-100 text-purple-800',
};

export default function CustomsStatementPrint({
    startDate,
    endDate,
    selectedTypes,
    invoices,
    totalCount,
    totalAmount,
    totalClearanceFees,
    totalCustomsDuties,
    onClose,
}: CustomsStatementPrintProps) {

    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const handlePrint = () => {
        // Get the statement content
        const printContent = document.getElementById('customs-statement-print-content');
        if (!printContent) return;

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Write the content to the new window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير البيانات والايرادات</title>
                <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    * { font-family: 'Tajawal', sans-serif; }
                    @media print {
                        @page { 
                            size: A4; 
                            margin: 5mm; 
                        }
                        * { 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                        }
                    }
                </style>
            </head>
            <body class="bg-white p-1">
                ${printContent.innerHTML}
            </body>
            </html>
        `);

        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        };
    };


    return (
        <>
            <ModalOverlay>
                <div className="bg-[#eef2f5] rounded-lg max-w-[210mm] max-h-[95vh] overflow-auto" onClick={(e) => e.stopPropagation()}>

                    {/* Print Controls */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center print:hidden z-10">
                        <h3 className="text-lg font-bold text-gray-900">معاينة تقرير البيانات والايرادات</h3>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                طباعة
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>

                    {/* Print Content */}
                    <div id="customs-statement-print-content" className="bg-white p-4">
                        <div className="max-w-full">
                            {/* Title & Date Range */}
                            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-800">
                                <div>
                                    <h2 className="text-2xl font-bold text-sky-700 mb-1">تقرير البيانات والايرادات</h2>
                                    <p className="text-sm font-bold text-blue-800 mb-1">
                                        الأنواع: {selectedTypes.map(t => TYPE_LABELS[t as keyof typeof TYPE_LABELS]).join(' - ')}
                                    </p>
                                    <p className="text-sm text-slate-500 font-medium">
                                        الفترة من {format(new Date(startDate), 'dd/MM/yyyy')} إلى {format(new Date(endDate), 'dd/MM/yyyy')}
                                    </p>
                                </div>
                                <div className="text-left flex flex-col items-center mt-1">
                                    <div className="text-lg font-bold text-sky-700 mb-1 uppercase tracking-wider">
                                        نظام ادارة العمليات الجمركية
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium text-center">إدارة التقارير المالية</div>
                                    <div className="text-[11px] text-slate-400 mt-1 text-center">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-sky-500 rounded-r-xl"></div>
                                    <p className="text-sm font-bold text-slate-600 mb-2">إجمالي عدد البيانات</p>
                                    <p className="text-2xl font-black text-slate-800">{totalCount}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-green-500 rounded-r-xl"></div>
                                    <p className="text-sm font-bold text-slate-600 mb-2">إجمالي مبالغ الفواتير</p>
                                    <p className="text-2xl font-black text-slate-800">{formatNumber(totalAmount)}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-orange-500 rounded-r-xl"></div>
                                    <p className="text-sm font-bold text-slate-600 mb-2">إجمالي أجور التخليص</p>
                                    <p className="text-2xl font-black text-slate-800">{formatNumber(totalClearanceFees)}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-red-500 rounded-r-xl"></div>
                                    <p className="text-sm font-bold text-slate-600 mb-2">إجمالي الرسوم الجمركية</p>
                                    <p className="text-2xl font-black text-slate-800">{formatNumber(totalCustomsDuties)}</p>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-hidden rounded-lg border border-gray-200 mb-8">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">العميل</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">رقم البيان</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">النوع</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">مبلغ الفاتورة</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">أجور التخليص</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الرسوم الجمركية</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {invoices.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                    لا توجد فواتير في هذه الفترة
                                                </td>
                                            </tr>
                                        ) : (
                                            invoices.map((invoice) => (
                                                <tr key={invoice.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                        {format(new Date(invoice.date), 'dd/MM/yyyy')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{invoice.customerName}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{invoice.declarationNo}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[invoice.type]}`}>
                                                            {TYPE_LABELS[invoice.type]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                                        {formatNumber(invoice.total)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-orange-600 whitespace-nowrap">
                                                        {formatNumber(invoice.clearanceFees)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-red-600 whitespace-nowrap">
                                                        {formatNumber(invoice.customsDuties)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </ModalOverlay>
        </>
    );
}