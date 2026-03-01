// @ts-nocheck
/**
 * INTEGRATION EXAMPLE
 * 
 * This file shows how to integrate the PermissionProvider into your App.tsx
 * DO NOT import this file - it's just an example!
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PermissionProvider } from '@/contexts/PermissionContext'; // ADD THIS
import { Toaster } from '@/lib/toast';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            {/* ADD PermissionProvider here, after AuthProvider */}
            <PermissionProvider>
              <AppRoutes />
              <Toaster
                position="top-center"
                containerStyle={{
                  top: 80,
                }}
                toastOptions={{
                  style: {
                    zIndex: 9999,
                  },
                }}
                gutter={12}
                reverseOrder={false}
              />
            </PermissionProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * USAGE EXAMPLE IN COMPONENTS
 */

import { usePermission } from '@/contexts/PermissionContext';

function CustomerListExample() {
  const { hasPermission, isSuperAdmin, loading } = usePermission();

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div>
      <h1>Customers</h1>

      {/* Show create button only if user has permission */}
      {hasPermission('customers.create') && (
        <button>Create Customer</button>
      )}

      {/* Show admin badge for super admins */}
      {isSuperAdmin && (
        <span className="badge">Super Admin</span>
      )}

      {/* Customer list */}
      <div>...</div>
    </div>
  );
}

/**
 * USAGE WITH MULTIPLE PERMISSIONS
 */

function InvoiceActionsExample() {
  const { hasAnyPermission, hasAllPermissions } = usePermission();

  // Show actions menu if user has ANY of these permissions
  const canShowActions = hasAnyPermission([
    'invoices.type1.edit',
    'invoices.type1.delete',
    'invoices.type1.print'
  ]);

  // Show edit form only if user has ALL required permissions
  const canEditInvoice = hasAllPermissions([
    'invoices.type1.view',
    'invoices.type1.edit'
  ]);

  return (
    <div>
      {canShowActions && (
        <div className="actions-menu">
          {/* Actions */}
        </div>
      )}

      {canEditInvoice && (
        <form>
          {/* Edit form */}
        </form>
      )}
    </div>
  );
}

/**
 * REFRESH PERMISSIONS EXAMPLE
 */

function PermissionManagementExample() {
  const { refreshPermissions } = usePermission();

  const handlePermissionsUpdated = async () => {
    // After granting/revoking permissions via API
    await refreshPermissions();
    toast.success('Permissions updated successfully');
  };

  return (
    <div>
      <button onClick={handlePermissionsUpdated}>
        Refresh Permissions
      </button>
    </div>
  );
}
