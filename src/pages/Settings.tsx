import { useState, useEffect } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Tag, Building2, Printer, Users, FileText, FileSpreadsheet, Database, Wallet, Calendar, Ship, Info, Settings as SettingsIcon } from 'lucide-react';
import ExpenseCategories from './settings/ExpenseCategories';
import InvoiceItemTemplates from './settings/InvoiceItemTemplates';
import IncomeStatementSettings from './settings/IncomeStatementSettings';
import UserManagement from './settings/UserManagement';
import CompanySettings from './settings/CompanySettings';
import BackupSettings from './settings/BackupSettings';
import TreasurySettings from './settings/TreasurySettings';
import CarryForwardSettings from './settings/CarryForwardSettings';
import AgentSettings from './settings/AgentSettings';
import AboutDeveloper from './settings/AboutDeveloper';
import { ResetSystemModal } from './settings/modals/ResetSystemModal';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

import { ChevronLeft } from 'lucide-react';

type SettingsSection = 'expense-categories' | 'invoice-templates' | 'income-statement-config' | 'company' | 'print' | 'users' | 'backup' | 'treasury' | 'carry-forward' | 'agent-settings' | 'about' | 'reset' | null;

export default function Settings() {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>(null);
  const { user, canAccessScreen } = useAuth();

  // Scroll to top when opening a section
  useEffect(() => {
    if (selectedSection) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedSection]);

  const sections = [
    // 1. Core & Admin
    {
      id: 'company' as SettingsSection,
      title: 'بيانات الشركة',
      description: 'معلومات الشركة والإعدادات',
      icon: Building2,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'hover:shadow-blue-500/25',
      screenId: 'settings_company',
    },
    {
      id: 'users' as SettingsSection,
      title: 'المستخدمين',
      description: 'إدارة المستخدمين والصلاحيات',
      icon: Users,
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'hover:shadow-orange-500/25',
      screenId: 'settings_users',
    },
    // 2. Financial & Accounting
    {
      id: 'treasury' as SettingsSection,
      title: 'إعدادات الخزنة',
      description: 'إدارة إعدادات الخزنة',
      icon: Wallet,
      gradient: 'from-cyan-500 to-cyan-600',
      shadow: 'hover:shadow-cyan-500/25',
      screenId: 'settings_treasury',
    },
    {
      id: 'expense-categories' as SettingsSection,
      title: 'تصنيفات المصروفات',
      description: 'إدارة تصنيفات المصروفات',
      icon: Tag,
      gradient: 'from-purple-500 to-purple-600',
      shadow: 'hover:shadow-purple-500/25',
      screenId: 'settings_expense_categories',
    },
    {
      id: 'income-statement-config' as SettingsSection,
      title: 'إعدادات قائمة الدخل',
      description: 'تحديد الإيرادات والمصروفات',
      icon: FileSpreadsheet,
      gradient: 'from-emerald-500 to-emerald-600',
      shadow: 'hover:shadow-emerald-500/25',
      screenId: 'settings_income_statement',
      isUnderDevelopment: true
    },
    // 3. Operations & Customs
    {
      id: 'invoice-templates' as SettingsSection,
      title: 'بنود الفواتير المحفوظة',
      description: 'إدارة البنود المحفوظة للاستخدام السريع',
      icon: FileText,
      gradient: 'from-teal-500 to-teal-600',
      shadow: 'hover:shadow-teal-500/25',
      screenId: 'settings_invoice_templates',
    },
    {
      id: 'agent-settings' as SettingsSection,
      title: 'الوكلاء الملاحيين',
      description: 'القيم الافتراضية للنولون وأجور الموانئ',
      icon: Ship,
      gradient: 'from-sky-500 to-sky-600',
      shadow: 'hover:shadow-sky-500/25',
      screenId: 'settings_agents',
    },
    // 4. System & Printing
    {
      id: 'print' as SettingsSection,
      title: 'إعدادات الطباعة',
      description: 'تخصيص قوالب الطباعة',
      icon: Printer,
      gradient: 'from-green-500 to-green-600',
      shadow: 'hover:shadow-green-500/25',
      screenId: 'settings_print',
      isUnderDevelopment: true
    },
    {
      id: 'carry-forward' as SettingsSection,
      title: 'الترحيل التلقائي',
      description: 'إعدادات الترحيل التلقائي للأرصدة',
      icon: Calendar,
      gradient: 'from-violet-500 to-violet-600',
      shadow: 'hover:shadow-violet-500/25',
      screenId: 'settings_carry_forward',
    },
    {
      id: 'backup' as SettingsSection,
      title: 'النسخ الاحتياطي',
      description: 'إدارة النسخ الاحتياطي للبيانات',
      icon: Database,
      gradient: 'from-indigo-500 to-indigo-600',
      shadow: 'hover:shadow-indigo-500/25',
      screenId: 'settings_backup',
    },
    {
      id: 'about' as SettingsSection,
      title: 'عن النظام',
      description: 'معلومات المطور والتطبيق',
      icon: Info,
      gradient: 'from-gray-500 to-gray-600',
      shadow: 'hover:shadow-gray-500/25',
      screenId: 'settings_about',
      alwaysVisible: true
    },
  ];

  // Filter sections based on user permissions
  const visibleSections = sections.filter(section =>
    //@ts-ignore
    section.alwaysVisible ||
    user?.isAdmin ||
    (section.screenId && canAccessScreen(section.screenId))
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' as const }
    }
  };

  if (selectedSection) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-3 mb-6">
          <Breadcrumb
            items={[
              { label: 'الإعدادات', onClick: () => setSelectedSection(null) },
              { label: sections.find(s => s.id === selectedSection)?.title || '' }
            ]}
          />
        </div>

        {selectedSection === 'expense-categories' && <ExpenseCategories />}
        {selectedSection === 'invoice-templates' && <InvoiceItemTemplates />}
        {selectedSection === 'income-statement-config' && <IncomeStatementSettings />}
        {selectedSection === 'users' && <UserManagement />}
        {selectedSection === 'company' && <CompanySettings />}
        {selectedSection === 'backup' && <BackupSettings />}
        {selectedSection === 'treasury' && <TreasurySettings />}
        {selectedSection === 'carry-forward' && <CarryForwardSettings />}
        {selectedSection === 'agent-settings' && <AgentSettings />}
        {selectedSection === 'about' && <AboutDeveloper />}
        {selectedSection === 'reset' && <ResetSystemModal isOpen={true} onClose={() => setSelectedSection(null)} />}
        {selectedSection === 'print' && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12">
            <p className="text-center text-gray-500 dark:text-gray-400">
              إعدادات الطباعة قيد الإنشاء...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-8 p-1"
    >
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-slate-500 to-gray-700 rounded-xl shadow-lg shadow-slate-500/20 text-white">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            الإعدادات
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            إعدادات النظام والمستخدمين
          </p>
        </div>
      </div>

      {visibleSections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            لا توجد صلاحيات للوصول إلى أي من أقسام الإعدادات
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {visibleSections.map((section) => {
            const Icon = section.icon;
            // @ts-ignore
            const isDev = section.isUnderDevelopment;

            return (
              <motion.button
                key={section.id}
                variants={itemVariants}
                whileHover={isDev ? {} : { y: -3 }}
                whileTap={isDev ? {} : { scale: 0.98 }}
                onClick={() => !isDev && setSelectedSection(section.id)}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 text-right border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 group overflow-hidden h-full flex flex-col hover:shadow-xl ${section.shadow} ${isDev ? 'cursor-not-allowed' : ''}`}
              >
                {/* Subtle decorative blob */}
                <div className={`absolute -left-10 -top-10 w-32 h-32 bg-gradient-to-br ${section.gradient} rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300 blur-2xl`} />

                {/* Coming Soon Badge like Reports */}
                {isDev && (
                  <div className="absolute top-4 left-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold px-2 py-1 rounded-md z-20">
                    قريباً
                  </div>
                )}

                {/* Under Development Watermark */}
                {isDev && (
                  <div className="absolute inset-0 z-0 flex items-center justify-center pb-12 opacity-[0.06] dark:opacity-[0.10] pointer-events-none overflow-hidden select-none">
                    <div className="transform -rotate-12 text-[4rem] font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                      قيد التطوير
                    </div>
                  </div>
                )}

                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon & Title Row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 hover:z-20`}>
                      <Icon className="w-5 h-5 relative z-10" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base leading-tight truncate text-gray-900 dark:text-white">
                        {section.title}
                      </h3>
                      {!isDev && (
                        <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-white group-hover:-translate-x-1 transition-all duration-300 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="pl-2 mt-auto">
                    <p className="text-sm leading-relaxed max-w-[95%] text-gray-500 dark:text-gray-400">
                      {section.description}
                    </p>
                  </div>
                </div>

                {/* Subtle animated sweep for under dev */}
                {isDev && (
                  <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl overflow-hidden opacity-50">
                    <motion.div
                      animate={{ x: ['-200%', '200%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 dark:via-gray-400/20 to-transparent transform -skew-x-12"
                    />
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Danger Zone - Admin Only */}
      {user?.isAdmin && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-red-200 dark:bg-red-800/50"></div>
            <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider px-2">منطقة متقدمة</span>
            <div className="h-px flex-1 bg-red-200 dark:bg-red-800/50"></div>
          </div>

          <div className="bg-red-50/50 dark:bg-red-950/20 rounded-xl shadow-sm border border-red-100 dark:border-red-900/50 border-r-4 border-r-red-500 dark:border-r-red-500 overflow-hidden">
            <div className="p-7 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg flex-shrink-0">
                  <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 mb-1">
                    إعادة تعيين النظام
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    حذف جميع البيانات وإعادة النظام لحالته الأولية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSection('reset')}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
              >
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
