import { useContext, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth, AuthContext } from '@/contexts/AuthContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/lib/toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import Customers from '@/pages/Customers';
import Invoices from '@/pages/Invoices';
import ExportInvoice from '@/pages/invoices/ExportInvoice';
import ImportInvoice from '@/pages/invoices/ImportInvoice';
import TransitInvoice from '@/pages/invoices/TransitInvoice';
import FreeInvoice from '@/pages/invoices/FreeInvoice';
import Agents from '@/pages/Agents';
import AddAgent from '@/pages/agents/AddAgent';
import NewTrip from '@/pages/agents/NewTrip';
import AdditionalFees from '@/pages/agents/AdditionalFees';
import Accounts from '@/pages/Accounts';
import InternalTransfers from '@/pages/accounts/InternalTransfers';
import Employees from '@/pages/Employees';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Unauthorized from '@/components/Unauthorized';
import Unauthenticated from '@/pages/Unauthenticated';
import { ProtectedRoute } from '@/components/permissions/ProtectedRoute';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleTimeoutModal } from '@/components/idleTimeout/IdleTimeoutModal';


function ConnectedPermissionProvider({ children }: { children: React.ReactNode }) {
  const authContext = useContext(AuthContext);
  return <PermissionProvider userId={authContext?.user?.id}>{children}</PermissionProvider>;
}

function BasicProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Idle session timeout wrapper - auto-logout after 20 min of inactivity
function IdleTimeoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleIdleLogout = useCallback(async () => {
    await logout();
    localStorage.setItem('sessionExpired', 'true');
    navigate('/login', { replace: true, state: { sessionExpired: true } });
  }, [logout, navigate]);

  const { showModal, remainingSeconds, expired, handleContinue, handleLogout } = useIdleTimeout({
    idleMs: 20 * 60 * 1000,    // 20 minutes idle timeout
    warnMs: 60 * 1000,          // 60 seconds warning before logout
    throttleMs: 1000,            // throttle activity detection to 1 second
    isAuthenticated: !!user,
    onLogout: handleIdleLogout,
  });

  // Auto-logout immediately when countdown expires
  useEffect(() => {
    if (expired && showModal) {
      handleLogout();
    }
  }, [expired, showModal, handleLogout]);

  // Don't render modal if user is not authenticated (prevents flash on login page)
  if (!user) return null;

  return (
    <IdleTimeoutModal
      isOpen={showModal}
      remainingSeconds={remainingSeconds}
      onContinue={handleContinue}
      onLogout={handleLogout}
    />
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/unauthenticated" element={<Unauthenticated />} />
      <Route
        path="/"
        element={
          <BasicProtectedRoute>
            <MainLayout />
          </BasicProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Customers Screen - Requirement 2.1 */}
        <Route
          path="customers"
          element={<ProtectedRoute permission="customers.view" element={<Customers />} />}
        />

        {/* Invoices Hub - Shows tabs for invoice types user has access to */}
        <Route path="invoices" element={<Invoices />} />

        {/* Invoice Type 1 (Export) - Requirement 3.2 */}
        <Route
          path="invoices/export"
          element={<ProtectedRoute permission="invoices.type1.view" element={<ExportInvoice />} />}
        />

        {/* Invoice Type 2 (Import) - Requirement 3.2 */}
        <Route
          path="invoices/import"
          element={<ProtectedRoute permission="invoices.type2.view" element={<ImportInvoice />} />}
        />

        {/* Invoice Type 3 (Transit) - Requirement 3.2 */}
        <Route
          path="invoices/transit"
          element={<ProtectedRoute permission="invoices.type3.view" element={<TransitInvoice />} />}
        />

        {/* Invoice Type 4 (Free) - Requirement 3.2 */}
        <Route
          path="invoices/free"
          element={<ProtectedRoute permission="invoices.type4.view" element={<FreeInvoice />} />}
        />

        {/* Shipping Agents - Main screen - Requirement 4.2 */}
        <Route
          path="agents"
          element={<ProtectedRoute permission="shipping_agents.agents.view" element={<Agents />} />}
        />
        <Route
          path="agents/add"
          element={<ProtectedRoute permission="shipping_agents.agents.view" element={<AddAgent />} />}
        />

        {/* Shipping Agents - Trips - Requirement 4.2 */}
        <Route
          path="agents/trips"
          element={<ProtectedRoute permission="shipping_agents.trips.view" element={<NewTrip />} />}
        />

        {/* Shipping Agents - Additional Fees - Requirement 4.2 */}
        <Route
          path="agents/fees"
          element={<ProtectedRoute permission="shipping_agents.fees.view" element={<AdditionalFees />} />}
        />

        {/* Accounts Management - Requirement 5.2 */}
        <Route
          path="accounts"
          element={<ProtectedRoute anyOf={[
            'accounts.treasury.view',
            'accounts.bank_accounts.view',
            'accounts.vouchers_receipt.view',
            'accounts.vouchers_payment.view',
            'accounts.customs_fees.view',
            'accounts.internal_transfers.view',
            'accounts.voucher_search.access',
            'accounts.payroll.view',
          ]} element={<Accounts />} />}
        />
        <Route
          path="accounts/internal-transfers"
          element={<ProtectedRoute permission="accounts.internal_transfers.view" element={<InternalTransfers />} />}
        />

        {/* Employees - Requirement 6.1 */}
        <Route
          path="employees"
          element={<ProtectedRoute permission="employees.view" element={<Employees />} />}
        />

        {/* Reports - Requirement 7.2 */}
        <Route
          path="reports"
          element={<ProtectedRoute anyOf={[
            'reports.financial.treasury_cash',
            'reports.financial.bank_accounts',
            'reports.financial.income_expenses',
            'reports.financial.income_statement',
            'reports.financial.general_journal',
            'reports.financial.trial_balance',
            'reports.customers.access',
            'reports.customs.access',
            'reports.shipping_agents.access',
          ]} element={<Reports />} />}
        />

        {/* Settings/Users Management - Requirement 8.1 */}
        <Route
          path="settings"
          element={<ProtectedRoute anyOf={[
            'settings.expense_categories.view',
            'settings.invoice_templates.view',
            'settings.income_statement.config',
            'settings.company.view',
            'settings.backup.view',
            'settings.print.view',
            'settings.treasury_settings.view',
            'settings.carry_forward.view',
            'settings.agent_settings.view',
            'users.view',
          ]} element={<Settings />} />}
        />
      </Route>
    </Routes>
  );
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <ConnectedPermissionProvider>
                <AppRoutes />
                <IdleTimeoutWrapper />
                <Toaster
                  position="top-center"
                  containerStyle={{
                    top: 16,
                    zIndex: 99999,
                  }}
                  toastOptions={{
                    style: {
                      zIndex: 99999,
                    },
                    duration: 4000,
                  }}
                  gutter={8}
                  reverseOrder={false}
                />
              </ConnectedPermissionProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
