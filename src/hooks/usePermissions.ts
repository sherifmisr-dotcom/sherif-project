import { usePermission } from '@/contexts/PermissionContext';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * Permissions hook that bridges to the PermissionContext.
 * Checks granular permissions from the backend.
 * Super admins and admins automatically get all permissions.
 */
export function usePermissions() {
    const { hasPermission, hasAnyPermission, isSuperAdmin } = usePermission();
    const authContext = useContext(AuthContext);

    // Admin users (isAdmin from login response) get full access immediately
    // This avoids the race condition where PermissionContext hasn't loaded yet
    const isAdmin = authContext?.user?.isAdmin || isSuperAdmin;

    return {
        canView: (screen?: string) => {
            if (isAdmin) return true;
            if (!screen) return true;
            return hasPermission(`${screen}.view`);
        },
        canCreate: (screen?: string) => {
            if (isAdmin) return true;
            if (!screen) return true;
            return hasPermission(`${screen}.create`);
        },
        canEdit: (screen?: string) => {
            if (isAdmin) return true;
            if (!screen) return true;
            return hasPermission(`${screen}.edit`);
        },
        canDelete: (screen?: string) => {
            if (isAdmin) return true;
            if (!screen) return true;
            return hasPermission(`${screen}.delete`);
        },
        canPrint: (screen?: string) => {
            if (isAdmin) return true;
            if (!screen) return true;
            return hasPermission(`${screen}.print`);
        },
        requirePermission: (permission?: string) => {
            if (isAdmin) return true;
            if (!permission) return true;
            return hasPermission(permission);
        },
        isAdmin,
        isSuperAdmin,
        hasAnyPermission,
        hasPermission,
    };
}
