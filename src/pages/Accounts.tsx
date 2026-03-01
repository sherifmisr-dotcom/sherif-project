import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Building2, FileText, Banknote, ArrowLeftRight, Search } from 'lucide-react';
import Treasury from './accounts/Treasury';
import BankAccounts from './accounts/BankAccounts';
import Vouchers from './accounts/Vouchers';
import Payroll from './accounts/Payroll';
import InternalTransfers from './accounts/InternalTransfers';
import VoucherSearch from './accounts/VoucherSearch';
import CustomsFeesBatches from './accounts/CustomsFeesBatches';

type Tab = 'treasury' | 'banks' | 'vouchers' | 'transfers' | 'search' | 'payroll' | 'customs-fees';

export default function Accounts() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || 'treasury');

  // Update active tab when URL params change
  useEffect(() => {
    if (tabParam && ['treasury', 'banks', 'vouchers', 'transfers', 'search', 'payroll', 'customs-fees'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const tabs = [
    { id: 'treasury' as Tab, label: 'الخزنة', icon: Wallet },
    { id: 'banks' as Tab, label: 'الحسابات البنكية', icon: Building2 },
    { id: 'vouchers' as Tab, label: 'السندات', icon: FileText },
    { id: 'customs-fees' as Tab, label: 'الرسوم الجمركية', icon: FileText },
    { id: 'transfers' as Tab, label: 'التحويلات الداخلية', icon: ArrowLeftRight },
    { id: 'search' as Tab, label: 'البحث في السندات', icon: Search },
    { id: 'payroll' as Tab, label: 'الرواتب', icon: Banknote },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-3 md:px-6 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
              إدارة الحسابات
            </h1>
            <span className="text-gray-300 dark:text-gray-600 hidden md:inline">|</span>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hidden md:block">
              إدارة الخزنة والحسابات البنكية والسندات وكشوف الرواتب
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 py-3 md:px-6 md:py-4 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 md:p-6">
          {activeTab === 'treasury' && <Treasury />}
          {activeTab === 'banks' && <BankAccounts />}
          {activeTab === 'vouchers' && <Vouchers />}
          {activeTab === 'customs-fees' && <CustomsFeesBatches />}
          {activeTab === 'transfers' && <InternalTransfers />}
          {activeTab === 'search' && <VoucherSearch />}
          {activeTab === 'payroll' && <Payroll />}
        </div>
      </div>
    </div>
  );
}
