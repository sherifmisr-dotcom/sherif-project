import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { usePermission } from './PermissionContext';

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  canAccessScreen: (screenId: string) => boolean;
  hasAnyInvoicePermission: () => boolean;
  hasAnySettingsPermission: () => boolean;
  hasAnyAccountsPermission: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get auth data from either sessionStorage or localStorage
function getAuthItem(key: string): string | null {
  return sessionStorage.getItem(key) || localStorage.getItem(key);
}

// Helper to save auth data to the correct storage
function setAuthItem(key: string, value: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
  }
}

// Helper to remove auth data from both storages
function removeAuthItem(key: string): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const savedUser = getAuthItem('user');
      const accessToken = getAuthItem('accessToken');

      if (savedUser && accessToken) {
        // Check if session has expired due to inactivity (30 min idle timeout)
        const lastActivity = localStorage.getItem('lastActivityAt');
        if (lastActivity) {
          const idleDuration = Date.now() - parseInt(lastActivity, 10);
          const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes — must match useIdleTimeout config

          if (idleDuration >= IDLE_TIMEOUT_MS) {
            // Session expired — clear everything immediately (no flash of authenticated content)
            removeAuthItem('user');
            removeAuthItem('accessToken');
            removeAuthItem('refreshToken');
            localStorage.removeItem('lastActivityAt');
            // Set flag so login page shows the session-expired modal
            localStorage.setItem('sessionExpired', 'true');
            setLoading(false);
            return;
          }
        }

        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch {
          // Corrupted user data in storage — clear and force re-login
          removeAuthItem('user');
          removeAuthItem('accessToken');
          removeAuthItem('refreshToken');
        }
      }
    } catch (error) {
      removeAuthItem('user');
      removeAuthItem('accessToken');
      removeAuthItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, remember: boolean = false) => {
    try {
      const response = await apiClient.login(username, password);

      const { accessToken, refreshToken, user: userData } = response;

      // Clear any tokens from both storages first
      removeAuthItem('accessToken');
      removeAuthItem('refreshToken');
      removeAuthItem('user');

      // Save tokens and user data to the correct storage
      setAuthItem('accessToken', accessToken, remember);
      setAuthItem('refreshToken', refreshToken, remember);
      setAuthItem('user', JSON.stringify(userData), remember);

      // Save the remember preference so the API interceptor knows where to save refreshed tokens
      if (remember) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        sessionStorage.setItem('rememberMe', 'true');
      }

      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error);

      // Extract error message
      const errorMessage = error.response?.data?.message || 'بيانات تسجيل الدخول غير صحيحة';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    removeAuthItem('user');
    removeAuthItem('accessToken');
    removeAuthItem('refreshToken');
    removeAuthItem('rememberMe');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      canAccessScreen: () => false,
      hasAnyInvoicePermission: () => false,
      hasAnySettingsPermission: () => false,
      hasAnyAccountsPermission: () => false,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  const permission = usePermission();

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Screen ID to permission mapping
  const screenPermissionMap: Record<string, string> = {
    'customers': 'customers.view',
    'invoices_export': 'invoices.type1.view',
    'invoices_import': 'invoices.type2.view',
    'invoices_transit': 'invoices.type3.view',
    'invoices_free': 'invoices.type4.view',
    'agents': 'shipping_agents.agents.view',
    'trips': 'shipping_agents.trips.view',
    'fees': 'shipping_agents.fees.view',
    'treasury': 'accounts.treasury.view',
    'employees': 'employees.view',
    // Report categories
    'reports_customers': 'reports.customers.access',
    'reports_customs': 'reports.customs.access',
    'reports_agents': 'reports.shipping_agents.access',
    // Individual financial reports
    'reports_treasury_cash': 'reports.financial.treasury_cash',
    'reports_bank_accounts': 'reports.financial.bank_accounts',
    'reports_income_expenses': 'reports.financial.income_expenses',
    'reports_income_statement': 'reports.financial.income_statement',
    'reports_general_journal': 'reports.financial.general_journal',
    'reports_trial_balance': 'reports.financial.trial_balance',
    // Settings sections
    'settings_expense_categories': 'settings.expense_categories.view',
    'settings_invoice_templates': 'settings.invoice_templates.view',
    'settings_income_statement': 'settings.income_statement.config',
    'settings_company': 'settings.company.view',
    'settings_backup': 'settings.backup.view',
    'settings_print': 'settings.print.view',
    'settings_treasury': 'settings.treasury_settings.view',
    'settings_carry_forward': 'settings.carry_forward.view',
    'settings_agents': 'settings.agent_settings.view',
    'settings_users': 'users.view',
  };

  // Screen IDs that require ANY of multiple permissions
  const screenAnyPermissionMap: Record<string, string[]> = {
    'reports_financial': [
      'reports.financial.treasury_cash',
      'reports.financial.bank_accounts',
      'reports.financial.income_expenses',
      'reports.financial.income_statement',
      'reports.financial.general_journal',
      'reports.financial.trial_balance',
    ],
  };

  // Check if user can access a specific screen
  const canAccessScreen = (screenId: string): boolean => {
    // Super admin or regular admin can access everything
    if (context.user?.isAdmin || permission.isSuperAdmin) {
      return true;
    }

    // Check if this screen requires ANY of multiple permissions
    const anyPerms = screenAnyPermissionMap[screenId];
    if (anyPerms) {
      return permission.hasAnyPermission(anyPerms);
    }

    // Get the single permission code for this screen
    const permissionCode = screenPermissionMap[screenId];
    if (!permissionCode) {
      console.warn(`[useAuth] No permission mapping for screen: ${screenId}`);
      return false;
    }

    // Check if user has the permission
    return permission.hasPermission(permissionCode);
  };

  // Check if user has any invoice permission
  const hasAnyInvoicePermission = (): boolean => {
    // Super admin or regular admin can access everything
    if (context.user?.isAdmin || permission.isSuperAdmin) {
      return true;
    }

    // Check if user has any invoice view permission
    const invoicePermissions = [
      'invoices.type1.view',
      'invoices.type2.view',
      'invoices.type3.view',
      'invoices.type4.view',
    ];

    return permission.hasAnyPermission(invoicePermissions);
  };

  // Check if user has any settings permission
  const hasAnySettingsPermission = (): boolean => {
    // Super admin or regular admin can access everything
    if (context.user?.isAdmin || permission.isSuperAdmin) {
      return true;
    }

    // Check if user has ANY of the settings permissions
    const settingsPermissions = [
      'settings.expense_categories.view',
      'settings.invoice_templates.view',
      'settings.income_statement.config',
      'settings.company.view',
      'settings.backup.view',
      'settings.print.view',
      'settings.treasury_settings.view',
      'settings.carry_forward.view',
      'settings.agent_settings.view',
      'users.view', // Users management is part of settings
    ];

    return permission.hasAnyPermission(settingsPermissions);
  };

  // Check if user has any accounts permission
  const hasAnyAccountsPermission = (): boolean => {
    // Super admin or regular admin can access everything
    if (context.user?.isAdmin || permission.isSuperAdmin) {
      return true;
    }

    // Check if user has ANY of the accounts permissions
    const accountsPermissions = [
      'accounts.treasury.view',
      'accounts.bank_accounts.view',
      'accounts.vouchers_receipt.view',
      'accounts.vouchers_payment.view',
      'accounts.customs_fees.view',
      'accounts.internal_transfers.view',
      'accounts.voucher_search.access',
      'accounts.payroll.view',
    ];

    return permission.hasAnyPermission(accountsPermissions);
  };

  return {
    ...context,
    canAccessScreen,
    hasAnyInvoicePermission,
    hasAnySettingsPermission,
    hasAnyAccountsPermission,
  };
}
