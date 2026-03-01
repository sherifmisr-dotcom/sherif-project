import { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  permission?: string;
  anyOf?: string[];
  element: ReactElement;
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Protects routes by checking user permissions. Redirects to unauthorized page
 * if user lacks the required permission.
 * 
 * @param permission - Required permission to access the route (single permission)
 * @param anyOf - Array of permissions, access granted if user has ANY of them
 * @param element - The component to render if user has permission
 * @param redirectTo - Path to redirect to if user lacks permission (default: /unauthorized)
 */
export function ProtectedRoute({
  permission,
  anyOf,
  element,
  redirectTo = '/unauthorized',
}: ProtectedRouteProps) {
  const { hasPermission, hasAnyPermission, isSuperAdmin, loading } = usePermission();
  const { user } = useAuth();

  // Show loading spinner while permissions are being loaded
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // Admin and Super Admin bypass all permission checks
  if (isSuperAdmin || user?.isAdmin) {
    return element;
  }

  // Check permissions: anyOf takes priority, then single permission
  let hasAccess = false;
  if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyPermission(anyOf);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  // User has permission, render the element
  return element;
}
