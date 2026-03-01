import { format } from 'date-fns';

interface VatInvoice {
    id: string;
    code: string;
    date: string;
    customerName: string;
    type: string;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
}

interface VatByQuarter {
    key: string;
    year: number;
    quarter: string;
    label: string;
    taxableBase: number;
    vatAmount: number;
    totalWithVat: number;
    count: number;
}

interface VatReportData {
    period: { from: string | null; to: string | null };
    summary: {
        totalTaxableAmount: number;
        totalVatAmount: number;
        totalWithVat: number;
        invoiceCount: number;
    };
    vatByQuarter: VatByQuarter[];
    invoices: VatInvoice[];
}

interface VatReportPrintProps {
    data: VatReportData;
    onClose: () => void;
}

const TYPE_LABELS: { [key: string]: string } = {
    IMPORT: 'استيراد',
    EXPORT: 'تصدير',
    TRANSIT: 'ترانزيت',
    FREE: 'حرة',
};

export default function VatReportPrint({ data, onClose }: VatReportPrintProps) {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd/MM/yyyy');
        } catch {
            return dateStr;
        }
    };

    const periodFrom = data.period.from ? formatDate(data.period.from) : '';
    const periodTo = data.period.to ? formatDate(data.period.to) : '';
    const printDate = new Date().toLocaleString('en-GB');

    const accent = '#0d9488'; // teal-600
    const accentDark = '#115e59'; // teal-800
    const accentLight = '#f0fdfa'; // teal-50

    const handlePrint = () => {
        const content = document.getElementById('vat-report-print-body');
        if (!content) return;
        const pw = window.open('', '_blank');
        if (!pw) return;

        pw.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>تقرير ضريبة القيمة المضافة</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; font-family: 'Tajawal', Tahoma, Arial, sans-serif; margin: 0; padding: 0; }
    body { background: white; color: #1a1a1a; direction: rtl; }
    @page { size: A4 landscape; margin: 8mm 8mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`);
        pw.document.close();
        pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 300); };
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-start justify-center overflow-y-auto py-6" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[310mm] mx-4" onClick={e => e.stopPropagation()}>
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-0.5 h-6 rounded" style={{ backgroundColor: accent }} />
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">تقرير ضريبة القيمة المضافة</h2>
                            <p className="text-xs text-gray-400">
                                {periodFrom} — {periodTo} · {data.invoices.length} فاتورة
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-sm font-semibold"
                            style={{ backgroundColor: accent }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            طباعة
                        </button>
                        <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50">
                            إغلاق
                        </button>
                    </div>
                </div>

                {/* Preview body */}
                <div className="p-6 overflow-y-auto max-h-[82vh]">
                    <div id="vat-report-print-body" style={{ fontFamily: 'Tajawal, Tahoma, Arial, sans-serif', direction: 'rtl' }}>

                        {/* ═══════ PAGE 1: Summary & Quarter Breakdown ═══════ */}

                        {/* Report Header */}
                        <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: accentLight, border: `1px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '18px' }}>🧾</span>
                                    </div>
                                    <div>
                                        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: accentDark }}>
                                            إقرار ضريبة القيمة المضافة
                                        </h1>
                                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                                            VAT Declaration Report — ZATCA Compliant
                                        </p>
                                    </div>
                                </div>
                                <p style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
                                    هيئة الزكاة والضريبة والجمارك — المملكة العربية السعودية
                                </p>
                            </div>
                            <div style={{ textAlign: 'left', fontSize: '11px', color: '#888' }}>
                                <div style={{ fontWeight: 700, color: '#374151', marginBottom: '2px' }}>
                                    الفترة: {periodFrom} — {periodTo}
                                </div>
                                <div>{data.invoices.length} فاتورة خاضعة</div>
                                <div style={{ marginTop: '2px' }}>طُبع: {printDate}</div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ border: `2px solid ${accent}`, borderRadius: '10px', padding: '14px', backgroundColor: accentLight, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '40px', height: '40px', background: accent, borderRadius: '0 8px 0 20px', opacity: 0.1 }} />
                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.03em' }}>المبيعات الخاضعة للضريبة</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: accentDark }}>{formatCurrency(data.summary.totalTaxableAmount)}</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>ريال سعودي</div>
                            </div>
                            <div style={{ border: `2px solid ${accent}`, borderRadius: '10px', padding: '14px', backgroundColor: '#ecfdf5' }}>
                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>ضريبة المخرجات (15%)</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{formatCurrency(data.summary.totalVatAmount)}</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>ريال سعودي</div>
                            </div>
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', backgroundColor: '#f9fafb' }}>
                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>الإجمالي مع الضريبة</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#374151' }}>{formatCurrency(data.summary.totalWithVat)}</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>ريال سعودي</div>
                            </div>
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', backgroundColor: '#f9fafb' }}>
                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>عدد الفواتير الخاضعة</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#374151' }}>{data.summary.invoiceCount}</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>فاتورة</div>
                            </div>
                        </div>

                        {/* Quarter Breakdown Table */}
                        {data.vatByQuarter && data.vatByQuarter.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', borderBottom: `2px solid ${accent}`, paddingBottom: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: accentDark }}>الإقرار الضريبي الربع سنوي</span>
                                    <span style={{ fontSize: '9px', padding: '2px 8px', backgroundColor: accentLight, color: accent, borderRadius: '99px', fontWeight: 600, border: `1px solid ${accent}` }}>ZATCA</span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: accentDark, color: '#fff' }}>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>الفترة</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>الوعاء الضريبي (ر.س)</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>مبلغ الضريبة (ر.س)</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>الإجمالي مع الضريبة (ر.س)</th>
                                            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>عدد الفواتير</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.vatByQuarter.map((q, idx) => (
                                            <tr key={q.key} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : accentLight }}>
                                                <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: accentDark }}>{q.label}</td>
                                                <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#111' }}>{formatCurrency(q.taxableBase)}</td>
                                                <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, color: accent }}>{formatCurrency(q.vatAmount)}</td>
                                                <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{formatCurrency(q.totalWithVat)}</td>
                                                <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280' }}>{q.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: `2px solid ${accent}`, backgroundColor: accentLight }}>
                                            <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: '12px', color: accentDark }}>الإجمالي</td>
                                            <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: '12px', color: '#111' }}>{formatCurrency(data.summary.totalTaxableAmount)}</td>
                                            <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: '12px', color: accent }}>{formatCurrency(data.summary.totalVatAmount)}</td>
                                            <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: '12px', color: '#374151' }}>{formatCurrency(data.summary.totalWithVat)}</td>
                                            <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: '12px', textAlign: 'center', color: '#374151' }}>{data.summary.invoiceCount}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* ═══════ PAGE 2: Detailed Invoice List ═══════ */}
                        {data.invoices.length > 0 && (
                            <div className="page-break">
                                {/* Section Header for Invoice Details */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${accent}`, paddingBottom: '6px', marginBottom: '10px', marginTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: accentDark }}>تفاصيل الفواتير الخاضعة للضريبة</span>
                                        <span style={{ fontSize: '9px', padding: '2px 8px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '99px', fontWeight: 600, border: '1px solid #bfdbfe' }}>
                                            {data.invoices.length} فاتورة
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                                        الفترة: {periodFrom} — {periodTo}
                                    </div>
                                </div>

                                {/* Invoice Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: accentDark, color: '#fff' }}>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>#</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>رقم الفاتورة</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>التاريخ</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'right' }}>العميل</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>النوع</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>المبلغ قبل الضريبة</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>نسبة الضريبة</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>مبلغ الضريبة</th>
                                            <th style={{ padding: '7px 6px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.invoices.map((inv, idx) => (
                                            <tr key={inv.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : accentLight, pageBreakInside: 'avoid' }}>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', color: '#9ca3af', textAlign: 'right' }}>{idx + 1}</td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, color: '#1d4ed8', fontFamily: 'monospace', fontSize: '10px' }}>{inv.code}</td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap', color: '#4b5563' }}>{formatDate(inv.date)}</td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: '#111', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customerName}</td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontWeight: 600, color: '#4b5563' }}>
                                                        {TYPE_LABELS[inv.type] || inv.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: '#111', whiteSpace: 'nowrap' }}>{formatCurrency(inv.subtotal)}</td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', fontWeight: 700, color: accent }}>{inv.vatRate}%</td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, color: accent, whiteSpace: 'nowrap' }}>{formatCurrency(inv.vatAmount)}</td>
                                                <td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', fontWeight: 800, color: '#111', whiteSpace: 'nowrap' }}>{formatCurrency(inv.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: `2px solid ${accent}`, backgroundColor: accentLight }}>
                                            <td colSpan={5} style={{ padding: '8px 6px', fontWeight: 800, fontSize: '11px', textAlign: 'center', color: accentDark }}>
                                                الإجمالي الكلي
                                            </td>
                                            <td style={{ padding: '8px 6px', fontWeight: 800, fontSize: '11px', color: '#111', whiteSpace: 'nowrap' }}>{formatCurrency(data.summary.totalTaxableAmount)}</td>
                                            <td style={{ padding: '8px 6px', fontWeight: 800, fontSize: '11px', textAlign: 'center', color: accent }}>15%</td>
                                            <td style={{ padding: '8px 6px', fontWeight: 800, fontSize: '11px', color: accent, whiteSpace: 'nowrap' }}>{formatCurrency(data.summary.totalVatAmount)}</td>
                                            <td style={{ padding: '8px 6px', fontWeight: 800, fontSize: '11px', color: '#111', whiteSpace: 'nowrap' }}>{formatCurrency(data.summary.totalWithVat)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* ZATCA Compliance Note */}
                        <div style={{ marginTop: '18px', padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '10px', color: '#92400e' }}>
                            <div style={{ fontWeight: 700, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '13px' }}>⚠️</span>
                                ملاحظة هامة
                            </div>
                            <p style={{ margin: 0, lineHeight: 1.6 }}>
                                هذا التقرير لأغراض محاسبية داخلية ويعرض ضريبة المخرجات (المبيعات) فقط.
                                يتوافق مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) للمملكة العربية السعودية.
                                يرجى الرجوع إلى المحاسب المعتمد للإقرار الضريبي النهائي.
                            </p>
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: '14px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#9ca3af' }}>
                            <span>تم استخراج التقرير بواسطة نظام إدارة العمليات الجمركية</span>
                            <span>تاريخ الطباعة: {printDate}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
