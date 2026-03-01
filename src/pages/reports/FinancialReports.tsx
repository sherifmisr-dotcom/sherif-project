import { Wallet, Building2, TrendingUp, FileText, BookOpen, Scale, Receipt, DollarSign } from 'lucide-react';
import TreasuryReport from './financial/TreasuryReport';
import BankReport from './financial/BankReport';
import IncomeStatement from './financial/IncomeStatement';
import GeneralJournal from './financial/GeneralJournal';
import TrialBalance from './financial/TrialBalance';
import IncomeExpensesReport from './financial/ExpensesReport';
import VatReport from './financial/VatReport';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export type FinancialReportType = 'treasury' | 'banks' | 'income-expenses' | 'income-statement' | 'general-journal' | 'trial-balance' | 'vat-report' | null;

export const FINANCIAL_REPORTS_DATA = [
  {
    id: 'treasury' as FinancialReportType,
    title: 'الخزنة والنقدية',
    description: 'كشف حركة الخزنة',
    icon: Wallet,
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/20 hover:shadow-blue-500/30',
    screenId: 'reports_treasury_cash',
  },
  {
    id: 'banks' as FinancialReportType,
    title: 'الحسابات البنكية',
    description: 'كشف حركة البنوك',
    icon: Building2,
    gradient: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/20 hover:shadow-emerald-500/30',
    screenId: 'reports_bank_accounts',
  },
  {
    id: 'income-expenses' as FinancialReportType,
    title: 'الإيرادات والمصروفات',
    description: 'تقرير مقارن',
    icon: TrendingUp,
    gradient: 'from-orange-500 to-orange-600',
    shadow: 'shadow-orange-500/20 hover:shadow-orange-500/30',
    screenId: 'reports_income_expenses',
  },
  {
    id: 'income-statement' as FinancialReportType,
    title: 'قائمة الدخل',
    description: 'قائمة الدخل التفصيلية',
    icon: FileText,
    gradient: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/20 hover:shadow-purple-500/30',
    screenId: 'reports_income_statement',
    isUnderDevelopment: true,
  },
  {
    id: 'general-journal' as FinancialReportType,
    title: 'اليومية العامة',
    description: 'سجل القيود المحاسبية',
    icon: BookOpen,
    gradient: 'from-indigo-500 to-indigo-600',
    shadow: 'shadow-indigo-500/20 hover:shadow-indigo-500/30',
    screenId: 'reports_general_journal',
    isUnderDevelopment: true,
  },
  {
    id: 'trial-balance' as FinancialReportType,
    title: 'ميزان المراجعة',
    description: 'أرصدة الحسابات',
    icon: Scale,
    gradient: 'from-pink-500 to-pink-600',
    shadow: 'shadow-pink-500/20 hover:shadow-pink-500/30',
    screenId: 'reports_trial_balance',
    isUnderDevelopment: true,
  },
  {
    id: 'vat-report' as FinancialReportType,
    title: 'تقرير القيمة المضافة',
    description: 'ضريبة المخرجات - ZATCA',
    icon: Receipt,
    gradient: 'from-teal-500 to-teal-600',
    shadow: 'shadow-teal-500/20 hover:shadow-teal-500/30',
    screenId: 'reports_vat',
  },
];

interface FinancialReportsProps {
  selectedReport: FinancialReportType;
  onSelectReport: (report: FinancialReportType) => void;
}

export default function FinancialReports({ selectedReport, onSelectReport }: FinancialReportsProps) {
  const { user, canAccessScreen } = useAuth();

  // Filter reports based on permissions
  const visibleReports = user?.isAdmin
    ? FINANCIAL_REPORTS_DATA
    : FINANCIAL_REPORTS_DATA.filter(report => canAccessScreen(report.screenId));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 }
    }
  };

  if (selectedReport) {
    return (
      <div className="space-y-6">


        {selectedReport === 'treasury' && <TreasuryReport />}
        {selectedReport === 'banks' && <BankReport />}
        {selectedReport === 'income-expenses' && <IncomeExpensesReport />}
        {selectedReport === 'income-statement' && <IncomeStatement />}
        {selectedReport === 'general-journal' && <GeneralJournal />}
        {selectedReport === 'trial-balance' && <TrialBalance />}
        {selectedReport === 'vat-report' && <VatReport />}
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1">
      {visibleReports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <DollarSign className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            لا توجد صلاحيات
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            عذراً، ليس لديك الصلاحيات الكافية للوصول إلى أي من التقارير المالية. يرجى مراجعة مدير النظام.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12"
        >
          {visibleReports.map((report) => {
            const Icon = report.icon;

            return (
              <motion.button
                key={report.id}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={report.isUnderDevelopment ? {} : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => report.isUnderDevelopment ? null : onSelectReport(report.id as FinancialReportType)}
                style={{ willChange: 'transform' }}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 text-right border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-shadow duration-300 group overflow-hidden ${report.shadow} ${report.isUnderDevelopment ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                {/* Decorative Background Blob */}
                <div className={`absolute -left-16 -top-16 w-32 h-32 bg-gradient-to-br ${report.gradient} rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`} />

                {report.isUnderDevelopment && (
                  <div className="absolute top-4 left-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold px-2 py-1 rounded-md z-20">
                    قريباً
                  </div>
                )}

                <div className={`relative z-10 flex flex-col h-full ${report.isUnderDevelopment ? 'opacity-70 grayscale-[30%]' : ''}`}>
                  {/* Header: Icon + Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${report.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-300 transition-all">
                      {report.title}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                    {report.description}
                  </p>

                  {/* Action Indicator */}
                  <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors mt-auto pt-2 border-t border-gray-50 dark:border-gray-700/50">
                    <span>{report.isUnderDevelopment ? 'تحت التطوير' : 'عرض التقرير'}</span>
                    {!report.isUnderDevelopment && (
                      <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
