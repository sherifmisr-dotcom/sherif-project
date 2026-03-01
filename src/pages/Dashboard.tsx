import { Users, FileText, DollarSign, TrendingUp, TrendingDown, Plus, FileOutput, FileInput, Truck, Plane, ArrowLeftRight, Receipt, Wallet, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import AppFooter from '@/components/AppFooter';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch customer stats
  const { data: customerStats } = useQuery({
    queryKey: ['customerStats'],
    queryFn: () => apiClient.getCustomerStats(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch invoice stats for current month
  const { data: invoiceStats } = useQuery({
    queryKey: ['invoiceStats', new Date().getFullYear(), new Date().getMonth()],
    queryFn: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Format dates as YYYY-MM-DD in local timezone to avoid UTC conversion
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      return apiClient.getInvoiceStats({
        from: formatLocalDate(firstDay),
        to: formatLocalDate(lastDay),
      });
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch treasury balance
  const { data: treasuryBalance } = useQuery({
    queryKey: ['treasuryBalance'],
    queryFn: () => apiClient.getTreasuryBalance(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch debtors total (customers with positive balance)
  const { data: debtorsData } = useQuery({
    queryKey: ['debtorsTotal'],
    queryFn: () => apiClient.getCustomersBalance(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch creditors total (shipping agents with positive balance)
  const { data: creditorsData } = useQuery({
    queryKey: ['creditorsTotal'],
    queryFn: () => apiClient.getAgentsBalance(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch bank balance
  const { data: bankBalanceData } = useQuery({
    queryKey: ['bankBalance'],
    queryFn: () => apiClient.getBankBalance(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch monthly collections
  const { data: monthlyCollectionsData } = useQuery({
    queryKey: ['monthlyCollections'],
    queryFn: () => apiClient.getMonthlyCollections(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch recent activities
  const { data: recentActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: () => apiClient.getRecentActivities(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const mainStats = [
    {
      title: 'إجمالي العملاء',
      value: customerStats?.total?.toString() || '0',
      icon: Users,
      color: 'bg-blue-500',
      loading: !customerStats,
    },
    {
      title: 'عدد فواتير الشهر',
      value: invoiceStats?.totalInvoices?.toString() || '0',
      icon: FileText,
      color: 'bg-green-500',
      loading: !invoiceStats,
    },
    {
      title: 'إجمالي فواتير الشهر',
      value: invoiceStats?.totalAmount
        ? `${invoiceStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
        : '0.00 ر.س',
      icon: DollarSign,
      color: 'bg-yellow-500',
      loading: !invoiceStats,
    },
    {
      title: 'رصيد الخزينة',
      value: treasuryBalance?.currentBalance !== undefined
        ? `${treasuryBalance.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
        : '0.00 ر.س',
      icon: TrendingUp,
      color: 'bg-purple-500',
      loading: !treasuryBalance,
    },
  ];

  const debtorsStat = {
    title: 'المدينون (العملاء)',
    value: debtorsData !== undefined
      ? `${debtorsData.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
      : '0.00 ر.س',
    icon: TrendingDown,
    color: 'bg-red-500',
    loading: debtorsData === undefined,
  };

  const creditorsStat = {
    title: 'الدائنون (الوكلاء الملاحيين)',
    value: creditorsData !== undefined
      ? `${creditorsData.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
      : '0.00 ر.س',
    icon: TrendingDown,
    color: 'bg-orange-500',
    loading: creditorsData === undefined,
  };

  const bankBalanceStat = {
    title: 'الأرصدة البنكية',
    value: bankBalanceData !== undefined
      ? `${bankBalanceData.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
      : '0.00 ر.س',
    icon: DollarSign,
    color: 'bg-cyan-500',
    loading: bankBalanceData === undefined,
  };

  const monthlyCollectionsStat = {
    title: 'المبالغ المحصلة هذا الشهر',
    value: monthlyCollectionsData !== undefined
      ? `${monthlyCollectionsData.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
      : '0.00 ر.س',
    icon: TrendingUp,
    color: 'bg-emerald-500',
    loading: monthlyCollectionsData === undefined,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col min-h-[calc(100vh-7rem)]"
    >
      <div className="space-y-6 flex-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 md:p-6 relative overflow-hidden"
        >
          {/* Decorative background elements */}
          <div className="absolute -left-20 -top-20 w-40 h-40 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-1 md:mb-2">
              مرحباً بك في نظام إدارة العمليات الجمركية
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium">
              يمكنك الآن البدء في إدارة العملاء والفواتير والحسابات من خلال القوائم الجانبية
            </p>
          </div>
        </motion.div>

        {/* Financial Statistics Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">الإحصائيات المالية والبيانات</h3>
          </div>

          {/* Main Stats - 4 cards in one row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mainStats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.2 + index * 0.05 }}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
              >
                <div className="p-4">
                  {/* Header with icon and title */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`${stat.color} bg-opacity-10 dark:bg-opacity-20 p-2.5 rounded-lg flex-shrink-0 group-hover:ring-4 ${stat.color.replace('bg-', 'ring-')} ring-opacity-10 transition-all duration-300`}>
                      <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {stat.title}
                    </p>
                  </div>

                  {/* Value */}
                  <div className="pr-2">
                    {stat.loading ? (
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
                    ) : (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Debtors and Creditors Cards - Separate row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Debtors Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.4 }}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${debtorsStat.color} bg-opacity-10 dark:bg-opacity-20 p-2.5 rounded-lg flex-shrink-0 group-hover:ring-4 ${debtorsStat.color.replace('bg-', 'ring-')} ring-opacity-10 transition-all duration-300`}>
                    <debtorsStat.icon className={`w-5 h-5 ${debtorsStat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {debtorsStat.title}
                  </p>
                </div>
                <div className="pr-2">
                  {debtorsStat.loading ? (
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
                  ) : (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {debtorsStat.value}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Creditors Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.45 }}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${creditorsStat.color} bg-opacity-10 dark:bg-opacity-20 p-2.5 rounded-lg flex-shrink-0 group-hover:ring-4 ${creditorsStat.color.replace('bg-', 'ring-')} ring-opacity-10 transition-all duration-300`}>
                    <creditorsStat.icon className={`w-5 h-5 ${creditorsStat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {creditorsStat.title}
                  </p>
                </div>
                <div className="pr-2">
                  {creditorsStat.loading ? (
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
                  ) : (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {creditorsStat.value}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Bank Balance Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.5 }}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${bankBalanceStat.color} bg-opacity-10 dark:bg-opacity-20 p-2.5 rounded-lg flex-shrink-0 group-hover:ring-4 ${bankBalanceStat.color.replace('bg-', 'ring-')} ring-opacity-10 transition-all duration-300`}>
                    <bankBalanceStat.icon className={`w-5 h-5 ${bankBalanceStat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {bankBalanceStat.title}
                  </p>
                </div>
                <div className="pr-2">
                  {bankBalanceStat.loading ? (
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
                  ) : (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {bankBalanceStat.value}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Monthly Collections Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.55 }}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${monthlyCollectionsStat.color} bg-opacity-10 dark:bg-opacity-20 p-2.5 rounded-lg flex-shrink-0 group-hover:ring-4 ${monthlyCollectionsStat.color.replace('bg-', 'ring-')} ring-opacity-10 transition-all duration-300`}>
                    <monthlyCollectionsStat.icon className={`w-5 h-5 ${monthlyCollectionsStat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {monthlyCollectionsStat.title}
                  </p>
                </div>
                <div className="pr-2">
                  {monthlyCollectionsStat.loading ? (
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
                  ) : (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {monthlyCollectionsStat.value}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Actions Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
              <Plus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">الإجراءات السريعة</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Invoices Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">الفواتير</h4>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => navigate('/invoices/export')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <FileOutput className="w-5 h-5 text-blue-700 dark:text-blue-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">فاتورة صادر</span>
                </button>

                <button
                  onClick={() => navigate('/invoices/import')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 hover:border-green-400 dark:hover:border-green-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <FileInput className="w-5 h-5 text-green-700 dark:text-green-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">فاتورة استيراد</span>
                </button>

                <button
                  onClick={() => navigate('/invoices/transit')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/40 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <Truck className="w-5 h-5 text-orange-700 dark:text-orange-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">فاتورة ترانزيت</span>
                </button>

                <button
                  onClick={() => navigate('/invoices/free')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/40 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <Plane className="w-5 h-5 text-purple-700 dark:text-purple-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">فاتورة حر</span>
                </button>
              </div>
            </div>

            {/* Vouchers Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                  <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">السندات</h4>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => navigate('/accounts?tab=vouchers&type=receipt')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <Receipt className="w-5 h-5 text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">سند قبض</span>
                </button>

                <button
                  onClick={() => navigate('/accounts?tab=vouchers&type=payment')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 hover:border-red-400 dark:hover:border-red-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <Wallet className="w-5 h-5 text-red-700 dark:text-red-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">سند صرف</span>
                </button>

                <button
                  onClick={() => navigate('/accounts?tab=transfers')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/40 hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <ArrowLeftRight className="w-5 h-5 text-cyan-700 dark:text-cyan-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">تحويل داخلي</span>
                </button>
              </div>
            </div>

            {/* Trips Quick Action */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                  <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">الوكلاء الملاحيين</h4>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => navigate('/agents/trips')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <Plus className="w-5 h-5 text-indigo-700 dark:text-indigo-300 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">تسجيل رحلة جديدة</span>
                </button>

                <button
                  onClick={() => navigate('/agents/fees')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/40 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-sm transition-all duration-200 group"
                >
                  <DollarSign className="w-5 h-5 text-violet-700 dark:text-violet-300 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">تسجيل رسوم إضافية</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activities Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">آخر العمليات</h3>
            </div>
          </div>

          <div className="p-5">
            {activitiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities && recentActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentActivities.map((activity: any) => {
                  const getActivityIcon = () => {
                    switch (activity.type) {
                      case 'invoice':
                        return { icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
                      case 'voucher':
                        return { icon: Receipt, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
                      case 'trip':
                        return { icon: Truck, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
                      case 'fee':
                        return { icon: DollarSign, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' };
                      case 'customer':
                        return { icon: Users, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30' };
                      default:
                        return { icon: FileText, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' };
                    }
                  };

                  const getTimeAgo = (date: string) => {
                    const now = new Date();
                    const activityDate = new Date(date);
                    const diffMs = now.getTime() - activityDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'الآن';
                    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
                    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
                    if (diffDays === 1) return 'أمس';
                    return `منذ ${diffDays} يوم`;
                  };

                  const { icon: Icon, color, bg } = getActivityIcon();

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className={`${bg} p-2.5 rounded-lg shrink-0`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {getTimeAgo(activity.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">لا توجد عمليات حديثة</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* App Footer - Dashboard Only */}
      <AppFooter className="mt-24 -mx-6 -mb-6 rounded-t-xl overflow-hidden" />
    </motion.div >
  );
}
