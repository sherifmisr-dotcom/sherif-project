/**
 * Example: API Interceptor for Server Session Timeout
 * 
 * This file demonstrates how to handle server-side session expiration
 * by intercepting 401/419 responses and displaying appropriate messages.
 * 
 * Requirements: 12.1, 12.2, 12.3
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

/**
 * Enhanced API Client with Session Timeout Handling
 * 
 * This example shows how to integrate server session timeout detection
 * with the client-side idle timeout feature.
 * 
 * Requirements:
 * - 12.1: Handle 401 Unauthorized responses
 * - 12.2: Handle 419 Authentication Timeout responses
 * - 12.3: Display "انتهت الجلسة" message and trigger logout
 */
class ApiClientWithSessionTimeout {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add auth token
        this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor to handle session timeout
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

                // Requirement 12.1: Handle 401 Unauthorized
                // Requirement 12.2: Handle 419 Authentication Timeout
                if (
                    error.response?.status === 401 || 
                    error.response?.status === 419
                ) {
                    // Check if this is a refresh token request (avoid infinite loop)
                    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');
                    
                    if (!isRefreshRequest && !originalRequest._retry) {
                        originalRequest._retry = true;

                        try {
                            // Try to refresh the token first
                            const refreshToken = localStorage.getItem('refreshToken');
                            if (refreshToken) {
                                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                                    refreshToken,
                                });

                                const { accessToken } = response.data;
                                localStorage.setItem('accessToken', accessToken);

                                // Retry the original request with new token
                                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                                return this.client(originalRequest);
                            }
                        } catch (refreshError) {
                            // Refresh failed - session truly expired
                            console.log('[API] Session expired, refresh token invalid');
                            
                            // Requirement 12.3: Display "انتهت الجلسة" message
                            toast.error('انتهت الجلسة', {
                                duration: 4000,
                                icon: '⏱️',
                            });
                            
                            // Requirement 12.3: Trigger logout
                            this.handleSessionExpired();
                            
                            return Promise.reject(refreshError);
                        }
                    } else {
                        // Refresh token request failed or already retried
                        console.log('[API] Session expired, cannot refresh');
                        
                        // Requirement 12.3: Display "انتهت الجلسة" message
                        toast.error('انتهت الجلسة', {
                            duration: 4000,
                            icon: '⏱️',
                        });
                        
                        // Requirement 12.3: Trigger logout
                        this.handleSessionExpired();
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    /**
     * Handle session expiration
     * 
     * Requirement 12.3: Clear auth state and redirect to login
     */
    private handleSessionExpired(): void {
        // Clear all auth-related data from localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivityAt'); // Clear idle timeout state too
        
        // Redirect to login page
        // Use setTimeout to ensure toast is visible before redirect
        setTimeout(() => {
            window.location.href = '/login';
        }, 500);
    }

    // Example API methods
    async login(username: string, password: string) {
        const response = await this.client.post('/auth/login', { username, password });
        return response.data;
    }

    async getCustomers(params?: any) {
        const response = await this.client.get('/customers', { params });
        return response.data;
    }

    // ... other API methods
}

/**
 * Alternative Pattern: Separate Interceptor Function
 * 
 * If you want to add session timeout handling to an existing API client,
 * you can create a separate function to set up the interceptor:
 */

export function setupSessionTimeoutInterceptor(axiosInstance: AxiosInstance): void {
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as any;

            // Handle 401 and 419 responses (Requirements 12.1, 12.2)
            if (
                (error.response?.status === 401 || error.response?.status === 419) &&
                !originalRequest._retry
            ) {
                originalRequest._retry = true;

                try {
                    // Try to refresh token
                    const refreshToken = localStorage.getItem('refreshToken');
                    if (refreshToken) {
                        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                            refreshToken,
                        });

                        const { accessToken } = response.data;
                        localStorage.setItem('accessToken', accessToken);

                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return axiosInstance(originalRequest);
                    }
                } catch (refreshError) {
                    // Refresh failed - session expired
                    // Requirement 12.3: Display message and logout
                    toast.error('انتهت الجلسة', {
                        duration: 4000,
                        icon: '⏱️',
                    });
                    
                    // Clear auth data
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    localStorage.removeItem('lastActivityAt');
                    
                    // Redirect to login
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 500);
                    
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
}

/**
 * Usage Example 1: Create new API client with session timeout handling
 */
export const apiClientWithTimeout = new ApiClientWithSessionTimeout();

/**
 * Usage Example 2: Add interceptor to existing API client
 * 
 * In your existing api.ts file:
 */

/*
import { setupSessionTimeoutInterceptor } from './examples/idleTimeout/ApiInterceptorExample';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add session timeout interceptor
        setupSessionTimeoutInterceptor(this.client);

        // ... rest of your setup
    }
}
*/

/**
 * Integration Notes:
 * 
 * 1. Server Session vs Client Idle Timeout:
 *    - Server session timeout: Backend invalidates the session/token
 *    - Client idle timeout: Frontend detects user inactivity
 *    - Both should work together for complete security
 * 
 * 2. Response Status Codes:
 *    - 401 Unauthorized: Token is invalid or expired
 *    - 419 Authentication Timeout: Laravel-specific session timeout
 *    - Both should trigger the same logout flow
 * 
 * 3. Token Refresh Strategy:
 *    - First, try to refresh the access token
 *    - If refresh fails, the session is truly expired
 *    - Only then show the "انتهت الجلسة" message
 * 
 * 4. Coordination with Idle Timeout:
 *    - Clear lastActivityAt when server session expires
 *    - This prevents the idle timeout modal from showing after logout
 *    - Both features share the same logout flow
 * 
 * 5. User Experience:
 *    - Show toast message before redirect (500ms delay)
 *    - Use Arabic text: "انتهت الجلسة" (Session Expired)
 *    - Clear all auth-related localStorage data
 *    - Redirect to login page
 * 
 * 6. Testing:
 *    - Test with expired access token
 *    - Test with expired refresh token
 *    - Test with invalid tokens
 *    - Verify message appears before redirect
 *    - Verify all localStorage is cleared
 */

/**
 * Advanced Pattern: Custom Hook for Session Timeout
 * 
 * If you want more control over the session timeout handling,
 * you can create a custom hook:
 */

/*
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useSessionTimeoutHandler() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handleSessionExpired = async () => {
      // Show message
      toast.error('انتهت الجلسة', {
        duration: 4000,
        icon: '⏱️',
      });
      
      // Logout
      await logout();
      
      // Redirect
      navigate('/login', { replace: true });
    };

    // Listen for custom session expired event
    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [navigate, logout]);
}

// In your API interceptor, dispatch the event:
// window.dispatchEvent(new Event('session-expired'));
*/

export default ApiClientWithSessionTimeout;
