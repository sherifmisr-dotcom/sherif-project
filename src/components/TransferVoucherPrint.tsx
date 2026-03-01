import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { numberToArabicWords } from '@/lib/numberToWords';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { X, Calendar, ArrowRightLeft, Building2, Landmark, Printer, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InternalTransfer {
    id: string;
    code: string;
    date: string;
    amount: number;
    note: string;
    sourceType: string;
    destType: string;
    sourceAccountId?: string;
    destAccountId?: string;
}

interface BankAccount {
    id: string;
    accountNo?: string;
    account_no?: string;
    bank?: { name: string };
    banks?: { name: string };
}

interface TransferVoucherPrintProps {
    transfer: InternalTransfer;
    bankAccounts: BankAccount[];
    onClose: () => void;
}

export default function TransferVoucherPrint({ transfer, bankAccounts, onClose }: TransferVoucherPrintProps) {
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

    const formatNumber = (num: number | string) => {
        const numValue = typeof num === 'string' ? parseFloat(num) : num;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numValue);
    };

    const numberToWords = (num: number | string): string => {
        const numValue = typeof num === 'string' ? parseFloat(num) : num;
        return numberToArabicWords(numValue);
    };

    const getAccountName = (type: string, accountId?: string): string => {
        if (type === 'TREASURY') return 'الخزنة الرئيسية';
        const account = bankAccounts.find(a => a.id === accountId);
        if (!account) return 'البنك';
        const bankName = account.bank?.name || account.banks?.name || 'بنك';
        const accountNo = account.accountNo || account.account_no || '';
        return `${bankName} - جاري (${accountNo})`;
    };

    const handlePrint = () => {
        const printContent = document.getElementById('transfer-voucher-print-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سند تحويل - ${transfer.code}</title>
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
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        };
    };

    const amount = parseFloat(String(transfer.amount));

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
                            <div className="p-1.5 md:p-2.5 rounded-lg md:rounded-xl flex-shrink-0 bg-violet-100 dark:bg-violet-900/30">
                                <ArrowRightLeft className="w-4 h-4 md:w-6 md:h-6 text-violet-700 dark:text-violet-300" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5 md:gap-3">
                                    سند تحويل داخلي
                                    <span className="text-[10px] md:text-sm font-medium px-1.5 py-0.5 md:px-2.5 md:py-1 rounded md:rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                        رقم: {transfer.code}
                                    </span>
                                </h2>
                                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1 flex items-center gap-1.5 md:gap-2">
                                    <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                    {format(new Date(transfer.date), 'dd MMMM yyyy', { locale: ar })}
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

                            {/* Two Column Transfer Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* From Account */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500 rounded-r-xl"></div>
                                    <div className="flex items-center gap-2 mb-4 text-rose-600 dark:text-rose-400 pr-2">
                                        <Building2 className="w-5 h-5" />
                                        <h3 className="font-bold">من الحساب (مرسل)</h3>
                                    </div>
                                    <div className="space-y-3 pr-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">نوع الحساب</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {transfer.sourceType === 'TREASURY' ? 'خزينة' : 'حساب بنكي'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">اسم الحساب</span>
                                            <span className="font-bold text-lg text-gray-900 dark:text-white">
                                                {getAccountName(transfer.sourceType, transfer.sourceAccountId)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* To Account */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r-xl"></div>
                                    <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400 pr-2">
                                        <Landmark className="w-5 h-5" />
                                        <h3 className="font-bold">إلى الحساب (مستقبل)</h3>
                                    </div>
                                    <div className="space-y-3 pr-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">نوع الحساب</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {transfer.destType === 'TREASURY' ? 'خزينة' : 'حساب بنكي'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">اسم الحساب</span>
                                            <span className="font-bold text-lg text-gray-900 dark:text-white">
                                                {getAccountName(transfer.destType, transfer.destAccountId)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Note Section */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-2 mb-3 text-violet-600 dark:text-violet-400">
                                    <FileText className="w-5 h-5" />
                                    <h3 className="font-bold">وذلك عن (بيان التحويل)</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                                    {transfer.note || 'لا توجد ملاحظات أو بيان إضافي على هذا التحويل.'}
                                </p>
                            </div>

                            {/* Amount Display */}
                            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-violet-100 dark:border-violet-800/40 rounded-xl p-6 border-2 shadow-sm text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <ArrowRightLeft className="w-32 h-32" />
                                </div>

                                <div className="relative z-10 flex flex-col items-center justify-center">
                                    <span className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">مبلغ التحويل</span>
                                    <div className="flex items-baseline gap-2 mb-3">
                                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-wide text-violet-700 dark:text-violet-400">
                                            {formatNumber(amount)}
                                        </span>
                                        <span className="text-xl font-bold text-violet-600 dark:text-violet-500">
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
                        <div id="transfer-voucher-print-content" className="print-content p-8 font-['Tajawal']" dir="rtl">

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

                            {/* Main Blue Box */}
                            <section className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex flex-wrap justify-between items-center mb-8 gap-4">

                                {/* Right: Voucher Number */}
                                <div className="text-right min-w-[100px]">
                                    <span className="text-gray-500 text-xs block mb-1">رقم السند No</span>
                                    <span className="text-black text-lg font-bold font-sans">{transfer.code}</span>
                                </div>

                                {/* Center: Title */}
                                <div className="text-center flex-grow">
                                    <h1 className="text-[#164e87] text-2xl font-bold m-0">سند تحويل داخلي</h1>
                                    <span className="text-gray-500 text-sm font-sans">Internal Transfer Voucher</span>
                                </div>

                                {/* Left: Amount */}
                                <div className="bg-white border-2 border-[#164e87] rounded-lg px-5 py-2 min-w-[140px] text-center shadow-sm">
                                    <span className="text-[11px] text-gray-500 block mb-1">المبلغ Amount</span>
                                    <div className="text-[#164e87] text-2xl font-bold dir-ltr inline-block">
                                        {formatNumber(amount)} <span className="text-sm text-gray-500 font-normal">SAR</span>
                                    </div>
                                </div>
                            </section>

                            {/* Voucher Details */}
                            <section className="mb-10 text-[15px]">

                                {/* Date */}
                                <div className="flex items-baseline border-b border-dashed border-gray-300 pb-2 mb-6">
                                    <span className="text-blue-900 font-bold ml-3 min-w-[80px]">التاريخ / Date:</span>
                                    <span className="font-medium text-gray-800">{format(new Date(transfer.date), 'dd/MM/yyyy')}</span>
                                </div>
                                {/* From Account */}
                                <div className="flex items-end mb-4">
                                    <span className="font-bold text-[#164e87] ml-2 whitespace-nowrap min-w-[80px]">من الحساب:</span>
                                    <div className="flex-grow border-b border-dotted border-gray-400 pb-1 flex items-center text-black">
                                        <span className="flex-grow text-center font-medium">
                                            {getAccountName(transfer.sourceType, transfer.sourceAccountId)}
                                        </span>
                                        <span className="text-xs text-gray-400 font-sans whitespace-nowrap">From A/C</span>
                                    </div>
                                </div>

                                {/* To Account */}
                                <div className="flex items-end mb-4">
                                    <span className="font-bold text-[#164e87] ml-2 whitespace-nowrap min-w-[80px]">إلى الحساب:</span>
                                    <div className="flex-grow border-b border-dotted border-gray-400 pb-1 flex items-center text-black">
                                        <span className="flex-grow text-center font-medium">
                                            {getAccountName(transfer.destType, transfer.destAccountId)}
                                        </span>
                                        <span className="text-xs text-gray-400 font-sans whitespace-nowrap">To A/C</span>
                                    </div>
                                </div>

                                {/* Amount in Words */}
                                <div className="bg-[#f8fbfe] p-3 my-6 rounded border-r-4 border-[#164e87] flex items-center">
                                    <strong className="text-[#164e87] ml-2 whitespace-nowrap">مبلغ وقدره:</strong>
                                    <span className="flex-grow text-center font-medium text-gray-800">
                                        {numberToWords(amount)}
                                    </span>
                                </div>

                                {/* Description */}
                                <div className="flex items-end mb-4">
                                    <span className="font-bold text-[#164e87] ml-2 whitespace-nowrap min-w-[80px]">وذلك عن:</span>
                                    <div className="flex-grow border-b border-dotted border-gray-400 pb-1 flex items-center text-black">
                                        <span className="flex-grow pr-2">{transfer.note}</span>
                                        <span className="text-xs text-gray-400 font-sans whitespace-nowrap">Description</span>
                                    </div>
                                </div>

                            </section>

                            {/* Footer and Signatures */}
                            <footer className="mt-16 flex justify-between pt-2">
                                <SignatureBlock title="أمين الصندوق (المستلم)" titleEn="Recipient" />
                                <SignatureBlock title="المدير المالي" titleEn="Financial Manager" />
                                <SignatureBlock title="المحاسب (المُعد)" titleEn="Accountant" />
                            </footer>

                            <div className="mt-10 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
                                هذا السند تم إنشاؤه إلكترونياً من نظام إدارة العمليات الجمركية ولا يحتاج إلى ختم أو توقيع
                            </div>

                        </div>
                    </div>
                </motion.div>
            </ModalOverlay>
        </AnimatePresence>
    );
}

// Helper Component for Signatures
const SignatureBlock = ({ title, titleEn }: { title: string; titleEn: string }) => (
    <div className="text-center w-[200px]">
        <p className="mb-10 text-gray-600 font-bold text-sm">{title}</p>
        <span className="border-t border-dashed border-gray-300 block pt-1 text-gray-400 text-xs font-sans">
            {titleEn}
        </span>
    </div>
);