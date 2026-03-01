import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Ship,
  Wallet,
  UsersRound,
  FileBarChart,
  Settings,
  ChevronRight,
  LogOut,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const menuItems = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, screenId: null }, // Dashboard is always accessible
  { path: '/customers', label: 'العملاء', icon: Users, screenId: 'customers' },
  { path: '/invoices', label: 'الفواتير', icon: FileText, screenId: null }, // Invoices page is a hub, check sub-pages
  { path: '/agents', label: 'الوكلاء الملاحيين', icon: Ship, screenId: 'agents' },
  { path: '/accounts', label: 'إدارة الحسابات', icon: Wallet, screenId: 'treasury' },
  { path: '/employees', label: 'إدارة الموظفين', icon: UsersRound, screenId: 'employees' },
  { path: '/reports', label: 'التقارير', icon: FileBarChart, screenId: 'reports_financial' },
  { path: '/settings', label: 'الإعدادات', icon: Settings, screenId: 'settings' },
];

export default function Sidebar({ isOpen, isCollapsed, isMobile, onToggle, onClose }: SidebarProps) {
  const { user, logout, canAccessScreen, hasAnyInvoicePermission, hasAnySettingsPermission, hasAnyAccountsPermission } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch company name from settings
  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const response = await apiClient.getCompanySettings();
        const data = response.data || response;
        if (data?.nameAr) {
          setCompanyName(data.nameAr);
        } else {
          setCompanyName('نظام إدارة العمليات الجمركية');
        }
      } catch (error) {
        console.error('Error fetching company name:', error);
        setCompanyName('نظام إدارة العمليات الجمركية');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyName();
  }, []);

  // Filter menu items based on permissions
  const visibleMenuItems = useMemo(() => {
    // Admins see everything
    if (user?.isAdmin) {
      return menuItems;
    }

    // Filter items based on permissions
    return menuItems.filter(item => {
      // Dashboard is always visible
      if (item.path === '/dashboard') {
        return true;
      }

      // Special handling for invoices - check if user has ANY invoice permission
      if (item.path === '/invoices') {
        return hasAnyInvoicePermission();
      }

      // Special handling for settings - check if user has ANY settings permission
      if (item.path === '/settings') {
        return hasAnySettingsPermission();
      }

      // Special handling for accounts - check if user has ANY accounts permission
      if (item.path === '/accounts') {
        return hasAnyAccountsPermission();
      }

      // Items without screenId are not visible to non-admins
      if (!item.screenId) {
        return false;
      }

      // Check if user has permission to view this screen
      return canAccessScreen(item.screenId);
    });
  }, [user, canAccessScreen, hasAnyInvoicePermission, hasAnySettingsPermission, hasAnyAccountsPermission]);

  if (!isOpen) return null;

  // On mobile: collapsed mode doesn't apply, always show full sidebar
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const sidebarContent = (
    <aside
      className={`fixed right-0 top-0 h-full bg-gradient-to-b from-primary-900 to-primary-800 border-l border-primary-700/50 transition-[width] duration-300 ease-in-out z-50 flex flex-col shadow-xl ${effectiveCollapsed ? 'w-[72px]' : 'w-64'
        }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-primary-700/50">
        <style>
          {`
            @keyframes smoothEntry {
              0% { opacity: 0; transform: translateY(5px); }
              100% { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
        <div
          className={`flex flex-col flex-1 min-w-0 pr-2 overflow-hidden ${effectiveCollapsed
            ? 'w-0 opacity-0 transition-all duration-200'
            : 'w-auto opacity-100 transition-all duration-300 delay-100'
            }`}
        >
          {isLoading ? (
            // Skeleton Loader
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-primary-700/50 rounded w-3/4"></div>
              <div className="h-3 bg-primary-700/30 rounded w-1/2"></div>
            </div>
          ) : (
            <div
              key={companyName} // Trigger animation on name change
              style={{ animation: 'smoothEntry 0.8s ease-out backwards' }}
            >
              <div className="overflow-hidden whitespace-nowrap" title={companyName}>
                <h2
                  className="text-base font-extrabold text-white inline-block"
                  style={{
                    animation: companyName.length > 28 ? 'marqueeRtl 8s linear infinite' : 'none',
                    animationDelay: '2s',
                  }}
                >
                  {companyName}
                </h2>
              </div>
            </div>
          )}
        </div>
        {isMobile ? (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-primary-700/50 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-primary-100" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-primary-700/50 transition-colors flex-shrink-0"
          >
            <ChevronRight
              className={`w-5 h-5 text-primary-100 transition-transform duration-300 ${effectiveCollapsed ? 'rotate-180 (moved)' : ''
                }`}
            />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-primary-700/40 text-white border-r-4 border-primary-300 shadow-lg'
                  : 'text-primary-100 hover:bg-primary-700/30 hover:text-white'
                } ${effectiveCollapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={`text-sm font-medium overflow-hidden whitespace-nowrap ${effectiveCollapsed
                ? 'w-0 opacity-0 transition-all duration-200'
                : 'w-auto opacity-100 transition-all duration-300 delay-75'
                }`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-primary-700/50 p-4 bg-primary-900/50">
        <div
          className={`flex items-center gap-3 mb-3 ${effectiveCollapsed ? 'justify-center' : ''
            }`}
        >
          <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0 ring-2 ring-primary-500/30">
            <User className="w-5 h-5 text-primary-100" />
          </div>
          <div className={`flex-1 min-w-0 overflow-hidden ${effectiveCollapsed
            ? 'w-0 opacity-0 transition-all duration-200'
            : 'w-auto opacity-100 transition-all duration-300 delay-100'
            }`}>
            <p className="text-sm font-medium text-white truncate">
              {user?.username}
            </p>
            <p className="text-xs text-primary-200">
              {user?.isAdmin ? 'مدير' : 'مستخدم'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-300 hover:bg-red-900/20 hover:text-red-200 transition-colors ${effectiveCollapsed ? 'justify-center' : ''
            }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className={`text-sm font-medium overflow-hidden whitespace-nowrap ${effectiveCollapsed
            ? 'w-0 opacity-0 transition-all duration-200'
            : 'w-auto opacity-100 transition-all duration-300 delay-100'
            }`}>
            تسجيل الخروج
          </span>
        </button>
      </div>
    </aside>
  );

  // On mobile: wrap with backdrop overlay
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 transition-opacity duration-300"
          onClick={onClose}
        />
        {sidebarContent}
      </>
    );
  }

  return sidebarContent;
}

