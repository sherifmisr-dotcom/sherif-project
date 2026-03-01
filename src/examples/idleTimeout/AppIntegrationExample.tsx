/**
 * Example: App Integration with Idle Session Timeout
 * 
 * This file demonstrates how to integrate the useIdleTimeout hook
 * into your application's main App component or AuthProvider.
 * 
 * Requirements: 7.3, 7.4, 13.1, 13.2, 13.4
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/lib/toast';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleTimeoutModal } from '@/components/idleTimeout/IdleTimeoutModal';

// Import your pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
// ... other imports

/**
 * IdleTimeoutWrapper Component
 * 
 * This component wraps your authenticated routes and manages the idle timeout.
 * It connects the useIdleTimeout hook to your authentication context.
 * 
 * Requirements:
 * - 7.3: Start tracking when user becomes authenticated
 * - 7.4: Stop tracking and cleanup when user logs out
 * - 13.1: Accept idleMs as configurable parameter
 * - 13.2: Accept warnMs as configurable parameter
 * - 13.4: Accept throttleMs as configurable parameter
 */
function IdleTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  // Configure idle timeout settings
  // Requirement 13.1: idleMs is configurable (default: 60 minutes)
  // Requirement 13.2: warnMs is configurable (default: 60 seconds)
  // Requirement 13.4: throttleMs is configurable (default: 3 seconds)
  const {
    showModal,
    remainingSeconds,
    handleContinue,
    handleLogout,
  } = useIdleTimeout({
    idleMs: 60 * 60 * 1000,      // 60 minutes total idle time
    warnMs: 60 * 1000,            // 60 seconds warning before logout
    throttleMs: 3000,             // 3 seconds throttle for activity updates
    isAuthenticated: !!user,      // Requirement 7.3, 7.4: Track based on auth state
    onLogout: async () => {
      // Requirement 7.4: Trigger logout when idle timeout expires
      console.log('[App] Idle timeout triggered, logging out user');
      await logout();
      // Redirect is handled by AuthContext/routing
    },
  });

  return (
    <>
      {children}
      
      {/* Render the idle timeout modal */}
      <IdleTimeoutModal
        isOpen={showModal}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </>
  );
}

/**
 * Example App Component with Idle Timeout Integration
 * 
 * This shows the complete integration pattern:
 * 1. Wrap your app with AuthProvider
 * 2. Wrap authenticated routes with IdleTimeoutWrapper
 * 3. The hook automatically starts/stops based on authentication state
 */
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          user ? (
            // Wrap authenticated routes with IdleTimeoutWrapper
            <IdleTimeoutWrapper>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Add your other protected routes here */}
              </Routes>
            </IdleTimeoutWrapper>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function AppWithIdleTimeout() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
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
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Alternative Integration Pattern: Inside AuthProvider
 * 
 * If you prefer to integrate the idle timeout directly into your AuthProvider,
 * you can modify your AuthContext.tsx like this:
 */

/*
// In AuthContext.tsx

import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleTimeoutModal } from '@/components/idleTimeout/IdleTimeoutModal';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ... existing auth logic ...

  // Add idle timeout integration
  const {
    showModal,
    remainingSeconds,
    handleContinue,
    handleLogout,
  } = useIdleTimeout({
    idleMs: 60 * 60 * 1000,      // 60 minutes
    warnMs: 60 * 1000,            // 60 seconds
    throttleMs: 3000,             // 3 seconds
    isAuthenticated: !!user,
    onLogout: async () => {
      await logout();
    },
  });

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, ... }}>
      {children}
      
      {// Render modal at provider level //}
      <IdleTimeoutModal
        isOpen={showModal}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </AuthContext.Provider>
  );
}
*/

/**
 * Usage Notes:
 * 
 * 1. Configuration:
 *    - Adjust idleMs, warnMs, and throttleMs based on your requirements
 *    - Default values: 60 min idle, 60 sec warning, 3 sec throttle
 * 
 * 2. Authentication Integration:
 *    - The hook automatically starts when isAuthenticated becomes true
 *    - The hook automatically stops and cleans up when isAuthenticated becomes false
 *    - No manual initialization or cleanup needed
 * 
 * 3. Logout Callback:
 *    - The onLogout callback should clear auth state and tokens
 *    - Redirect to login page is typically handled by your routing logic
 *    - The hook will clear localStorage (lastActivityAt) automatically
 * 
 * 4. Modal Rendering:
 *    - The modal can be rendered anywhere in your component tree
 *    - It's controlled by the showModal state from the hook
 *    - Only one modal will be shown at a time (guaranteed by hook logic)
 * 
 * 5. Testing:
 *    - To test the feature, reduce idleMs to a smaller value (e.g., 30 seconds)
 *    - The modal should appear after (idleMs - warnMs) of inactivity
 *    - Auto-logout should occur after full idleMs period
 */
