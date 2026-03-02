import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { generateZatcaQRDataUrl } from '@/utils/zatcaQR';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface InvoiceItem {
  id?: string;
  description: string;
  unitPrice: number;
  quantity: number;
  vatRate: number;
  amount: number;
}

interface Invoice {
  id: string;
  code: string;
  type: string;
  date: string;
  customsNo?: string;
  customs_no?: string;
  driverName?: string;
  driver_name?: string;
  shipperName?: string;
  shipper_name?: string;
  vehicleNo?: string;
  vehicle_no?: string;
  cargoType?: string;
  cargo_type?: string;
  subtotal: number;
  vatEnabled?: boolean;
  vat_enabled?: boolean;
  vatRate?: number;
  vat_rate?: number;
  vatAmount?: number;
  vat_amount?: number;
  total: number;
  notes?: string;
  customer?: {
    name: string;
    address?: string;
    phone?: string;
    taxNumber?: string;
  };
  customers?: {
    name: string;
    address?: string;
    phone?: string;
    tax_number?: string;
  };
  items?: InvoiceItem[];
  invoice_items?: InvoiceItem[];
}

interface InvoicePreviewProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export default function InvoicePreview({ invoice, onClose }: InvoicePreviewProps) {
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const response = await apiClient.getCompanySettings();
      const data = response.data || response;
      setCompanySettings(data);
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  if (!invoice) return null;

  const handlePrint = () => {
    // Get the invoice content
    const printContent = document.getElementById('invoice-print-content');
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
        <title>فاتورة - ${invoice.code}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          * { font-family: 'Tajawal', sans-serif; }
          @media print {
            @page { size: A4; margin: 0.33in 0.31in; }
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

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  const typeLabels: Record<string, string> = {
    EXPORT: 'فاتورة صادر',
    export: 'فاتورة صادر',
    IMPORT: 'فاتورة استيراد',
    import: 'فاتورة استيراد',
    TRANSIT: 'فاتورة ترانزيت',
    transit: 'فاتورة ترانزيت',
    FREE: 'فاتورة حرة',
    free: 'فاتورة حرة',
  };

  // Safe accessors for both formats
  const customerName = invoice.customer?.name || invoice.customers?.name || 'غير محدد';
  const customsNo = invoice.customsNo || invoice.customs_no || 'غير محدد';
  const driverName = invoice.driverName || invoice.driver_name || 'غير محدد';
  const shipperName = invoice.shipperName || invoice.shipper_name || 'غير محدد';
  const vehicleNo = invoice.vehicleNo || invoice.vehicle_no || 'غير محدد';
  const cargoType = invoice.cargoType || invoice.cargo_type || 'غير محدد';
  const vatRate = invoice.vatRate || invoice.vat_rate || 0;
  const vatAmount = invoice.vatAmount || invoice.vat_amount || 0;
  const invoiceItems = invoice.items || invoice.invoice_items || [];

  // Check if VAT is enabled by looking at items or vatAmount
  const hasVAT = invoiceItems.some((item: any) => {
    const vatRate = item.vatRate !== undefined ? parseFloat(item.vatRate) : 0;
    return vatRate > 0;
  }) || vatAmount > 0;
  const vatEnabled = invoice.vatEnabled ?? invoice.vat_enabled ?? hasVAT;

  // Generate ZATCA QR code for tax invoices
  useEffect(() => {
    if (vatEnabled && companySettings) {
      generateZatcaQRDataUrl({
        sellerName: companySettings.nameAr || '',
        taxNumber: companySettings.taxNumber || '',
        date: invoice.date,
        total: invoice.total,
        vatAmount: vatAmount,
      }).then(setQrCodeUrl);
    }
  }, [vatEnabled, companySettings, invoice]);

  // Calculate subtotal from items
  const subtotal = invoiceItems.reduce((sum, item) => {
    if (item.unitPrice !== undefined && item.quantity !== undefined) {
      // New structure: calculate from unitPrice * quantity
      return sum + (Number(item.unitPrice) * Number(item.quantity));
    } else {
      // Old structure: use amount directly
      return sum + Number(item.amount || 0);
    }
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <ModalOverlay>
      <div className="bg-white rounded-xl shadow-xl max-w-full md:max-w-[210mm] w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header Buttons - No Print */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 md:p-6 flex items-center justify-between no-print print:hidden">
          <h2 className="text-xl font-bold text-gray-900">
            معاينة الفاتورة
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div id="invoice-print-content" className="p-3 md:p-8" dir="rtl">

          {/* Header */}
          <header className="flex flex-col-reverse md:flex-row justify-between items-start border-b-2 border-blue-900 pb-4 mb-6 gap-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-blue-900 mb-1">{companySettings?.nameAr || 'نظام إدارة العمليات الجمركية'}</h1>
              <h2 className="text-lg font-medium text-gray-500 mb-2">{companySettings?.nameEn || 'Customs Operations Management System'}</h2>
              <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-gray-600">
                <span><strong className="text-blue-900">جوال:</strong> {companySettings?.phone || '---'}</span>
                <span className="text-gray-300">|</span>
                <span><strong className="text-blue-900">الرقم الضريبي:</strong> {companySettings?.taxNumber || '---'}</span>
                <span className="text-gray-300">|</span>
                <span><strong className="text-blue-900">ترخيص رقم:</strong> {companySettings?.licenseNo || '---'}</span>
              </div>
            </div>

            {/* Logo */}
            <div className="w-20 h-20 flex items-center justify-center">
              {companySettings?.logoPath ? (
                <img
                  src={`${API_BASE}${companySettings.logoPath}`}
                  alt="Company Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                  <span className="text-sm text-slate-400">شعار</span>
                </div>
              )}
            </div>
          </header>

          {/* Badge */}
          <div className="flex justify-between items-center mb-5">
            <span className="bg-blue-900 text-white px-4 py-1.5 rounded text-base font-bold print:bg-blue-900 print:text-white">
              {typeLabels[invoice.type]}{vatEnabled ? ' - فاتورة ضريبية' : ''}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 md:gap-4 mb-5">

            {/* بيانات العميل */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 border-r-4 border-r-blue-600 print:bg-slate-50 print:border-slate-200 print:border-r-4 print:border-r-blue-600">
              <h3 className="text-blue-900 font-bold text-xs mb-2 border-b border-slate-300 pb-1.5">بيانات العميل (Client Info)</h3>

              <InfoRow label="العميل" value={customerName} />
              <InfoRow label="الشاحن" value={shipperName} />
              <InfoRow label="نوع البضاعة" value={cargoType} />
            </div>

            {/* تفاصيل الفاتورة */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 border-r-4 border-r-blue-600 print:bg-slate-50 print:border-slate-200 print:border-r-4 print:border-r-blue-600">
              <h3 className="text-blue-900 font-bold text-xs mb-2 border-b border-slate-300 pb-1.5">تفاصيل الفاتورة (Invoice Details)</h3>

              <InfoRow label="رقم الفاتورة" value={invoice.code} />
              <InfoRow label="التاريخ" value={format(new Date(invoice.date), 'dd/MM/yyyy')} />
              <InfoRow label="الرقم الجمركي" value={customsNo} />
            </div>
          </div>

          {/* Logistics Strip */}
          <div className="flex justify-around bg-sky-50 p-3 rounded-lg border border-sky-200 mb-5 print:bg-sky-50">
            <LogisticsItem title="اسم السائق" value={driverName} />
            <LogisticsItem title="رقم اللوحة" value={vehicleNo} />
            <LogisticsItem title="نظام العمليات" value=" إدارة العمليات الجمركية" />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 mb-5">
            <table className="w-full text-xs text-right">
              <thead className="bg-blue-900 text-white print:bg-blue-900 print:text-white">
                <tr>
                  <th className="py-2 px-3 font-medium w-12">#</th>
                  <th className="py-2 px-3 font-medium">البيان (Description)</th>
                  {/* Show detailed columns only if items have new structure */}
                  {invoiceItems.length > 0 && invoiceItems[0].unitPrice !== undefined ? (
                    <>
                      <th className="py-2 px-3 font-medium w-24 text-center">سعر الوحدة</th>
                      <th className="py-2 px-3 font-medium w-20 text-center">الكمية</th>
                      <th className="py-2 px-3 font-medium w-20 text-center">الضريبة %</th>
                    </>
                  ) : null}
                  <th className="py-2 px-3 font-medium w-28 text-left">الإجمالي (SAR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoiceItems.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-gray-50 even:bg-slate-50 print:even:bg-slate-50">
                    <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                    <td className="py-2 px-3 text-gray-800 font-medium">{item.description}</td>
                    {/* Show detailed columns only if item has new structure */}
                    {item.unitPrice !== undefined ? (
                      <>
                        <td className="py-2 px-3 text-gray-700 text-center font-mono">
                          {formatCurrency(parseFloat(item.unitPrice?.toString() || '0'))}
                        </td>
                        <td className="py-2 px-3 text-gray-700 text-center">
                          {item.quantity || 1}
                        </td>
                        <td className="py-2 px-3 text-gray-700 text-center">
                          {item.vatRate || 0}%
                        </td>
                      </>
                    ) : null}
                    <td className="py-2 px-3 text-gray-800 font-bold font-mono text-left">
                      {formatCurrency(parseFloat(item.amount?.toString() || '0'))}
                    </td>
                  </tr>
                ))}
                {/* Show old VAT row if using old structure */}
                {vatEnabled && invoiceItems.length > 0 && invoiceItems[0].unitPrice === undefined && (
                  <tr className="bg-slate-50 print:bg-slate-50">
                    <td className="py-2 px-3 text-gray-500"></td>
                    <td className="py-2 px-3 text-gray-800 font-medium">
                      ضريبة القيمة المضافة ({vatRate}%)
                    </td>
                    <td className="py-2 px-3 text-gray-800 font-bold font-mono text-left">
                      {formatCurrency(vatAmount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total Section + QR Code */}
          <div className="flex flex-col-reverse md:flex-row justify-between items-start mb-8 gap-4">
            {/* ZATCA QR Code - right side in RTL */}
            {vatEnabled && qrCodeUrl ? (
              <div className="flex flex-col items-center gap-1">
                <img src={qrCodeUrl} alt="ZATCA QR Code" className="w-28 h-28 object-contain" />
                <span className="text-[10px] text-gray-400">رمز الفاتورة الضريبية</span>
              </div>
            ) : <div />}
            <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-lg min-w-[300px] print:bg-slate-50">
              <div className="space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between text-gray-700">
                  <span className="text-sm">الإجمالي قبل الضريبة:</span>
                  <span className="font-semibold font-mono">{formatCurrency(subtotal)} ريال</span>
                </div>

                {/* VAT Amount */}
                <div className="flex justify-between text-gray-700">
                  <span className="text-sm">مبلغ الضريبة:</span>
                  <span className="font-semibold font-mono">{formatCurrency(vatAmount)} ريال</span>
                </div>

                {/* Total */}
                <div className="flex justify-between text-blue-900 pt-2 border-t border-slate-300">
                  <span className="text-base font-bold">الإجمالي شامل الضريبة:</span>
                  <span className="text-lg font-bold font-mono">{formatCurrency(invoice.total)} ريال</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-bold text-amber-900 mb-1.5 text-sm">ملاحظات:</h4>
              <p className="text-gray-700 whitespace-pre-wrap text-xs">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <footer className="flex justify-between items-end border-t border-gray-200 pt-6 mt-auto gap-4">
            <div className="text-center w-32 md:w-48">
              <p className="font-bold text-gray-600 mb-8 text-sm">المحاسب</p>
              <div className="border-b border-dashed border-gray-400 w-full"></div>
            </div>

            <div className="text-center w-48">
              <p className="font-bold text-gray-600 mb-8 text-sm">المسؤول / الختم</p>
              <div className="border-b border-dashed border-gray-400 w-full"></div>
            </div>
          </footer>

          <div className="text-center mt-5 text-xs text-gray-400 print:mt-3">
            نظام إدارة العمليات الجمركية - تم إصدار هذه الفاتورة إلكترونياً
          </div>

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        
        * {
          font-family: 'Tajawal', sans-serif;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 0.33in 0.31in;
          }
          
          /* Force all colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Hide all body children */
          body > * {
            visibility: hidden !important;
            position: absolute !important;
          }
          
          /* Show only our modal and its children */
          body > div[class*="fixed"] {
            visibility: visible !important;
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          body > div[class*="fixed"] * {
            visibility: visible !important;
          }
          
          /* Hide buttons and no-print elements */
          .no-print,
          button,
          [class*="no-print"] {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Remove modal overlay styling */
          body > div[class*="fixed"] {
            background: white !important;
          }
          
          body > div[class*="fixed"] > div {
            max-width: 100% !important;
            max-height: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* Ensure all colors print */
          .bg-blue-900 {
            background-color: #1e3a8a !important;
          }
          
          .text-white {
            color: white !important;
          }
          
          .bg-slate-50 {
            background-color: #f8fafc !important;
          }
          
          .bg-sky-50 {
            background-color: #f0f9ff !important;
          }
          
          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .bg-amber-50 {
            background-color: #fffbeb !important;
          }
          
          .text-blue-900 {
            color: #1e3a8a !important;
          }
          
          .text-gray-500 {
            color: #6b7280 !important;
          }
          
          .text-gray-600 {
            color: #4b5563 !important;
          }
          
          .text-gray-700 {
            color: #374151 !important;
          }
          
          .text-gray-800 {
            color: #1f2937 !important;
          }
          
          .text-slate-500 {
            color: #64748b !important;
          }
          
          .text-slate-900 {
            color: #0f172a !important;
          }
          
          .text-amber-900 {
            color: #78350f !important;
          }
          
          .border-blue-900 {
            border-color: #1e3a8a !important;
          }
          
          .border-slate-200 {
            border-color: #e2e8f0 !important;
          }
          
          .border-slate-300 {
            border-color: #cbd5e1 !important;
          }
          
          .border-sky-200 {
            border-color: #bae6fd !important;
          }
          
          .border-r-blue-600 {
            border-right-color: #2563eb !important;
          }
          
          .border-gray-200 {
            border-color: #e5e7eb !important;
          }
          
          .border-amber-200 {
            border-color: #fde68a !important;
          }
          
          /* Table colors */
          table thead {
            background-color: #1e3a8a !important;
          }
          
          table thead th {
            color: white !important;
          }
          
          table tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
          
          /* Prevent page breaks */
          header,
          .grid,
          table,
          footer {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </ModalOverlay>
  );
}

// --- Helper Components ---

const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex items-baseline mb-1.5">
    <span className="text-slate-500 ml-2 text-xs whitespace-nowrap">{label}:</span>
    <span className="font-bold text-slate-900 text-xs">{value}</span>
  </div>
);

const LogisticsItem = ({ title, value }: { title: string, value: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-xs text-slate-500 mb-0.5">{title}</span>
    <span className="font-bold text-blue-900 text-sm">{value}</span>
  </div>
);