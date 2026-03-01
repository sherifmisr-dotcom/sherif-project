import { X, Calendar, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface Props {
    batch: any;
    onClose: () => void;
}

export default function BatchDetails({ batch, onClose }: Props) {
    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        تفاصيل دفعة الرسوم الجمركية
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">التاريخ</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {format(new Date(batch.date), 'dd MMMM yyyy', { locale: ar })}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المبلغ الإجمالي</p>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <p className="font-bold text-green-600">
                                    {batch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">طريقة الدفع</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {batch.method === 'CASH' ? 'نقدي' :
                                    `تحويل بنكي - ${batch.bankAccount?.bank.name}`}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">رقم السند</p>
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <p className="font-medium text-blue-600">{batch.voucher.code}</p>
                            </div>
                        </div>
                    </div>

                    {batch.notes && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ملاحظات</p>
                            <p className="text-gray-900 dark:text-white">{batch.notes}</p>
                        </div>
                    )}

                    {/* Items Table */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            البيانات الجمركية ({batch.items.length}بيان)
                        </h3>
                        <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                            رقم البيان
                                        </th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                            المبلغ
                                        </th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                            الحالة
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {batch.items.map((item: any) => (
                                        <tr key={item.id} className="bg-white dark:bg-gray-800">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                {item.customsNo}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.invoices.length > 0 ? (
                                                    <div className="flex items-center gap-2 text-green-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-sm">
                                                            مربوط بفاتورة {item.invoices[0].code}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        غير مربوط
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Created By */}
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        تم الإنشاء بواسطة {batch.createdByUser.username} - {format(new Date(batch.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
}