# Idle Session Timeout - Integration Examples

This directory contains example code demonstrating how to integrate the Idle Session Timeout feature into your application.

## Files

### 1. AppIntegrationExample.tsx

Shows how to integrate the `useIdleTimeout` hook into your main App component or AuthProvider.

**Key Features:**
- Wraps authenticated routes with idle timeout logic
- Connects to authentication context
- Renders the IdleTimeoutModal
- Configurable timeout settings
- Automatic start/stop based on authentication state

**Requirements Covered:** 7.3, 7.4, 13.1, 13.2, 13.4

### 2. ApiInterceptorExample.ts

Demonstrates how to handle server-side session expiration by intercepting API responses.

**Key Features:**
- Intercepts 401 Unauthorized responses
- Intercepts 419 Authentication Timeout responses
- Displays "انتهت الجلسة" (Session Expired) message
- Triggers logout and redirect to login
- Token refresh strategy

**Requirements Covered:** 12.1, 12.2, 12.3

## Quick Start

### Basic Integration

1. **Add the hook to your App component:**

```tsx
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleTimeoutModal } from '@/components/idleTimeout/IdleTimeoutModal';
import { useAuth } from '@/contexts/AuthContext';

function App() {
  const { user, logout } = useAuth();
  
  const { showModal, remainingSeconds, handleContinue, handleLogout } = useIdleTimeout({
    idleMs: 60 * 60 * 1000,      // 60 minutes
    warnMs: 60 * 1000,            // 60 seconds
    throttleMs: 3000,             // 3 seconds
    isAuthenticated: !!user,
    onLogout: logout,
  });

  return (
    <>
      {/* Your app content */}
      <IdleTimeoutModal
        isOpen={showModal}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </>
  );
}
```

2. **Add API interceptor for server session timeout:**

```ts
import { setupSessionTimeoutInterceptor } from '@/examples/idleTimeout/ApiInterceptorExample';

// In your API client setup
setupSessionTimeoutInterceptor(axiosInstance);
```

## Configuration Options

### useIdleTimeout Hook

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `idleMs` | number | 3600000 | Total idle time in milliseconds (60 minutes) |
| `warnMs` | number | 60000 | Warning duration in milliseconds (60 seconds) |
| `throttleMs` | number | 3000 | Throttle interval for activity updates (3 seconds) |
| `isAuthenticated` | boolean | - | Whether the user is currently authenticated |
| `onLogout` | function | - | Callback function to perform logout |

### Customization Examples

**Short timeout for testing:**
```tsx
useIdleTimeout({
  idleMs: 30 * 1000,      // 30 seconds
  warnMs: 10 * 1000,      // 10 seconds
  throttleMs: 1000,       // 1 second
  isAuthenticated: !!user,
  onLogout: logout,
});
```

**Long timeout for production:**
```tsx
useIdleTimeout({
  idleMs: 120 * 60 * 1000,  // 120 minutes (2 hours)
  warnMs: 120 * 1000,        // 120 seconds (2 minutes)
  throttleMs: 5000,          // 5 seconds
  isAuthenticated: !!user,
  onLogout: logout,
});
```

## Integration Patterns

### Pattern 1: Wrapper Component (Recommended)

Create a wrapper component that handles idle timeout for all authenticated routes:

```tsx
function IdleTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { showModal, remainingSeconds, handleContinue, handleLogout } = useIdleTimeout({
    idleMs: 60 * 60 * 1000,
    warnMs: 60 * 1000,
    throttleMs: 3000,
    isAuthenticated: !!user,
    onLogout: logout,
  });

  return (
    <>
      {children}
      <IdleTimeoutModal
        isOpen={showModal}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </>
  );
}

// Usage in routes
<Route path="/*" element={
  <IdleTimeoutWrapper>
    <ProtectedRoutes />
  </IdleTimeoutWrapper>
} />
```

### Pattern 2: Inside AuthProvider

Integrate directly into your AuthProvider for centralized management:

```tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const { showModal, remainingSeconds, handleContinue, handleLogout } = useIdleTimeout({
    idleMs: 60 * 60 * 1000,
    warnMs: 60 * 1000,
    throttleMs: 3000,
    isAuthenticated: !!user,
    onLogout: async () => {
      await logout();
    },
  });

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
      <IdleTimeoutModal
        isOpen={showModal}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </AuthContext.Provider>
  );
}
```

## Testing

### Manual Testing

1. **Test idle detection:**
   - Set `idleMs` to 30 seconds and `warnMs` to 10 seconds
   - Stop interacting with the page
   - After 20 seconds, the modal should appear
   - After 30 seconds total, auto-logout should occur

2. **Test continue button:**
   - Wait for modal to appear
   - Click "استمرار" (Continue)
   - Modal should close and timer should reset
   - Continue using the app normally

3. **Test logout button:**
   - Wait for modal to appear
   - Click "إنهاء الجلسة" (Logout)
   - Should logout and redirect to login page

4. **Test page reload:**
   - Wait for modal to appear
   - Reload the page
   - Modal should reappear immediately (state persisted)

5. **Test visibility change:**
   - Switch to another tab for longer than idle time
   - Switch back to the app tab
   - Should logout immediately or show modal

6. **Test server session timeout:**
   - Wait for server session to expire (or manually invalidate token)
   - Make an API request
   - Should show "انتهت الجلسة" message and logout

### Automated Testing

See the test files in `src/__tests__/idleTimeout/` for comprehensive test coverage.

## Troubleshooting

### Modal doesn't appear

- Check that `isAuthenticated` is `true`
- Verify `idleMs` and `warnMs` values are correct
- Check browser console for errors
- Ensure event listeners are attached (check DevTools)

### Timer resets unexpectedly

- Check if `throttleMs` is too low (causing excessive updates)
- Verify activity events are being throttled correctly
- Check for conflicting event listeners

### Logout doesn't work

- Verify `onLogout` callback is provided and working
- Check that auth state is being cleared
- Ensure redirect logic is correct
- Check browser console for errors

### State not persisting across reloads

- Verify localStorage is available (not in private browsing)
- Check that `lastActivityAt` is being written to localStorage
- Ensure localStorage quota is not exceeded

## Best Practices

1. **Configuration:**
   - Use environment variables for timeout values
   - Different timeouts for dev/staging/production
   - Consider user roles (longer timeout for admins)

2. **User Experience:**
   - Provide clear warning messages in Arabic
   - Give users enough time to respond (60 seconds minimum)
   - Auto-focus the Continue button for accessibility

3. **Security:**
   - Coordinate client and server timeouts
   - Clear all sensitive data on logout
   - Use HTTPS in production

4. **Performance:**
   - Use appropriate throttle values (3-5 seconds)
   - Avoid excessive localStorage writes
   - Clean up event listeners properly

5. **Testing:**
   - Test with different timeout values
   - Test all user flows (continue, logout, auto-logout)
   - Test edge cases (page reload, visibility change)

## Additional Resources

- [Design Document](../../.kiro/specs/idle-session-timeout/design.md)
- [Requirements Document](../../.kiro/specs/idle-session-timeout/requirements.md)
- [Implementation Tasks](../../.kiro/specs/idle-session-timeout/tasks.md)
- [Hook Implementation](../../hooks/useIdleTimeout.ts)
- [Modal Component](../../components/idleTimeout/IdleTimeoutModal.tsx)

## Support

For questions or issues, please refer to the design document or create an issue in the project repository.
