import { format } from 'date-fns';
import apiClient from '../lib/api';
import { useState, useEffect } from 'react';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { tafqeet } from '../utils/tafqeet';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface GroupTransaction {
    id: string;
    date: string;
    customer: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

interface CustomerGroupStatementPrintProps {
    groupName: string;
    customerCount: number;
    startDate: string;
    endDate: string;
    openingBalance: number;
    transactions: GroupTransaction[];
    closingBalance: number;
    onClose: () => void;
}

export default function CustomerGroupStatementPrint({
    groupName,
    customerCount,
    startDate,
    endDate,
    openingBalance,
    transactions,
    closingBalance,
    onClose,
}: CustomerGroupStatementPrintProps) {
    const [companySettings, setCompanySettings] = useState<any>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await apiClient.getCompanySettings();
                setCompanySettings(response.data || response);
            } catch (error) {
                console.error('Error fetching company settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);

    const handlePrint = () => {
        const printContent = document.getElementById('group-statement-print-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب مجموعة - ${groupName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          * { font-family: 'Tajawal', sans-serif; }
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
            .summary-section {
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
                        <h3 className="text-lg font-bold text-gray-900">معاينة كشف حساب المجموعة</h3>
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
                    <div id="group-statement-print-content" className="bg-white p-3 md:p-8">
                        <div className="max-w-full">
                            {/* Header */}
                            <header className="flex flex-col-reverse md:flex-row justify-between items-start border-b-2 border-blue-900 pb-4 md:pb-6 mb-4 md:mb-8 gap-3">
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-bold text-blue-900 mb-1">
                                        {companySettings?.nameAr || 'نظام إدارة العمليات الجمركية'} {companySettings?.activityAr}
                                    </h1>
                                    <h2 className="text-sm font-medium text-gray-500 mb-3">
                                        {companySettings?.nameEn || 'Customs Operations Management System'} {companySettings?.activityEn}
                                    </h2>
                                    <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-gray-600">
                                        <span><strong className="text-blue-900">جوال:</strong> {companySettings?.phone || '---'}</span>
                                        <span className="text-gray-300">|</span>
                                        <span><strong className="text-blue-900">الرقم الضريبي:</strong> {companySettings?.taxNumber || '---'}</span>
                                        <span className="text-gray-300">|</span>
                                        <span><strong className="text-blue-900">ترخيص رقم:</strong> {companySettings?.licenseNo || '---'}</span>
                                    </div>
                                </div>
                                <div className="w-24 h-24 flex items-center justify-center">
                                    {companySettings?.logoPath ? (
                                        <img
                                            src={`${API_BASE}${companySettings.logoPath}`}
                                            alt="Company Logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                                            <span className="text-xs text-slate-400">شعار المؤسسة</span>
                                        </div>
                                    )}
                                </div>
                            </header>

                            {/* Title */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 bg-blue-50 p-2.5 rounded border border-blue-100 gap-2">
                                <h2 className="text-lg font-bold text-blue-900">كشف حساب مجموعة (Group Statement of Account)</h2>
                                <span className="text-xs text-gray-600">تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy')}</span>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-200 border-r-4 border-r-blue-900">
                                    <h3 className="text-blue-900 font-bold text-[13px] mb-2 border-b border-slate-300 pb-1">بيانات المجموعة</h3>
                                    <div className="flex items-baseline mb-1">
                                        <span className="text-slate-500 ml-2 text-[13px]">المجموعة:</span>
                                        <span className="font-bold text-slate-900 text-[13px]">{groupName}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-200 border-r-4 border-r-blue-900">
                                    <h3 className="text-blue-900 font-bold text-[13px] mb-2 border-b border-slate-300 pb-1">عدد المؤسسات</h3>
                                    <div className="flex items-baseline mb-1">
                                        <span className="font-bold text-slate-900 text-[13px]">{customerCount}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-200 border-r-4 border-r-blue-900">
                                    <h3 className="text-blue-900 font-bold text-[13px] mb-2 border-b border-slate-300 pb-1">فترة الكشف</h3>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                        <div className="flex items-baseline mb-1">
                                            <span className="text-slate-500 ml-2 text-[13px]">من:</span>
                                            <span className="font-bold text-slate-900 text-[13px]">{format(new Date(startDate), 'dd/MM/yyyy')}</span>
                                        </div>
                                        <div className="flex items-baseline mb-1">
                                            <span className="text-slate-500 ml-2 text-[13px]">إلى:</span>
                                            <span className="font-bold text-slate-900 text-[13px]">{format(new Date(endDate), 'dd/MM/yyyy')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto mb-4 md:mb-6">
                                <table className="w-full text-[13px] border-collapse" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '11%' }} />
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: 'auto' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '14%' }} />
                                    </colgroup>
                                    <thead className="bg-blue-900 text-white">
                                        <tr>
                                            <th className="p-2 text-center font-medium">التاريخ</th>
                                            <th className="p-2 text-center font-medium">المؤسسة</th>
                                            <th className="p-2 text-center font-medium">البيان</th>
                                            <th className="p-2 text-center font-bold">مدين</th>
                                            <th className="p-2 text-center font-bold">دائن</th>
                                            <th className="p-2 text-center font-bold">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-800">
                                        <tr className="border-b border-gray-200 bg-slate-100">
                                            <td className="p-1.5 text-gray-600 text-center">{format(new Date(startDate), 'dd/MM/yyyy')}</td>
                                            <td className="p-1.5 text-gray-400 text-center">-</td>
                                            <td className="p-1.5 text-gray-800 font-bold text-[12px] text-center">رصيد أول المدة</td>
                                            <td className="p-1.5 text-center font-mono font-bold text-gray-800">-</td>
                                            <td className="p-1.5 text-center font-mono font-bold text-gray-800">-</td>
                                            <td className="p-1.5 text-center font-mono font-extrabold text-gray-800 bg-slate-100" dir="ltr">
                                                {formatCurrency(openingBalance)}
                                            </td>
                                        </tr>
                                        {transactions.map((tx, index) => (
                                            <tr key={tx.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-gray-50`}>
                                                <td className="p-1.5 text-gray-600 text-center">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                                <td className="p-1.5 text-gray-800 text-[12px] text-center">{tx.customer}</td>
                                                <td className="p-1.5 text-gray-800 text-[12px] text-center">{tx.description}</td>
                                                <td className="p-1.5 text-center font-mono font-bold text-gray-800">
                                                    {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                                </td>
                                                <td className="p-1.5 text-center font-mono font-bold text-gray-800">
                                                    {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                                </td>
                                                <td className="p-1.5 text-center font-mono font-extrabold text-gray-800 bg-slate-100" dir="ltr">
                                                    {formatCurrency(tx.balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary */}
                            <div className="summary-section grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12">
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col items-center justify-center">
                                    <span className="text-xs text-gray-500 mb-1">إجمالي المدين</span>
                                    <span className="text-lg font-bold font-mono text-gray-700">{formatCurrency(totalDebit)}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col items-center justify-center">
                                    <span className="text-xs text-gray-500 mb-1">إجمالي الدائن (سداد)</span>
                                    <span className="text-lg font-bold font-mono text-green-600">{formatCurrency(totalCredit)}</span>
                                </div>
                                <div className="bg-blue-900 text-white p-4 rounded-lg flex flex-col items-center justify-center shadow">
                                    <span className="text-sm opacity-80 mb-1">الرصيد المستحق</span>
                                    <span className="text-2xl font-bold font-mono">{formatCurrency(closingBalance)} ريال</span>
                                </div>
                            </div>

                            {/* Amount in Words */}
                            {closingBalance !== 0 && (
                                <div className="flex items-center bg-slate-100 p-3 rounded border-r-4 border-r-blue-900 mb-16 text-sm">
                                    <strong className="text-blue-900 ml-2">صافي الرصيد كتابة:</strong>
                                    <span>{tafqeet(Math.abs(closingBalance))}</span>
                                </div>
                            )}

                            {/* Footer */}
                            <footer className="signatures flex justify-between items-end border-t border-gray-200 pt-6 md:pt-8 mt-auto gap-4">
                                <div className="text-center w-32 md:w-48">
                                    <p className="font-bold text-gray-600 mb-12">الحسابات</p>
                                    <div className="border-b border-dashed border-gray-400 w-full"></div>
                                </div>
                                <div className="text-center w-32 md:w-48">
                                    <p className="font-bold text-gray-600 mb-12">المدير المالي / الختم</p>
                                    <div className="border-b border-dashed border-gray-400 w-full"></div>
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>
            </ModalOverlay >
        </>
    );
}
