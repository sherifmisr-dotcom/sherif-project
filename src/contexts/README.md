# Permission Context

## Overview

The Permission Context provides a centralized way to manage and check user permissions throughout the application. It integrates with the backend permissions system and provides React hooks for easy access to permission data.

## Features

- Load user permissions on mount
- Check single permission: `hasPermission(permission)`
- Check any of multiple permissions: `hasAnyPermission(permissions)`
- Check all of multiple permissions: `hasAllPermissions(permissions)`
- Super Admin bypass (Super Admins have all permissions)
- Loading state management
- Manual permission refresh

## Usage

### 1. Wrap your app with PermissionProvider

Add the `PermissionProvider` to your app's provider hierarchy, typically after `AuthProvider`:

```tsx
import { PermissionProvider } from '@/contexts/PermissionContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <PermissionProvider>
              <AppRoutes />
            </PermissionProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

### 2. Use the usePermission hook

```tsx
import { usePermission } from '@/contexts/PermissionContext';

function MyComponent() {
  const { hasPermission, isSuperAdmin, loading } = usePermission();

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  if (!hasPermission('customers.view')) {
    return <div>You don't have permission to view customers</div>;
  }

  return <div>Customer list...</div>;
}
```

### 3. Check permissions

#### Single Permission

```tsx
const { hasPermission } = usePermission();

if (hasPermission('customers.create')) {
  // Show create button
}
```

#### Any Permission (OR logic)

```tsx
const { hasAnyPermission } = usePermission();

if (hasAnyPermission(['customers.edit', 'customers.delete'])) {
  // Show actions menu
}
```

#### All Permissions (AND logic)

```tsx
const { hasAllPermissions } = usePermission();

if (hasAllPermissions(['customers.view', 'customers.edit'])) {
  // Show edit form
}
```

### 4. Super Admin Check

```tsx
const { isSuperAdmin } = usePermission();

if (isSuperAdmin) {
  // Show admin-only features
}
```

### 5. Refresh Permissions

If permissions are updated (e.g., after an admin grants new permissions), you can manually refresh:

```tsx
const { refreshPermissions } = usePermission();

const handlePermissionsUpdated = async () => {
  await refreshPermissions();
  toast.success('Permissions updated');
};
```

## API Reference

### PermissionContextValue

```typescript
interface PermissionContextValue {
  permissions: string[];              // Array of permission codes
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isSuperAdmin: boolean;              // True if user is Super Admin
  loading: boolean;                   // True while loading permissions
  refreshPermissions: () => Promise<void>;
}
```

### Permission Codes Format

Permission codes follow the pattern: `{screen}.{subScreen?}.{action}`

Examples:
- `customers.view`
- `customers.create`
- `invoices.type1.view`
- `invoices.type1.create`
- `accounts.treasury.view`
- `reports.financial.treasury_cash`

## Integration with Backend

The Permission Context automatically:
1. Loads permissions from `/permissions/me/permissions` endpoint on mount
2. Extracts permission codes from the response
3. Caches permissions in state
4. Handles authentication errors gracefully

## Notes

- Super Admins bypass all permission checks (always return `true`)
- Permissions are loaded once on mount and cached
- Use `refreshPermissions()` to reload after permission changes
- The context requires a valid authentication token in localStorage
- If no token is found, permissions default to empty array
