import { useState } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { DollarSign, Users, FileText, Anchor } from 'lucide-react';
import FinancialReports, { FINANCIAL_REPORTS_DATA, FinancialReportType } from './reports/FinancialReports';
import CustomerReports from './reports/CustomerReports';
import CustomsReports from './reports/CustomsReports';
import AgentReports from './reports/AgentReports';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

type ReportCategory = 'financial' | 'customers' | 'customs' | 'agents' | null;

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(null);
  const [selectedFinancialReport, setSelectedFinancialReport] = useState<FinancialReportType>(null);
  const { user, canAccessScreen } = useAuth();

  const categories = [
    {
      id: 'financial' as ReportCategory,
      title: 'التقارير المالية',
      description: 'الخزنة، البنوك، الإيرادات والمصروفات',
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20 hover:shadow-blue-500/30',
      screenId: 'reports_financial',
    },
    {
      id: 'customers' as ReportCategory,
      title: 'تقارير العملاء',
      description: 'كشف حساب العملاء والأرصدة',
      icon: Users,
      gradient: 'from-green-500 to-green-600',
      shadow: 'shadow-green-500/20 hover:shadow-green-500/30',
      screenId: 'reports_customers',
    },
    {
      id: 'customs' as ReportCategory,
      title: 'تقرير البيانات والايرادات',
      description: 'تقرير إحصائي للإيرادات والبيانات الجمركية',
      icon: FileText,
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/20 hover:shadow-orange-500/30',
      screenId: 'reports_customs',
    },
    {
      id: 'agents' as ReportCategory,
      title: 'الوكلاء الملاحيين',
      description: 'كشف حساب الوكلاء والرحلات',
      icon: Anchor,
      gradient: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/20 hover:shadow-purple-500/30',
      screenId: 'reports_agents',
    },
  ];

  // Filter categories based on permissions
  const visibleCategories = user?.isAdmin
    ? categories
    : categories.filter(cat => canAccessScreen(cat.screenId));

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

  if (selectedCategory) {
    // Generate breadcrumb items
    const breadcrumbItems = [
      {
        label: 'التقارير',
        onClick: () => {
          setSelectedCategory(null);
          setSelectedFinancialReport(null);
        }
      },
      {
        label: categories.find((c) => c.id === selectedCategory)?.title || '',
        onClick: selectedFinancialReport ? () => setSelectedFinancialReport(null) : undefined
      }
    ];

    // Add 3rd level for financial reports if selected
    if (selectedCategory === 'financial' && selectedFinancialReport) {
      const reportTitle = FINANCIAL_REPORTS_DATA.find(r => r.id === selectedFinancialReport)?.title || '';
      breadcrumbItems.push({
        label: reportTitle,
        onClick: undefined
      });
    }

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-3">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {selectedCategory === 'financial' && (
          <FinancialReports
            selectedReport={selectedFinancialReport}
            onSelectReport={setSelectedFinancialReport}
          />
        )}
        {selectedCategory === 'customers' && <CustomerReports />}
        {selectedCategory === 'customs' && <CustomsReports />}
        {selectedCategory === 'agents' && <AgentReports />}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 p-1"
    >
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              التقارير
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              التقارير المالية والجمركية وتتبع الأداء
            </p>
          </div>
        </div>
      </div>

      {visibleCategories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            لا توجد صلاحيات
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            عذراً، ليس لديك الصلاحيات الكافية للوصول إلى أي من التقارير. يرجى مراجعة مدير النظام.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12"
        >
          {visibleCategories.map((category) => {
            const Icon = category.icon;

            return (
              <motion.button
                key={category.id}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 text-right border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden ${category.shadow}`}
              >
                {/* Decorative Background Blob */}
                <div className={`absolute -left-16 -top-16 w-32 h-32 bg-gradient-to-br ${category.gradient} rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`} />

                <div className="relative z-10 flex flex-col h-full">
                  {/* Header: Icon + Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-300 transition-all">
                      {category.title}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                    {category.description}
                  </p>

                  {/* Action Indicator */}
                  <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors mt-auto pt-2 border-t border-gray-50 dark:border-gray-700/50">
                    <span>عرض التقارير</span>
                    <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
