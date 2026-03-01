import { useNavigate } from 'react-router-dom';
import { UserPlus, Ship, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Agents() {
  const { user, canAccessScreen } = useAuth();
  const navigate = useNavigate();

  const cards = [
    {
      title: 'إضافة وكيل ملاحي',
      description: 'إدارة الوكلاء الملاحيين والعبارات',
      icon: UserPlus,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20 hover:shadow-blue-500/30',
      path: '/agents/add',
      screenId: 'agents',
    },
    {
      title: 'تسجيل رحلة',
      description: 'تسجيل رحلات جديدة للوكلاء',
      icon: Ship,
      gradient: 'from-teal-500 to-teal-600',
      shadow: 'shadow-teal-500/20 hover:shadow-teal-500/30',
      path: '/agents/trips',
      screenId: 'trips',
    },
    {
      title: 'تسجيل رسوم إضافية',
      description: 'إضافة رسوم إضافية للرحلات',
      icon: DollarSign,
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/20 hover:shadow-orange-500/30',
      path: '/agents/fees',
      screenId: 'fees',
    },
  ];

  // Filter cards based on user permissions
  const visibleCards = user?.isAdmin
    ? cards
    : cards.filter(card => canAccessScreen(card.screenId));

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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              الوكلاء الملاحيين
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              إدارة الوكلاء الملاحيين والرحلات والرسوم
            </p>
          </div>
        </div>
      </div>

      {visibleCards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ship className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            لا توجد صلاحيات
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            عذراً، ليس لديك الصلاحيات الكافية للوصول إلى أي من خدمات الوكلاء. يرجى مراجعة مدير النظام.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
        >
          {visibleCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <motion.button
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => navigate(card.path)}
                style={{ willChange: 'transform' }}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 text-right border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-shadow duration-300 group overflow-hidden ${card.shadow}`}
              >
                {/* Decorative Background Blob */}
                <div className={`absolute -left-16 -top-16 w-32 h-32 bg-gradient-to-br ${card.gradient} rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`} />

                <div className="relative z-10 flex flex-col h-full">
                  {/* Header: Icon + Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-300 transition-all">
                      {card.title}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
                    {card.description}
                  </p>

                  {/* Action Indicator */}
                  <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors mt-auto pt-2 border-t border-gray-50 dark:border-gray-700/50">
                    <span>الدخول للخدمة</span>
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
