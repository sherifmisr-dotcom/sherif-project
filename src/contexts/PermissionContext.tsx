import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface PermissionContextValue {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPermissions();
  }, [userId]);

  const loadUserPermissions = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');

      if (!token) {
        // No token, user not authenticated
        setPermissions([]);
        setIsSuperAdmin(false);
        return;
      }

      const response = await apiClient.getMyPermissions();

      const perms = response?.permissions || [];

      // Extract permission codes from the response
      // The response might have nested permission objects
      const permissionCodes = perms.map((p: any) => {
        // If p is already a string, use it directly
        if (typeof p === 'string') return p;
        // If p has a code property, use that
        if (p && p.code) return p.code;
        // If p has a permission property with code, use that
        if (p && p.permission && p.permission.code) return p.permission.code;

        return null;
      }).filter(Boolean); // Remove null values



      setPermissions(permissionCodes);
      setIsSuperAdmin(response.isSuperAdmin || false);
    } catch (error) {
      console.error('[PermissionContext] Error loading user permissions:', error);
      setPermissions([]);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Super admin has all permissions
    if (isSuperAdmin) {
      return true;
    }

    const has = permissions.includes(permission);
    return has;
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    // Super admin has all permissions
    if (isSuperAdmin) return true;

    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    // Super admin has all permissions
    if (isSuperAdmin) return true;

    return perms.every(p => permissions.includes(p));
  };

  const refreshPermissions = async () => {
    await loadUserPermissions();
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isSuperAdmin,
        loading,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  return context;
}
