import { format } from 'date-fns';

interface ReportItem {
    id: string;
    code: string;
    date: string;
    partyName: string;
    categoryName?: string;
    amount: number;
    method: string;
    bankName?: string;
    note: string;
}

interface ReportSummary {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    byMethod: Array<{ method: string; amount: number; count: number }>;
    byCategory?: Array<{ name: string; amount: number; count: number }>;
}

interface ExpensesReportPrintProps {
    type: 'expenses' | 'revenues';
    startDate: string;
    endDate: string;
    data: ReportItem[];
    summary: ReportSummary | null;
    onClose: () => void;
}

export default function ExpensesReportPrint({
    type, startDate, endDate, data, summary, onClose,
}: ExpensesReportPrintProps) {

    const isExpenses = type === 'expenses';
    const title = isExpenses ? 'تقرير المصروفات' : 'تقرير الإيرادات';
    const partyLabel = isExpenses ? 'المستفيد' : 'الجهة';
    const accent = isExpenses ? '#9b1c1c' : '#166534';
    const accentLight = isExpenses ? '#fef2f2' : '#f0fdf4';

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const getMethodLabel = (method: string) =>
        ({ 'CASH': 'نقدي', 'BANK_TRANSFER': 'بنكي', 'نقدي': 'نقدي', 'بنكي': 'بنكي' }[method] || method);

    const cashTotal = summary?.byMethod.find(m => m.method === 'CASH' || m.method === 'نقدي')?.amount ?? 0;
    const bankTotal = summary?.byMethod.find(m => m.method === 'BANK_TRANSFER' || m.method === 'بنكي')?.amount ?? 0;
    const printDate = new Date().toLocaleString('en-GB');

    const handlePrint = () => {
        const content = document.getElementById('expenses-report-print-body');
        if (!content) return;
        const pw = window.open('', '_blank');
        if (!pw) return;

        pw.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; font-family: 'Tajawal', Tahoma, Arial, sans-serif; margin:0; padding:0; }
    body { background: white; color: #1a1a1a; direction: rtl; }
    @page { size: A4 landscape; margin: 10mm 8mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`);
        pw.document.close();
        pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 300); };
    };


    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-start justify-center overflow-y-auto py-6 print:hidden" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[310mm] mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Modern App Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: accent }} />
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{title}</h2>
                            <p className="text-sm tracking-wide text-gray-500">
                                {format(new Date(startDate), 'dd/MM/yyyy')} — {format(new Date(endDate), 'dd/MM/yyyy')}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: accent }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            طباعة التقرير
                        </button>
                        <button onClick={onClose} className="px-5 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
                            إغلاق
                        </button>
                    </div>
                </div>

                {/* Content to Print */}
                <div className="p-8 overflow-y-auto max-h-[80vh]">
                    <div id="expenses-report-print-body" style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl', color: '#1f2937' }}>

                        {/* Elegant Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '24px' }}>
                            <div>
                                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: '#111827', letterSpacing: '-0.02em' }}>{title}</h1>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#4b5563' }}>
                                    <div><strong>من تاريخ:</strong> <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{format(new Date(startDate), 'dd/MM/yyyy')}</span></div>
                                    <div><strong>إلى تاريخ:</strong> <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{format(new Date(endDate), 'dd/MM/yyyy')}</span></div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: accent, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    نظام ادارة العمليات الجمركية
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>إدارة التقارير المالية</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{printDate}</div>
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        {summary && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ border: `1px solid ${accent}40`, borderLeft: `4px solid ${accent}`, borderRadius: '6px', padding: '16px', backgroundColor: accentLight }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>إجمالي {isExpenses ? 'المصروفات' : 'الإيرادات'}</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: accent }}>{formatCurrency(summary.totalAmount)}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>ريال سعودي</div>
                                </div>
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '16px', backgroundColor: '#f9fafb' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>إجمالي الدفع النقدي</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>{formatCurrency(cashTotal)}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>ريال سعودي</div>
                                </div>
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '16px', backgroundColor: '#f9fafb' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>إجمالي التحويل البنكي</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>{formatCurrency(bankTotal)}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>ريال سعودي</div>
                                </div>
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '16px', backgroundColor: '#f9fafb' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>عدد العمليات</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>{summary.totalCount}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>عملية مسجلة</div>
                                </div>
                            </div>
                        )}



                        {/* Data Table */}
                        <div style={{ borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: '3%' }}>#</th>
                                        <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: '8%' }}>رقم السند</th>
                                        <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: '9%' }}>التاريخ</th>
                                        <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: '14%' }}>{partyLabel}</th>
                                        {isExpenses && <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: '12%' }}>التصنيف</th>}
                                        <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: '12%' }}>طريقة الدفع</th>
                                        <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: '10%' }}>المبلغ (ريال)</th>
                                        <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: 'auto' }}>البيان</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                            <td style={{ padding: '8px', color: '#9ca3af' }}>{idx + 1}</td>
                                            <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>{item.code}</td>
                                            <td style={{ padding: '8px', color: '#4b5563', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                {format(new Date(item.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td style={{ padding: '8px', fontWeight: 600, color: '#111827' }}>{item.partyName}</td>
                                            {isExpenses && (
                                                <td style={{ padding: '8px', color: '#4b5563' }}>{item.categoryName || '—'}</td>
                                            )}
                                            <td style={{ padding: '8px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#f3f4f6', borderRadius: '9999px', fontSize: '11px', fontWeight: 600 }}>
                                                    {getMethodLabel(item.method)}
                                                    {(item.method === 'BANK_TRANSFER' || item.method === 'بنكي') && item.bankName && (
                                                        <>
                                                            <span style={{ color: '#9ca3af' }}>|</span>
                                                            <span style={{ color: '#4b5563', fontWeight: 400 }}>{item.bankName}</span>
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td style={{ padding: '8px', color: '#6b7280', fontSize: '11px', lineHeight: '1.4' }}>
                                                {item.note || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.length === 0 && (
                                        <tr>
                                            <td colSpan={isExpenses ? 8 : 7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                                                لا توجد بيانات في هذه الفترة
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {data.length > 0 && (
                                    <tfoot>
                                        <tr style={{ backgroundColor: accentLight, borderTop: `2px solid ${accent}40` }}>
                                            <td colSpan={isExpenses ? 6 : 5} style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'left', color: '#374151', fontSize: '13px' }}>
                                                الإجمالي الكلي:
                                            </td>
                                            <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '15px', color: accent }}>
                                                {summary ? formatCurrency(summary.totalAmount) : '0.00'}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* Footer Metadata */}
                        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
                            <span>هذا التقرير معتمد ومستخرج آلياً من نظام ادارة العمليات الجمركية</span>
                            <span>صفحة 1 من 1</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
