import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { generateZatcaQRDataUrl } from '@/utils/zatcaQR';

interface InvoiceData {
  invoice_no: string;
  date: string;
  customs_number: string;
  customer_name: string;
  driver_name?: string;
  shipper_name?: string;
  plate_number?: string;
  goods_type?: string;
  customs_fees: number;
  office_fees: number;
  freight: number;
  port_fees: number;
  loading_fees: number;
  other_expenses: number;
  vat_amount: number;
  total_amount: number;
}

interface InvoicePrintProps {
  invoice: InvoiceData;
  onClose: () => void;
}

export default function InvoicePrint({ invoice, onClose }: InvoicePrintProps) {
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

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

  // Generate ZATCA QR code for tax invoices
  useEffect(() => {
    if (invoice.vat_amount > 0 && companySettings) {
      generateZatcaQRDataUrl({
        sellerName: companySettings.nameAr || '',
        taxNumber: companySettings.taxNumber || '',
        date: invoice.date,
        total: invoice.total_amount,
        vatAmount: invoice.vat_amount,
      }).then(setQrCodeUrl);
    }
  }, [companySettings, invoice]);

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة - ${invoice.invoice_no}</title>
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
          }
          /* Custom Table Styles for Print Clarity */
          .print-table th { background-color: #1e3a8a !important; color: white !important; }
          .print-table td { border-bottom: 1px solid #e5e7eb; }
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-full md:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 flex items-center justify-between no-print z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            معاينة الفاتورة
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-print"></i>
              طباعة
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

        <div id="invoice-print-content" className="bg-white p-3 md:p-8" dir="rtl">
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
                    src={`http://localhost:3000${companySettings.logoPath}`}
                    alt="Company Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                    <span className="text-xs text-slate-400">شعار</span>
                  </div>
                )}
              </div>
            </header>

            <div className="text-center mb-8">
              <div className="inline-block bg-blue-900 text-white px-8 py-2 rounded-lg text-lg font-bold shadow-md">
                فاتورة رقم: {invoice.invoice_no}
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-blue-900 font-bold border-b border-gray-200 pb-2 mb-3 text-sm">تفاصيل الفاتورة (Invoice Details)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">رقم الفاتورة:</span> <span className="font-bold">{invoice.invoice_no}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span> <span className="font-bold">{format(new Date(invoice.date), 'dd/MM/yyyy')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الرقم الجمركي:</span> <span className="font-bold">{invoice.customs_number}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">نوع البضاعة:</span> <span className="font-bold">{invoice.goods_type || '-'}</span></div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-blue-900 font-bold border-b border-gray-200 pb-2 mb-3 text-sm">بيانات العميل (Client Info)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">العميل:</span> <span className="font-bold">{invoice.customer_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الشاحن:</span> <span className="font-bold">{invoice.shipper_name || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">السائق:</span> <span className="font-bold">{invoice.driver_name || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">اللوحة:</span> <span className="font-bold">{invoice.plate_number || '-'}</span></div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto mb-4 md:mb-8">
              <table className="w-full text-sm mb-0 print-table border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-blue-900 text-white text-center">
                    <th className="p-3 border border-blue-900">البيان (Description)</th>
                    <th className="p-3 border border-blue-900 w-48">المبلغ (SAR)</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {invoice.customs_fees > 0 && <tr><td className="p-3 border border-gray-200">رسوم جمركية</td><td className="p-3 border border-gray-200 text-center font-bold">{invoice.customs_fees.toFixed(2)}</td></tr>}
                  {invoice.office_fees > 0 && <tr><td className="p-3 border border-gray-200 bg-gray-50">أتعاب المكتب</td><td className="p-3 border border-gray-200 text-center font-bold bg-gray-50">{invoice.office_fees.toFixed(2)}</td></tr>}
                  {invoice.freight > 0 && <tr><td className="p-3 border border-gray-200">نولون</td><td className="p-3 border border-gray-200 text-center font-bold">{invoice.freight.toFixed(2)}</td></tr>}
                  {invoice.port_fees > 0 && <tr><td className="p-3 border border-gray-200 bg-gray-50">أجور مواني</td><td className="p-3 border border-gray-200 text-center font-bold bg-gray-50">{invoice.port_fees.toFixed(2)}</td></tr>}
                  {invoice.loading_fees > 0 && <tr><td className="p-3 border border-gray-200">تحميل وتنزيل</td><td className="p-3 border border-gray-200 text-center font-bold">{invoice.loading_fees.toFixed(2)}</td></tr>}
                  {invoice.other_expenses > 0 && <tr><td className="p-3 border border-gray-200 bg-gray-50">مصاريف أخرى</td><td className="p-3 border border-gray-200 text-center font-bold bg-gray-50">{invoice.other_expenses.toFixed(2)}</td></tr>}

                  <tr className="bg-blue-50 font-bold border-t-2 border-blue-900">
                    <td className="p-3 text-left pl-8">الإجمالي قبل الضريبة</td>
                    <td className="p-3 text-center">{(invoice.total_amount - invoice.vat_amount).toFixed(2)}</td>
                  </tr>
                  {invoice.vat_amount > 0 && (
                    <tr className="bg-white font-bold border-b border-gray-200">
                      <td className="p-3 text-left pl-8">ضريبة القيمة المضافة (15%)</td>
                      <td className="p-3 text-center">{invoice.vat_amount.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between items-start mb-8 md:mb-12 gap-4">
              {/* ZATCA QR Code */}
              {invoice.vat_amount > 0 && qrCodeUrl ? (
                <div className="flex flex-col items-center gap-1">
                  <img src={qrCodeUrl} alt="ZATCA QR Code" className="w-28 h-28 object-contain" />
                  <span className="text-[10px] text-gray-400">رمز الفاتورة الضريبية</span>
                </div>
              ) : <div />}
              <div className="bg-blue-900 text-white p-4 rounded-lg shadow-lg text-center min-w-[200px]">
                <div className="text-sm opacity-80 mb-1">الإجمالي النهائي</div>
                <div className="text-2xl font-bold font-mono">{invoice.total_amount.toFixed(2)} SAR</div>
              </div>
            </div>

            <div className="flex justify-between items-end mt-auto pt-4 md:pt-8 border-t border-gray-200 gap-4">
              <div className="text-center w-32 md:w-48">
                <p className="font-bold text-gray-600 mb-12">المسؤول</p>
                <div className="border-b border-dashed border-gray-400 w-full"></div>
              </div>
              <div className="text-center w-32 md:w-48">
                <p className="font-bold text-gray-600 mb-12">التوقيع / الختم</p>
                <div className="border-b border-dashed border-gray-400 w-full"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}