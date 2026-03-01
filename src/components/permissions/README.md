# Permission Components

This directory contains React components for implementing permission-based access control in the frontend.

## Components

### Protected

A component that conditionally renders its children based on user permissions. Useful for hiding/showing UI elements like buttons, forms, or sections.

**Props:**
- `permission` (string | string[]): Required permission(s) to render children
- `fallback` (ReactNode, optional): Element to render when user lacks permission (default: null)
- `children` (ReactNode): Content to render when user has permission
- `requireAll` (boolean, optional): When permission is an array, require all (true) or any (false) permissions (default: false)

**Examples:**

```tsx
// Hide button if user doesn't have create permission
<Protected permission="customers.create">
  <button onClick={handleAddCustomer}>إضافة عميل</button>
</Protected>

// Show fallback message
<Protected 
  permission="customers.edit" 
  fallback={<p>ليس لديك صلاحية التعديل</p>}
>
  <EditCustomerForm />
</Protected>

// Require any of multiple permissions
<Protected permission={["customers.create", "customers.edit"]}>
  <CustomerActions />
</Protected>

// Require all permissions
<Protected 
  permission={["customers.view", "customers.edit"]} 
  requireAll
>
  <EditCustomerButton />
</Protected>
```

### ProtectedRoute

A route wrapper component that redirects users to an unauthorized page if they lack the required permission. Used in React Router route definitions.

**Props:**
- `permission` (string): Required permission to access the route
- `element` (ReactElement): The component to render if user has permission
- `redirectTo` (string, optional): Path to redirect to if user lacks permission (default: '/unauthorized')

**Examples:**

```tsx
// In route configuration
<Route
  path="/customers"
  element={<ProtectedRoute permission="customers.view" element={<CustomersScreen />} />}
/>

// With custom redirect
<Route
  path="/admin"
  element={
    <ProtectedRoute 
      permission="users.view" 
      element={<AdminPanel />}
      redirectTo="/dashboard"
    />
  }
/>
```

## Usage Guidelines

### When to use Protected vs ProtectedRoute

- **Use `Protected`** for:
  - Hiding/showing buttons, forms, or UI sections
  - Conditional rendering within a page
  - Fine-grained control over UI elements
  - Showing fallback content

- **Use `ProtectedRoute`** for:
  - Protecting entire pages/routes
  - Preventing unauthorized access to screens
  - Redirecting users who lack permissions

### Super Admin Bypass

Both components automatically grant access to Super Admin users. Super Admins have all permissions and will always see protected content.

### Loading State

`ProtectedRoute` shows a loading spinner while permissions are being loaded. `Protected` component relies on the parent to handle loading states if needed.

## Integration with PermissionContext

Both components use the `usePermission` hook from `PermissionContext` to check permissions. Make sure your app is wrapped with `PermissionProvider`:

```tsx
<PermissionProvider>
  <App />
</PermissionProvider>
```

## Requirements Validation

These components satisfy the following requirements:

- **Protected Component:**
  - Requirements 2.1, 2.4, 3.2, 3.4: Hides UI elements when user lacks permission
  - Supports fallback rendering for better UX

- **ProtectedRoute Component:**
  - Requirement 9.5: Redirects to unauthorized page when user lacks permission
  - Shows loading state during permission checks
  - Prevents direct URL access to unauthorized screens
