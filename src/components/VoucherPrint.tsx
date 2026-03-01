import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { numberToArabicWords } from '@/lib/numberToWords';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { X, Calendar, Wallet, Landmark, User, Printer, FileText, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// تعريف أنواع البيانات
interface VoucherData {
  id: string;
  code: string;
  type: string;
  partyType?: string;
  party_type?: string;
  partyId?: string;
  party_id?: string;
  partyName?: string;
  party_name?: string;
  method: string;
  bankAccountId?: string;
  bank_account_id?: string;
  referenceNumber?: string;
  reference_number?: string;
  amount: number | string;
  note?: string;
  date: string;
  bankAccount?: {
    accountNo?: string;
    account_no?: string;
    bank?: { name: string };
    banks?: { name: string };
  };
  bank_accounts?: {
    account_no: string;
    banks: { name: string };
  };
}

interface VoucherPrintProps {
  voucher: VoucherData;
  onClose: () => void;
}

export default function VoucherPrint({ voucher, onClose }: VoucherPrintProps) {
  const [companySettings, setCompanySettings] = useState<any>(null);

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

  // دالة لتنسيق الأرقام
  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  // دالة لتحويل الرقم إلى كلمات (تفقيط كامل)
  const numberToWords = (num: number | string): string => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    return numberToArabicWords(numValue);
  };

  const handlePrint = () => {
    // Get the voucher content
    const printContent = document.getElementById('voucher-print-content');
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
        <title>سند - ${voucher.code}</title>
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

  const isReceipt = voucher.type === 'RECEIPT' || voucher.type === 'receipt';
  const partyName = voucher.partyName || voucher.party_name || '';
  const amount = parseFloat(String(voucher.amount));
  const paymentMethod = voucher.method?.toLowerCase() === 'cash' ? 'cash' : 'transfer';

  const bankName = voucher.bankAccount?.bank?.name ||
    voucher.bankAccount?.banks?.name ||
    voucher.bank_accounts?.banks?.name || '';
  const referenceNo = voucher.referenceNumber ||
    voucher.reference_number || '';

  const getPartyTypeLabel = (type?: string) => {
    if (!type) return 'غير محدد';
    const labels: Record<string, string> = {
      CUSTOMER: 'عميل',
      customer: 'عميل',
      EMPLOYEE: 'موظف',
      employee: 'موظف',
      AGENT: 'وكيل ملاحي',
      agent: 'وكيل ملاحي',
      CUSTOMS: 'الجمارك',
      customs: 'الجمارك',
      OTHER: 'جهات أخرى',
      other: 'جهات أخرى',
      SUPPLIER: 'مورد',
      supplier: 'مورد'
    };
    return labels[type] || type;
  };



  return (
    <AnimatePresence>
      <ModalOverlay>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
        >
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-3 py-3 md:px-6 md:py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl flex-shrink-0 ${isReceipt ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                {isReceipt ? <Wallet className="w-4 h-4 md:w-6 md:h-6 text-emerald-700 dark:text-emerald-300" /> : <Banknote className="w-4 h-4 md:w-6 md:h-6 text-rose-700 dark:text-rose-300" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5 md:gap-3">
                  {isReceipt ? 'سند قبض' : 'سند صرف'}
                  <span className="text-[10px] md:text-sm font-medium px-1.5 py-0.5 md:px-2.5 md:py-1 rounded md:rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    رقم: {voucher.code}
                  </span>
                </h2>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1 flex items-center gap-1.5 md:gap-2">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                  {format(new Date(voucher.date), 'dd MMMM yyyy', { locale: ar })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
              <button
                onClick={handlePrint}
                className="btn-primary"
                title="طباعة النسخة الورقية"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-lg md:rounded-xl transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Screen UI Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
            <div className="space-y-6">

              {/* Two Column Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Party Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                    <User className="w-5 h-5" />
                    <h3 className="font-bold">بيانات الطرف المرتبط</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">نوع الطرف</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{getPartyTypeLabel(voucher.partyType || voucher.party_type)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isReceipt ? 'استلمنا من' : 'يصرف إلى'}</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">{partyName}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
                    <Landmark className="w-5 h-5" />
                    <h3 className="font-bold">تفاصيل الدفع</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">طريقة الدفع</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{paymentMethod === 'cash' ? 'نقدي (Cash)' : 'تحويل بنكي (Bank Transfer)'}</span>
                    </div>
                    {paymentMethod !== 'cash' && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">على بنك</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{bankName || 'غير محدد'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">رقم المرجع</span>
                          <span className="font-mono text-sm text-gray-900 dark:text-gray-300">{referenceNo || 'غير محدد'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Note Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400">
                  <FileText className="w-5 h-5" />
                  <h3 className="font-bold">{isReceipt ? 'وذلك عن' : 'وذلك مقابل'} (البيان)</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                  {voucher.note || 'لا توجد ملاحظات أو بيان إضافي على هذا السند.'}
                </p>
              </div>

              {/* Amount Display */}
              <div className={`bg-gradient-to-br ${isReceipt ? 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-100 dark:border-emerald-800/40' : 'from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border-rose-100 dark:border-rose-800/40'} rounded-xl p-6 border-2 shadow-sm text-center relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  {isReceipt ? <Wallet className="w-32 h-32" /> : <Banknote className="w-32 h-32" />}
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">مبلغ وقدره</span>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-4xl sm:text-5xl font-black font-mono tracking-wide ${isReceipt ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {formatNumber(amount)}
                    </span>
                    <span className={`text-xl font-bold ${isReceipt ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                      س.ر
                    </span>
                  </div>
                  <span className="text-sm md:text-base font-bold bg-white/60 dark:bg-black/20 px-5 py-2 rounded-full inline-block shadow-sm">
                    فقط {numberToWords(amount)} لا غير
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* -------------------- HIDDEN PRINT CONTENT -------------------- */}
          <div className="hidden">
            <div id="voucher-print-content" className="print-content p-8 font-['Tajawal']" dir="rtl">
              {/* Header */}
              <header className="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-6">
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-blue-900 mb-1">
                    {companySettings?.nameAr || 'نظام إدارة العمليات الجمركية'} {companySettings?.activityAr}
                  </h1>
                  <h2 className="text-sm font-medium text-gray-500 mb-2">
                    {companySettings?.nameEn || 'Customs Operations Management System'} {companySettings?.activityEn}
                  </h2>
                  <div className="flex gap-4 text-xs text-gray-600">
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
                      src={`http://localhost:3000${companySettings.logoPath}`}
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

              {/* Voucher Meta Strip */}
              <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
                {/* Voucher Number */}
                <div className="text-right">
                  <span className="block text-xs text-gray-500">رقم السند No</span>
                  <strong className="block text-lg text-black">{voucher.code}</strong>
                </div>

                {/* Title */}
                <div className="text-center flex-grow">
                  <h2 className="text-2xl font-bold text-blue-900">
                    {isReceipt ? 'سند قبض' : 'سند صرف'}
                  </h2>
                  <span className="text-sm text-gray-500 font-normal">
                    {isReceipt ? 'Receipt Voucher' : 'Payment Voucher'}
                  </span>
                </div>

                {/* Amount Box */}
                <div className="bg-white border-2 border-blue-900 text-blue-900 px-6 py-2 rounded text-center min-w-[140px] shadow-sm">
                  <span className="block text-[10px] text-gray-400 mb-1">المبلغ Amount</span>
                  <strong className="block text-xl font-bold font-mono tracking-wide">
                    {formatNumber(amount)} <span className="text-xs align-top">SAR</span>
                  </strong>
                </div>
              </div>

              {/* Form Body */}
              <div className="flex flex-col gap-5 text-sm">

                {/* Row 1: Date & Party */}
                <div className="flex flex-col md:flex-row print:flex-row gap-8">
                  <div className="md:w-1/3 print:w-1/3 flex items-baseline border-b border-dashed border-gray-300 pb-2">
                    <span className="text-blue-900 font-bold ml-3 min-w-[80px]">التاريخ / Date:</span>
                    <span className="font-medium text-gray-800">{format(new Date(voucher.date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="md:w-2/3 print:flex-1 flex items-baseline border-b border-dashed border-gray-300 pb-2">
                    <span className="text-blue-900 font-bold ml-3 whitespace-nowrap">
                      {isReceipt ? 'استلمنا من السيد/السادة:' : 'يصرف للسيد/السادة:'}
                    </span>
                    <span className="font-medium text-gray-800 flex-grow">{partyName}</span>
                  </div>
                </div>

                {/* Row 2: Amount in Words */}
                <div className="flex items-center bg-slate-100 p-3 rounded border-r-4 border-blue-600">
                  <span className="text-blue-900 font-bold ml-4 whitespace-nowrap">مبلغ وقدره:</span>
                  <span className="font-bold text-gray-900">{numberToWords(amount)}</span>
                </div>

                {/* Row 3: Payment Method - RTL Aligned */}
                <div className="flex items-center border-b border-gray-200 pb-4">
                  <span className="text-blue-900 font-bold ml-6 text-sm">طريقة الدفع:</span>

                  <div className="flex gap-8">
                    <Checkbox label="نقدًا (Cash)" checked={paymentMethod === 'cash'} />
                    <Checkbox label="تحويل (Transfer)" checked={paymentMethod === 'transfer'} />
                  </div>
                </div>

                {/* Row 4: Bank Details (Conditional) - Single Row */}
                {paymentMethod !== 'cash' && (
                  <div className="flex items-center gap-6 bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 ml-2">على بنك:</span>
                      <span className="font-bold text-gray-800 text-sm">{bankName || 'ــــــــــــ'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 ml-2">رقم المرجع:</span>
                      <span className="font-bold text-gray-800 font-mono text-sm">{referenceNo || 'ــــــــــــ'}</span>
                    </div>
                  </div>
                )}

                {/* Row 5: Description */}
                {voucher.note && (
                  <div className="flex items-baseline border-b border-dashed border-gray-300 pb-2">
                    <span className="text-blue-900 font-bold ml-3 min-w-[70px]">
                      {isReceipt ? 'وذلك عن:' : 'وذلك مقابل:'}
                    </span>
                    <span className="font-medium text-gray-800 flex-grow leading-relaxed">
                      {voucher.note}
                    </span>
                  </div>
                )}

              </div>

              {/* Footer */}
              <footer className="mt-12 flex justify-between pt-6 gap-4">
                {isReceipt ? (
                  <>
                    <div className="text-center w-40">
                      <p className="font-bold text-gray-600 text-sm mb-8">المستلم (Recipient)</p>
                      <div className="border-b border-gray-400 w-full"></div>
                    </div>
                    <div className="text-center w-40">
                      <p className="font-bold text-gray-600 text-sm mb-8">المحاسب / الختم</p>
                      <div className="border-b border-gray-400 w-full"></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center w-1/3">
                      <p className="font-bold text-gray-600 text-sm mb-8">المحاسب (Prepared By)</p>
                      <div className="border-b border-gray-400 w-3/4 mx-auto"></div>
                    </div>
                    <div className="text-center w-1/3">
                      <p className="font-bold text-gray-600 text-sm mb-8">المدير المالي (Approved By)</p>
                      <div className="border-b border-gray-400 w-3/4 mx-auto"></div>
                    </div>
                    <div className="text-center w-1/3">
                      <p className="font-bold text-gray-600 text-sm mb-8">المستلم (Received By)</p>
                      <div className="border-b border-gray-400 w-3/4 mx-auto"></div>
                    </div>
                  </>
                )}
              </footer>

              <div className="mt-10 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
                هذا السند تم انشائة الكترونيا من نظام ادارة العمليات الجمركية ولا يحتاج الى ختم او توقيع
              </div>

            </div>
          </div>
          {/* -------------------------------------------------------- */}
        </motion.div>
      </ModalOverlay>
    </AnimatePresence>
  );
}

// --- Helper Component: Checkbox ---
const Checkbox = ({ label, checked }: { label: string, checked: boolean }) => (
  <div className="flex items-center gap-2 cursor-pointer">
    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors
      ${checked ? 'border-blue-900 bg-blue-900' : 'border-gray-300 bg-white'}`}>
      {checked && <span className="text-white text-sm font-bold">✓</span>}
    </div>
    <span className={`text-sm ${checked ? 'font-bold text-blue-900' : 'text-gray-600'}`}>
      {label}
    </span>
  </div>
);