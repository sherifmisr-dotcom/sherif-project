import { X, FileText, Calendar, User, Truck, DollarSign, Package, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { motion, AnimatePresence } from 'framer-motion';

interface InvoiceItem {
    id?: string;
    description: string;
    unitPrice?: number;
    quantity?: number;
    vatRate?: number;
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
    discount?: number;
    total: number;
    notes?: string;
    customer?: {
        name: string;
        address?: string;
        phone?: string;
        taxNumber?: string;
        tax_number?: string;
    };
    customers?: {
        name: string;
        address?: string;
        phone?: string;
        taxNumber?: string;
        tax_number?: string;
    };
    items?: InvoiceItem[];
    invoice_items?: InvoiceItem[];
}

interface ViewInvoiceModalProps {
    isOpen: boolean;
    invoice: Invoice | null;
    onClose: () => void;
    onPrint: (id: string) => void;
}

export default function ViewInvoiceModal({ isOpen, invoice, onClose, onPrint }: ViewInvoiceModalProps) {
    if (!isOpen || !invoice) return null;

    const typeLabels: Record<string, { label: string, color: string, bg: string }> = {
        EXPORT: { label: 'فاتورة صادر', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        export: { label: 'فاتورة صادر', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        IMPORT: { label: 'فاتورة استيراد', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        import: { label: 'فاتورة استيراد', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        TRANSIT: { label: 'فاتورة ترانزيت', color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-900/30' },
        transit: { label: 'فاتورة ترانزيت', color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-900/30' },
        FREE: { label: 'فاتورة حرة', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
        free: { label: 'فاتورة حرة', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    };

    const invoiceTypeInfo = typeLabels[invoice.type] || { label: 'فاتورة', color: 'text-gray-700', bg: 'bg-gray-100' };

    // Safe accessors for both formats
    const customerName = invoice.customer?.name || invoice.customers?.name || 'غير محدد';
    const customerTaxNumber = invoice.customer?.taxNumber || invoice.customer?.tax_number || invoice.customers?.taxNumber || invoice.customers?.tax_number || 'غير متوفر';
    const customsNo = invoice.customsNo || invoice.customs_no || 'غير محدد';
    const driverName = invoice.driverName || invoice.driver_name || 'غير محدد';
    const shipperName = invoice.shipperName || invoice.shipper_name || 'غير محدد';
    const vehicleNo = invoice.vehicleNo || invoice.vehicle_no || 'غير محدد';
    const cargoType = invoice.cargoType || invoice.cargo_type || 'غير محدد';
    const vatRate = invoice.vatRate || invoice.vat_rate || 0;
    const vatAmount = invoice.vatAmount || invoice.vat_amount || 0;
    const invoiceDiscount = invoice.discount ? parseFloat(invoice.discount.toString()) : 0;
    const invoiceItems = invoice.items || invoice.invoice_items || [];

    // Determine VAT status
    const hasVAT = invoiceItems.some((item: any) => {
        const vRate = item.vatRate !== undefined ? parseFloat(item.vatRate) : 0;
        return vRate > 0;
    }) || vatAmount > 0;
    const vatEnabled = invoice.vatEnabled ?? invoice.vat_enabled ?? hasVAT;

    // Calculate subtotal from items
    const subtotal = invoiceItems.reduce((sum, item) => {
        if (item.unitPrice !== undefined && item.quantity !== undefined) {
            return sum + (Number(item.unitPrice) * Number(item.quantity));
        } else {
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
        <AnimatePresence>
            <ModalOverlay>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
                >
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${invoiceTypeInfo.bg}`}>
                                <FileText className={`w-6 h-6 ${invoiceTypeInfo.color}`} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    {invoiceTypeInfo.label}
                                    <span className="text-sm font-medium px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                        رقم: {invoice.code}
                                    </span>
                                    {vatEnabled && (
                                        <span className="text-xs font-bold px-2 py-1 rounded border border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/30">
                                            ضريبية
                                        </span>
                                    )}
                                </h2>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(invoice.date), 'dd MMMM yyyy', { locale: ar })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onPrint(invoice.id)}
                                className="btn-primary"
                                title="طباعة النسخة الورقية"
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">طباعة</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                title="إغلاق"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                        <div className="space-y-6">

                            {/* Primary Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Client Info */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                                        <User className="w-5 h-5 text-blue-500" />
                                        <h3 className="font-bold">بيانات العميل</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">العميل</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{customerName}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">الرقم الضريبي</span>
                                            <span className="text-gray-900 dark:text-gray-300 font-mono text-sm">{customerTaxNumber}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Logistics Info */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                                        <Truck className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold">التفاصيل الجمركية واللوجستية</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">رقم البيان الجمركي</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{customsNo}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">نوع البضاعة</span>
                                            <span className="text-gray-900 dark:text-gray-300">{cargoType}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">الشاحن</span>
                                            <span className="text-gray-900 dark:text-gray-300">{shipperName}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">السائق / السيارة</span>
                                            <span className="text-gray-900 dark:text-gray-300">{driverName} / {vehicleNo}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-gray-500" />
                                    <h3 className="font-bold text-gray-900 dark:text-white">بنود الفاتورة</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="px-5 py-3 font-medium">م</th>
                                                <th className="px-5 py-3 font-medium">البيان</th>
                                                {invoiceItems.length > 0 && invoiceItems[0].unitPrice !== undefined && (
                                                    <>
                                                        <th className="px-5 py-3 font-medium text-center">سعر الوحدة</th>
                                                        <th className="px-5 py-3 font-medium text-center">الكمية</th>
                                                        <th className="px-5 py-3 font-medium text-center">الضريبة</th>
                                                    </>
                                                )}
                                                <th className="px-5 py-3 font-medium text-left">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {invoiceItems.map((item, index) => (
                                                <tr key={item.id || index} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 w-12">{index + 1}</td>
                                                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{item.description}</td>

                                                    {item.unitPrice !== undefined && (
                                                        <>
                                                            <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-300 font-mono">
                                                                {formatCurrency(parseFloat(item.unitPrice?.toString() || '0'))}
                                                            </td>
                                                            <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-300">
                                                                {item.quantity || 1}
                                                            </td>
                                                            <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-300">
                                                                {item.vatRate || 0}%
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="px-5 py-3 text-left font-bold text-gray-900 dark:text-white font-mono">
                                                        {formatCurrency(parseFloat(item.amount?.toString() || '0'))}
                                                    </td>
                                                </tr>
                                            ))}

                                            {vatEnabled && invoiceItems.length > 0 && invoiceItems[0].unitPrice === undefined && (
                                                <tr className="bg-red-50/30 dark:bg-red-900/10">
                                                    <td className="px-5 py-3"></td>
                                                    <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300">ضريبة القيمة المضافة ({vatRate}%)</td>
                                                    <td className="px-5 py-3 text-left font-bold text-gray-900 dark:text-white font-mono">
                                                        {formatCurrency(vatAmount)}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Summary & Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Notes */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ملاحظات الفاتورة:</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">
                                            {invoice.notes || 'لا توجد ملاحظات إضافية على هذه الفاتورة.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Accounting Summary */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border-2 border-blue-100 dark:border-blue-800 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 text-blue-800 dark:text-blue-300">
                                        <DollarSign className="w-5 h-5" />
                                        <h3 className="font-bold">الملخص المالي</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm">
                                            <span>الإجمالي قبل الضريبة:</span>
                                            <span className="font-mono">{formatCurrency(subtotal)} ريال</span>
                                        </div>

                                        {invoiceDiscount > 0 && (
                                            <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-sm">
                                                <span>الخصم:</span>
                                                <span className="font-mono font-bold">- {formatCurrency(invoiceDiscount)} ريال</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm pb-3 border-b border-blue-200 dark:border-blue-800/50">
                                            <span>مبلغ ضريبة القيمة المضافة:</span>
                                            <span className="font-mono">{formatCurrency(vatAmount)} ريال</span>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">الصافي للدفع:</span>
                                            <span className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">
                                                {formatCurrency(invoice.total)} ريال
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div>
            </ModalOverlay>
        </AnimatePresence>
    );
}
