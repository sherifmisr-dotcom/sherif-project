import { CheckCircle, Eye, Printer, X } from 'lucide-react';
import ModalOverlay from '@/components/ui/ModalOverlay';

interface InvoiceSuccessModalProps {
    isOpen: boolean;
    invoiceCode: string;
    invoiceId: string;
    onClose: () => void;
    onPreview: (id: string) => void;
    onPrint: (id: string) => void;
}

export default function InvoiceSuccessModal({
    isOpen,
    invoiceCode,
    invoiceId,
    onClose,
    onPreview,
    onPrint,
}: InvoiceSuccessModalProps) {
    if (!isOpen) return null;

    return (
        <ModalOverlay>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <div className="flex justify-end p-4 pb-0">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="إغلاق"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Success Icon and Message */}
                <div className="px-8 pb-8 pt-4 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-success-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-success-400 to-success-600 rounded-full p-4">
                                <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        تم إنشاء الفاتورة بنجاح
                    </h2>

                    <p className="text-gray-600 dark:text-gray-400 mb-1">
                        رقم الفاتورة
                    </p>
                    <p className="text-xl font-bold text-primary-600 dark:text-primary-400 mb-6">
                        {invoiceCode}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                onPreview(invoiceId);
                                onClose();
                            }}
                            className="flex items-center justify-center gap-3 px-6 py-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                            <Eye className="w-5 h-5" />
                            <span className="font-semibold">معاينة</span>
                        </button>

                        <button
                            onClick={() => {
                                onPrint(invoiceId);
                                onClose();
                            }}
                            className="flex items-center justify-center gap-3 px-6 py-3 bg-success-600 hover:bg-success-700 active:bg-success-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-success-600/20 hover:shadow-xl hover:shadow-success-600/30 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="font-semibold">طباعة</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="flex items-center justify-center gap-3 px-6 py-3 bg-secondary-100 hover:bg-secondary-200 active:bg-secondary-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-secondary-700 dark:text-gray-200 rounded-lg border border-secondary-300 dark:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
                        >
                            <X className="w-5 h-5" />
                            <span className="font-semibold">إلغاء</span>
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
        </ModalOverlay>
    );
}