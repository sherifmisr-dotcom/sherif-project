import { useNavigate } from 'react-router-dom';
import { FileText, Package, Ship, FileEdit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

// Define invoice types with their specific styles and data
const invoiceTypes = [
  {
    title: 'فاتورة صادر',
    description: 'يتم إصدارها لحصر تكاليف وإجراءات إنهاء الشحنات المصدرة للخارج',
    icon: FileText,
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/20 hover:shadow-blue-500/30',
    path: '/invoices/export',
    screenId: 'invoices_export',
    delay: 0.1
  },
  {
    title: 'فاتورة استيراد',
    description: 'يتم إصدارها لحصر تكاليف وإجراءات إنهاء الشحنات المستوردة من الخارج',
    icon: Package,
    gradient: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/20 hover:shadow-emerald-500/30',
    path: '/invoices/import',
    screenId: 'invoices_import',
    delay: 0.2
  },
  {
    title: 'فاتورة ترانزيت',
    description: 'يتم إصدارها لحصر تكاليف وإجراءات إنهاء الشحنات العابرة (ترانزيت العادي)',
    icon: Ship,
    gradient: 'from-violet-500 to-violet-600',
    shadow: 'shadow-violet-500/20 hover:shadow-violet-500/30',
    path: '/invoices/transit',
    screenId: 'invoices_transit',
    delay: 0.3
  },
  {
    title: 'فاتورة حر',
    description: 'يتم إصدارها لحصر تكاليف إنهاء بيان العبور (ترانزيت حر)',
    icon: FileEdit,
    gradient: 'from-orange-500 to-orange-600',
    shadow: 'shadow-orange-500/20 hover:shadow-orange-500/30',
    path: '/invoices/free',
    screenId: 'invoices_free',
    delay: 0.4
  },
];

export default function Invoices() {
  const navigate = useNavigate();
  const { user, canAccessScreen } = useAuth();

  // Filter accessible invoice types
  const visibleInvoiceTypes = user?.isAdmin
    ? invoiceTypes
    : invoiceTypes.filter(type => canAccessScreen(type.screenId));

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
              نظام الفواتير
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              إدارة وإنشاء جميع أنواع الفواتير الجمركية بسهولة
            </p>
          </div>
        </div>
      </div>

      {visibleInvoiceTypes.length === 0 ? (
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
            عذراً، ليس لديك الصلاحيات الكافية للوصول إلى أي من أنواع الفواتير. يرجى مراجعة مدير النظام.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-12"
        >
          {visibleInvoiceTypes.map((type, index) => (
            <motion.button
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => navigate(type.path)}
              style={{ willChange: 'transform' }}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 text-right border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-shadow duration-300 group overflow-hidden ${type.shadow}`}
            >
              {/* Decorative Background Blob */}
              <div className={`absolute -left-16 -top-16 w-32 h-32 bg-gradient-to-br ${type.gradient} rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`} />

              <div className="relative z-10 flex flex-col h-full">
                {/* Header: Icon + Title */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-300 transition-all">
                    {type.title}
                  </h3>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                  {type.description}
                </p>

                {/* Action Indicator */}
                <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors mt-auto pt-2 border-t border-gray-50 dark:border-gray-700/50">
                  <span>بدء الإنشاء</span>
                  <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
