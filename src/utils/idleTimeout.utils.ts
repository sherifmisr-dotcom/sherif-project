/**
 * Utility functions for Idle Session Timeout feature
 * Handles localStorage operations with comprehensive error handling
 */

import { STORAGE_KEYS } from '../types/idleTimeout.types';

/**
 * Safely retrieves the last activity timestamp from localStorage
 * 
 * @returns The last activity timestamp (Date.now()) or null if unavailable/invalid
 * 
 * Error handling:
 * - Returns null if localStorage is unavailable (private browsing, disabled)
 * - Returns null if data is corrupted or invalid
 * - Returns null if timestamp is unreasonable (negative, future, NaN)
 * - Cleans up invalid data automatically
 */
export function safeGetLastActivity(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    
    // No data stored
    if (!stored) {
      return null;
    }
    
    const timestamp = parseInt(stored, 10);
    
    // Validate timestamp is a valid number
    if (isNaN(timestamp)) {
      console.warn('[IdleTimeout] Invalid lastActivityAt in localStorage (NaN), resetting');
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      return null;
    }
    
    // Validate timestamp is not negative
    if (timestamp < 0) {
      console.warn('[IdleTimeout] Invalid lastActivityAt in localStorage (negative), resetting');
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      return null;
    }
    
    // Validate timestamp is not in the future (with 1 minute tolerance for clock skew)
    const now = Date.now();
    if (timestamp > now + 60000) {
      console.warn('[IdleTimeout] Invalid lastActivityAt in localStorage (future timestamp), resetting');
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      return null;
    }
    
    return timestamp;
  } catch (error) {
    // localStorage unavailable (private browsing, disabled, security error)
    console.warn('[IdleTimeout] Failed to read lastActivityAt from localStorage:', error);
    return null;
  }
}

/**
 * Safely stores the last activity timestamp to localStorage
 * 
 * @param timestamp - The timestamp to store (Date.now())
 * 
 * Error handling:
 * - Catches localStorage unavailable errors (private browsing, disabled)
 * - Catches quota exceeded errors (storage full)
 * - Logs warnings but allows feature to continue in-memory
 */
export function safeSetLastActivity(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(timestamp));
  } catch (error) {
    // Check if it's a quota exceeded error
    if (error instanceof DOMException && 
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('[IdleTimeout] localStorage quota exceeded, continuing without persistence');
    } else {
      // Other errors (localStorage disabled, security error, etc.)
      console.warn('[IdleTimeout] Failed to write lastActivityAt to localStorage:', error);
    }
    // Feature continues to work in-memory even if persistence fails
  }
}

/**
 * Clears the last activity timestamp from localStorage
 * Used during logout or cleanup
 * 
 * Error handling:
 * - Catches and logs errors but doesn't throw
 * - Safe to call even if localStorage is unavailable
 */
export function clearLastActivity(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  } catch (error) {
    console.warn('[IdleTimeout] Failed to clear lastActivityAt from localStorage:', error);
    // Not critical if cleanup fails
  }
}

/**
 * Throttle function to limit how often a function can be called
 * 
 * @param func - The function to throttle
 * @param delay - Minimum time in milliseconds between calls
 * @returns Throttled version of the function
 * 
 * Behavior:
 * - First call executes immediately
 * - Subsequent calls within the delay window are ignored
 * - After delay expires, next call executes immediately
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}
