import { format } from 'date-fns';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface BankTransaction {
    id: string;
    type: string;
    amount: number;
    note: string;
    partyName?: string;
    voucherType?: string;
    created_at: string;
    voucher_code?: string;
    balanceAfter?: number;
}

interface BankReportPrintProps {
    accountName: string;
    accountNo: string;
    startDate: string;
    endDate: string;
    transactions: BankTransaction[];
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    onClose: () => void;
}

export default function BankReportPrint({
    accountName,
    accountNo,
    startDate,
    endDate,
    transactions,
    openingBalance,
    totalDebit,
    totalCredit,
    closingBalance,
    onClose,
}: BankReportPrintProps) {

    const handlePrint = () => {
        const printContent = document.getElementById('bank-report-print-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير حركة الحسابات البنكية</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          * { font-family: 'Tajawal', sans-serif; }
          @media print {
            @page { size: A4; margin: 10mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body class="bg-white p-1">
        ${printContent.innerHTML}
      </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        };
    };

    return (
        <ModalOverlay>
            <div className="bg-[#eef2f5] rounded-lg max-w-[210mm] max-h-[95vh] overflow-auto" onClick={(e) => e.stopPropagation()}>

                {/* Print Controls */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center print:hidden z-10">
                    <h3 className="text-lg font-bold text-gray-900">معاينة تقرير حركة الحسابات البنكية</h3>
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
                <div id="bank-report-print-content" className="bg-white p-8">
                    <div className="max-w-full">
                        {/* Title & Date Range */}
                        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-800">
                            <div>
                                <h2 className="text-2xl font-bold text-emerald-700 mb-1">كشف حركة الحساب البنكي</h2>
                                <p className="text-sm font-bold text-blue-800 mb-1">
                                    {accountName} <span className="text-slate-500 font-normal">({accountNo})</span>
                                </p>
                                <p className="text-sm text-slate-500 font-medium">
                                    الفترة من {format(new Date(startDate), 'dd/MM/yyyy')} إلى {format(new Date(endDate), 'dd/MM/yyyy')}
                                </p>
                            </div>
                            <div className="text-left flex flex-col items-center mt-1">
                                <div className="text-lg font-bold text-emerald-700 mb-1 uppercase tracking-wider">
                                    نظام ادارة العمليات الجمركية
                                </div>
                                <div className="text-xs text-slate-500 font-medium text-center">إدارة التقارير المالية</div>
                                <div className="text-[11px] text-slate-400 mt-1 text-center">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {/* Opening Balance */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1 h-full bg-slate-400"></div>
                                <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">رصيد أول المدة</p>
                                <p className="text-xl font-extrabold text-slate-800">{openingBalance.toFixed(2)}</p>
                                <p className="text-xs text-slate-400 mt-1">ريال</p>
                            </div>

                            {/* Total In (Debit) */}
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                                <p className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">إجمالي المقبوضات</p>
                                <p className="text-xl font-extrabold text-emerald-700">{totalDebit.toFixed(2)}</p>
                                <p className="text-xs text-emerald-600/70 mt-1">ريال</p>
                            </div>

                            {/* Total Out (Credit) */}
                            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
                                <p className="text-xs font-bold text-rose-600 mb-1 uppercase tracking-wider">إجمالي المدفوعات</p>
                                <p className="text-xl font-extrabold text-rose-700">{totalCredit.toFixed(2)}</p>
                                <p className="text-xs text-rose-600/70 mt-1">ريال</p>
                            </div>

                            {/* Closing Balance */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1 h-full bg-blue-600"></div>
                                <p className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">رصيد آخر المدة</p>
                                <p className="text-xl font-extrabold text-blue-800">{closingBalance.toFixed(2)}</p>
                                <p className="text-xs text-blue-500/70 mt-1">ريال</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">رقم السند</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">البيان</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">مدين</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">دائن</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr className="bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900" colSpan={3}>رصيد أول المدة</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">-</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">-</td>
                                        <td className="px-4 py-3 text-sm font-bold text-blue-600">{openingBalance.toFixed(2)}</td>
                                    </tr>

                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-blue-600">{tx.voucher_code || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {format(new Date(tx.created_at), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {tx.voucherType === 'INTERNAL_TRANSFER'
                                                    ? (tx.note || '')
                                                    : (
                                                        <>
                                                            {tx.note || ''}
                                                            {tx.partyName && <span className="text-gray-500"> - {tx.partyName}</span>}
                                                        </>
                                                    )
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                                {tx.type === 'receipt' ? tx.amount.toFixed(2) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-red-600">
                                                {tx.type === 'payment' ? tx.amount.toFixed(2) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                                {(tx.balanceAfter ?? 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}

                                    <tr className="bg-green-50 font-semibold">
                                        <td className="px-4 py-3 text-sm text-gray-900" colSpan={3}>الإجماليات</td>
                                        <td className="px-4 py-3 text-sm text-green-600">{totalDebit.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-red-600">{totalCredit.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-blue-600">{closingBalance.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
}