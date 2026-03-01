import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Search, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import CustomsStatementPrint from '@/components/CustomsStatementPrint';
import { showError } from '@/lib/toast';
import { motion } from 'framer-motion';

interface CustomsInvoice {
  id: string;
  date: Date;
  customerName: string;
  declarationNo: string;
  type: 'IMPORT' | 'EXPORT' | 'TRANSIT' | 'FREE';
  total: number;
  clearanceFees: number;
}

interface CustomsReportData {
  period: { from: Date | null; to: Date | null };
  filters: { types: string[] };
  invoices: CustomsInvoice[];
  summary: {
    totalCount: number;
    totalAmount: number;
    totalClearanceFees: number;
  };
}

const TYPE_LABELS = {
  IMPORT: 'وارد',
  EXPORT: 'صادر',
  TRANSIT: 'ترانزيت',
  FREE: 'حر',
};

const TYPE_COLORS = {
  IMPORT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  EXPORT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  TRANSIT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  FREE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function CustomsReports() {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [data, setData] = useState<CustomsReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const generateReport = async () => {
    if (selectedTypes.length === 0) {
      showError('يجب اختيار نوع فاتورة واحد على الأقل');
      return;
    }

    setLoading(true);
    try {
      const params = {
        from: startDate,
        to: endDate,
        types: selectedTypes.join(','),
      };
      const response = await apiClient.getCustomsReport(params);
      setData(response);
    } catch (error) {
      console.error('Error generating customs report:', error);
      showError('حدث خطأ أثناء إنشاء التقرير الجمركي');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            تقرير البيانات والايرادات
          </h3>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-start gap-8">
            {/* Date Filters - Compact Design */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">من</span>
              <div className="relative flex-1 min-w-[140px] sm:flex-none">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-auto pl-4 pr-9 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">إلى</span>
              <div className="relative flex-1 min-w-[140px] sm:flex-none">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-auto pl-4 pr-9 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">أنواع الفواتير:</span>
              {Object.entries(TYPE_LABELS).map(([type, label]) => {
                const checked = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${checked
                      ? `${TYPE_COLORS[type as keyof typeof TYPE_COLORS]} border-transparent`
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="btn-primary px-4 sm:px-6 py-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              {loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
            </button>
            {data && (
              <button
                onClick={() => setShowPrint(true)}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors font-medium shrink-0"
              >
                معاينة وطباعة
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Table */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-6">
            <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 text-center">
              تقرير البيانات والايرادات
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
              من {format(new Date(startDate), 'dd/MM/yyyy')} إلى {format(new Date(endDate), 'dd/MM/yyyy')}
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
              الأنواع: {selectedTypes.map(t => TYPE_LABELS[t as keyof typeof TYPE_LABELS]).join(' - ')}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6 bg-gray-50 dark:bg-gray-700/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي عدد البيانات</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.summary.totalCount}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي مبالغ الفواتير</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(data.summary.totalAmount)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي أجور التخليص</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(data.summary.totalClearanceFees)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    التاريخ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    العميل
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    رقم البيان
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    النوع
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    مبلغ الفاتورة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    أجور التخليص
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      لا توجد فواتير في هذه الفترة
                    </td>
                  </tr>
                ) : (
                  data.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {format(new Date(invoice.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {invoice.customerName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {invoice.declarationNo}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[invoice.type]}`}>
                          {TYPE_LABELS[invoice.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatNumber(invoice.total)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                        {formatNumber(invoice.clearanceFees)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {!loading && !data && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            اختر الفترة والأنواع وانقر على "إنشاء التقرير" لعرض تقرير البيانات والايرادات
          </p>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrint && data && (
        <CustomsStatementPrint
          startDate={startDate}
          endDate={endDate}
          selectedTypes={selectedTypes}
          invoices={data.invoices}
          totalCount={data.summary.totalCount}
          totalAmount={data.summary.totalAmount}
          totalClearanceFees={data.summary.totalClearanceFees}
          onClose={() => setShowPrint(false)}
        />
      )}
    </motion.div>
  );
}
