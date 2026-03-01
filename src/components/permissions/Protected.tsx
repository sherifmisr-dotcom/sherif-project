import { ReactNode, useContext } from 'react';
import { usePermission } from '@/contexts/PermissionContext';
import { AuthContext } from '@/contexts/AuthContext';

interface ProtectedProps {
  permission: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
  requireAll?: boolean; // If true, requires all permissions; if false, requires any
}

/**
 * Protected Component
 * 
 * Conditionally renders children based on user permissions.
 * Admin and Super Admin users bypass all permission checks.
 * 
 * @param permission - Single permission string or array of permissions
 * @param fallback - Optional element to render when user lacks permission (default: null)
 * @param children - Content to render when user has permission
 * @param requireAll - When permission is an array, require all (true) or any (false) permissions
 */
export function Protected({
  permission,
  fallback = null,
  children,
  requireAll = false,
}: ProtectedProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermission();
  const authContext = useContext(AuthContext);

  // Admin and Super Admin bypass all permission checks
  if (isSuperAdmin || authContext?.user?.isAdmin) {
    return <>{children}</>;
  }

  // Determine if user is authorized
  const isAuthorized = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  // If not authorized, render fallback (or null)
  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  // If authorized, render children
  return <>{children}</>;
}
