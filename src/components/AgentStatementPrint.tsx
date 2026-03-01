import React from 'react';
import ModalOverlay from '@/components/ui/ModalOverlay';

// --- 1. تعريف واجهات البيانات (Types) ---
export interface Transaction {
    id: string;
    date: string;
    count: string;       // عدد الشاحنات
    vessel: string;      // العبارة
    description: string; // البيان
    credit: number;      // دائن
    debit: number;       // مدين
    balance: number;     // الرصيد
}

export interface StatementData {
    companyName: string;
    companyNameEn: string;
    phone?: string;
    taxNumber: string;
    licenseNumber: string;
    logoPath?: string;
    statementNo: string;
    agentName: string;
    agentTaxNumber: string;
    startDate: string;
    endDate: string;
    openingBalance: number;
    transactions: Transaction[];
    totalCredit: number;
    totalDebit: number;
    finalBalance: number;
    balanceInWords: string;
}

interface AgentStatementProps {
    data: StatementData;
    onClose: () => void;
}

// --- 2. المكون الأساسي ---
export const AgentStatementPrint: React.FC<AgentStatementProps> = ({ data, onClose }) => {

    // دالة مساعدة لتنسيق الأرقام
    const formatNumber = (num: number) => {
        if (num === 0) return '-';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const handlePrint = () => {
        // Get the statement content
        const printContent = document.getElementById('agent-statement-print-content');
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
                <title>كشف حساب وكيل - ${data.agentName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    * { font-family: 'Tajawal', sans-serif; }
                    .print-header {
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        align-items: flex-start !important;
                    }
                    .print-logo {
                        width: 80px !important;
                        height: 80px !important;
                        flex-shrink: 0 !important;
                    }
                    .print-logo img {
                        max-width: 100% !important;
                        max-height: 100% !important;
                        object-fit: contain !important;
                    }
                    .print-info-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 1rem !important;
                    }
                    .print-summary-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr 1fr !important;
                        gap: 0.75rem !important;
                    }
                    @media print {
                        @page { 
                            size: A4; 
                            margin: 0.33in 0.31in; 
                        }
                        * { 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                        }
                        table {
                            page-break-inside: auto;
                            width: 100% !important;
                            table-layout: fixed !important;
                        }
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        thead {
                            display: table-header-group;
                        }
                        tfoot {
                            display: table-footer-group;
                        }
                        /* منع تقسيم الإجماليات والرصيد */
                        .summary-section {
                            page-break-inside: avoid !important;
                            page-break-before: auto;
                        }
                        .balance-words {
                            page-break-inside: avoid !important;
                        }
                        .signatures {
                            page-break-inside: avoid !important;
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
                <div className="bg-[#eef2f5] rounded-lg max-w-full md:max-w-[210mm] max-h-[95vh] overflow-auto" onClick={(e) => e.stopPropagation()}>

                    {/* Print Controls */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center print:hidden z-10 gap-2">
                        <h3 className="text-lg font-bold text-gray-900">معاينة كشف حساب الوكيل</h3>
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

                    {/* Statement Content */}
                    <div id="agent-statement-print-content" className="bg-white p-3 md:p-8" dir="rtl">
                        <div className="max-w-full">

                            {/* Header */}
                            {/* Header */}
                            <header className="print-header border-b-2 border-blue-900 pb-6 mb-8 gap-3" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-bold text-blue-900 mb-1">{data.companyName}</h1>
                                    <h2 className="text-sm font-medium text-gray-500 mb-2">{data.companyNameEn}</h2>
                                    <div className="flex flex-wrap gap-2 md:gap-5 text-xs text-gray-600">
                                        <span><strong className="text-blue-900">جوال:</strong> {data.phone || '---'}</span>
                                        <span className="text-gray-300">|</span>
                                        <span><strong className="text-blue-900">الرقم الضريبي:</strong> {data.taxNumber}</span>
                                        <span className="text-gray-300">|</span>
                                        <span><strong className="text-blue-900">ترخيص رقم:</strong> {data.licenseNumber}</span>
                                    </div>
                                </div>

                                {/* Logo */}
                                <div className="print-logo flex items-center justify-center" style={{ width: '80px', height: '80px', flexShrink: 0 }}>
                                    {data.logoPath ? (
                                        <img
                                            src={`http://localhost:3000${data.logoPath}`}
                                            alt="Company Logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-300">
                                            <span className="text-sm text-slate-400">شعار</span>
                                        </div>
                                    )}
                                </div>
                            </header>

                            {/* Title Bar */}
                            <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-md p-3 mb-8">
                                <h2 className="text-lg font-bold text-blue-900 m-0">كشف حساب وكيل ملاحي</h2>
                                <div className="text-left">
                                    <h2 className="text-lg font-bold text-blue-900 m-0">Agent Statement</h2>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="print-info-grid mb-8" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {/* Box 1: Agent Info */}
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-200 border-r-4 border-r-blue-900">
                                    <h3 className="text-sm font-bold text-blue-900 mb-2 pb-1 border-b border-gray-300">بيانات الوكيل</h3>
                                    <InfoRow label="الاسم" value={data.agentName} />
                                </div>

                                {/* Box 2: Period */}
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-200 border-r-4 border-r-blue-900">
                                    <h3 className="text-sm font-bold text-blue-900 mb-2 pb-1 border-b border-gray-300">فترة الكشف</h3>
                                    <div className="flex items-center gap-4 text-[13px]">
                                        <span><span className="text-gray-500">من:</span> <span className="font-bold text-gray-900">{data.startDate}</span></span>
                                        <span><span className="text-gray-500">إلى:</span> <span className="font-bold text-gray-900">{data.endDate}</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto mb-4 md:mb-6">
                                <table className="w-full text-[13px] border-collapse" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '12%' }} />
                                        <col style={{ width: 'auto' }} />
                                        <col style={{ width: '8%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                    </colgroup>
                                    <thead className="bg-blue-900 text-white">
                                        <tr>
                                            <th className="p-2 text-center font-medium">التاريخ</th>
                                            <th className="p-2 text-center font-medium">البيــــــــــــــــــــــان</th>
                                            <th className="p-2 text-center font-medium whitespace-nowrap">عدد الشاحنات</th>
                                            <th className="p-2 text-center font-bold">دائن</th>
                                            <th className="p-2 text-center font-bold">مدين</th>
                                            <th className="p-2 text-center font-bold">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-800">
                                        <tr className="border-b border-gray-200 bg-slate-100">
                                            <td className="p-1.5 text-gray-600 text-center">{data.startDate}</td>
                                            <td className="p-1.5 text-gray-800 font-bold text-[12px] text-center">رصيد أول المدة</td>
                                            <td className="p-1.5 text-gray-800 text-center">-</td>
                                            <td className="p-1.5 text-center font-mono font-bold text-gray-800">-</td>
                                            <td className="p-1.5 text-center font-mono font-bold text-gray-800">-</td>
                                            <td className="p-1.5 text-center font-mono font-extrabold text-gray-800 bg-slate-100">
                                                {formatNumber(data.openingBalance)}
                                            </td>
                                        </tr>
                                        {data.transactions.map((row, index) => (
                                            <tr key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-gray-50`}>
                                                <td className="p-1.5 text-gray-600 text-center">{row.date}</td>
                                                <td className="p-1.5 text-gray-800 text-[12px] text-center">{row.description}</td>
                                                <td className="p-1.5 text-gray-800 text-center">{row.count}</td>

                                                {/* دائن */}
                                                <td className="p-1.5 text-center font-mono font-bold text-gray-800">
                                                    {formatNumber(row.credit)}
                                                </td>

                                                {/* مدين */}
                                                <td className="p-1.5 text-center font-mono font-bold text-gray-800">
                                                    {formatNumber(row.debit)}
                                                </td>

                                                {/* الرصيد */}
                                                <td className="p-1.5 text-center font-mono font-extrabold text-gray-800 bg-slate-100">
                                                    {formatNumber(row.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Boxes */}
                            <div className="print-summary-grid mt-5 summary-section mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                <SummaryBox title="إجمالي الدائن" value={data.totalCredit} colorClass="text-blue-600" />
                                <SummaryBox title="إجمالي المدين" value={data.totalDebit} colorClass="text-blue-600" />

                                <div className={`p-4 rounded-md text-center border ${data.finalBalance >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                    <span className="block text-xs opacity-80 mb-1 text-gray-700">الرصيد النهائي المستحق</span>
                                    <span className={`block text-lg font-bold font-mono ${data.finalBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNumber(data.finalBalance)} SAR</span>
                                </div>
                            </div>

                            {/* Amount in Words */}
                            <div className="flex items-center bg-slate-100 p-3 rounded border-r-4 border-blue-900 mb-10 text-sm balance-words">
                                <strong className="text-blue-900 ml-2">صافي الرصيد كتابة:</strong>
                                <span>{data.balanceInWords}</span>
                            </div>

                            {/* Footer / Signatures */}
                            <footer className="flex flex-wrap justify-between items-end pt-5 border-t border-gray-200 mt-auto signatures gap-4">
                                <SignatureBox role="المحاسب" />
                                <SignatureBox role="المدير المالي" />
                                <SignatureBox role="مصادقة الوكيل الملاحي" />
                            </footer>

                        </div>
                    </div>
                </div >
            </ModalOverlay>
        </>
    );
};

// --- Helper Components ---

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="mb-1.5 text-[13px]">
        <span className="text-gray-500">{label}: </span>
        <span className="font-bold text-gray-900">{value}</span>
    </div>
);

const SummaryBox = ({ title, value, colorClass }: { title: string; value: number; colorClass: string }) => (
    <div className="bg-white p-4 rounded-md border border-gray-200 text-center">
        <span className="block text-xs text-gray-500 mb-1 opacity-80">{title}</span>
        <span className={`block text-lg font-bold font-mono ${colorClass}`}>
            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value)}
        </span>
    </div>
);

const SignatureBox = ({ role }: { role: string }) => (
    <div className="text-center w-44">
        <p className="font-bold text-gray-600 text-[13px] mb-12">{role}</p>
        <div className="border-b border-gray-400 w-full"></div>
    </div>
);