import React from 'react';

// تعريف واجهات البيانات (TypeScript Interfaces)
export interface Transaction {
    id: number;
    date: string;
    details: string; // البيان
    debit: number;   // مدين (عليه)
    credit: number;  // دائن (له - سداد)
    balance: number; // الرصيد المتراكم
}

export interface StatementData {
    clientName: string;
    startDate: string;
    endDate: string;
    printDate: string;
    transactions: Transaction[];
}

interface StatementProps {
    data: StatementData;
}

export const Statement: React.FC<StatementProps> = ({ data }) => {

    // حساب الإجماليات للشريط السفلي
    const totalDebit = data.transactions.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = data.transactions.reduce((sum, item) => sum + item.credit, 0);
    const finalBalance = data.transactions[data.transactions.length - 1]?.balance || 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <>
            <style>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                    }
                    .print-container {
                        background: white !important;
                        padding: 20mm !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="min-h-screen bg-gray-100 p-4 flex justify-center items-start font-['Tajawal'] print:bg-white print:p-0 print:m-0" dir="rtl">

                {/* A4 Container */}
                <div className="print-container w-full max-w-[210mm] min-h-[297mm] bg-white p-8 md:p-12 shadow-lg rounded-lg relative print:shadow-none print:w-full print:max-w-full print:m-0">

                    {/* Header - مطابق للفاتورة */}
                    <header className="flex justify-between items-start border-b-2 border-blue-900 pb-6 mb-8">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-blue-900 mb-1">نظام إدارة العمليات الجمركية</h1>
                            <h2 className="text-sm font-medium text-gray-500 mb-3">Customs Operations Management System</h2>
                            <div className="flex gap-4 text-xs text-gray-600">
                                <span><strong className="text-blue-900">الرقم الضريبي:</strong> ---</span>
                                <span className="text-gray-300">|</span>
                                <span><strong className="text-blue-900">ترخيص رقم:</strong> ---</span>
                            </div>
                        </div>
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                            <span className="text-xs text-slate-400">شعار المؤسسة</span>
                        </div>
                    </header>

                    {/* Title Strip */}
                    <div className="flex justify-between items-center mb-8 bg-blue-50 p-3 rounded border border-blue-100 print:bg-blue-50">
                        <h2 className="text-xl font-bold text-blue-900">كشف حساب عميل (Statement of Account)</h2>
                        <span className="text-sm text-gray-600">تاريخ الطباعة: {data.printDate}</span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Client Info */}
                        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 border-r-4 border-r-blue-600">
                            <h3 className="text-blue-900 font-bold text-sm mb-3 border-b border-slate-300 pb-2">بيانات العميل</h3>
                            <InfoRow label="العميل" value={data.clientName} />
                        </div>

                        {/* Period Info */}
                        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 border-r-4 border-r-blue-600">
                            <h3 className="text-blue-900 font-bold text-sm mb-3 border-b border-slate-300 pb-2">فترة الكشف</h3>
                            <div className="flex gap-6">
                                <InfoRow label="من" value={data.startDate} />
                                <InfoRow label="إلى" value={data.endDate} />
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 mb-8">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-blue-900 text-white print:bg-blue-900 print:text-white">
                                <tr>
                                    <th className="py-3 px-4 font-medium w-28 text-center">التاريخ</th>
                                    <th className="py-3 px-4 font-medium text-center">التفاصيل</th>
                                    <th className="py-3 px-4 font-medium w-24 text-center">مدين</th>
                                    <th className="py-3 px-4 font-medium w-24 text-center">دائن</th>
                                    <th className="py-3 px-4 font-medium w-28 text-center bg-blue-800">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.transactions.map((item, _index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 even:bg-slate-50 print:even:bg-slate-50">
                                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{item.date}</td>
                                        <td className="py-3 px-4 text-gray-800 font-medium">{item.details}</td>
                                        <td className="py-3 px-4 text-gray-600 font-mono text-left">
                                            {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-green-600 font-mono text-left">
                                            {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-blue-900 font-bold font-mono text-left bg-blue-50/50">
                                            {formatCurrency(item.balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Section */}
                    <div className="grid grid-cols-3 gap-4 mb-12">
                        <SummaryBox title="إجمالي المدين" amount={totalDebit} color="text-gray-700" />
                        <SummaryBox title="إجمالي الدائن (سداد)" amount={totalCredit} color="text-green-600" />
                        {/* Main Balance Box */}
                        <div className="bg-blue-900 text-white p-4 rounded-lg flex flex-col items-center justify-center shadow print:bg-blue-900 print:text-white">
                            <span className="text-sm opacity-80 mb-1">الرصيد المستحق</span>
                            <span className="text-2xl font-bold font-mono">{formatCurrency(finalBalance)} ريال</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="flex justify-between items-end border-t border-gray-200 pt-8 mt-auto">
                        <div className="text-center w-48">
                            <p className="font-bold text-gray-600 mb-12">الحسابات</p>
                            <div className="border-b border-dashed border-gray-400 w-full"></div>
                        </div>
                        <div className="text-center w-48">
                            <p className="font-bold text-gray-600 mb-12">المدير المالي / الختم</p>
                            <div className="border-b border-dashed border-gray-400 w-full"></div>
                        </div>
                    </footer>

                </div>
            </div>
        </>
    );
};

// --- Helper Components ---

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex items-baseline mb-2">
        <span className="text-slate-500 ml-2 text-sm whitespace-nowrap">{label}:</span>
        <span className="font-bold text-slate-900 text-sm">{value}</span>
    </div>
);

const SummaryBox = ({ title, amount, color }: { title: string, amount: number, color: string }) => {
    const format = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(amount);
    return (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col items-center justify-center">
            <span className="text-xs text-gray-500 mb-1">{title}</span>
            <span className={`text-lg font-bold font-mono ${color}`}>{format}</span>
        </div>
    );
};

export default Statement;
