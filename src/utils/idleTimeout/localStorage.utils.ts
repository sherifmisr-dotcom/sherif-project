/**
 * localStorage utility functions for idle timeout feature
 * Implements safe localStorage operations with error handling
 */

import { STORAGE_KEYS } from '../../types/idleTimeout.types';

/**
 * Safely get last activity timestamp from localStorage
 * @returns Timestamp in milliseconds or null if not found/invalid
 */
export function safeGetLastActivity(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    if (!stored) return null;
    
    const timestamp = parseInt(stored, 10);
    
    // Validate timestamp is reasonable
    if (isNaN(timestamp) || timestamp < 0 || timestamp > Date.now()) {
      console.warn('Invalid lastActivityAt in localStorage, resetting');
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      return null;
    }
    
    return timestamp;
  } catch (error) {
    console.warn('Failed to read lastActivityAt from localStorage:', error);
    return null;
  }
}

/**
 * Safely set last activity timestamp in localStorage
 * @param timestamp - Timestamp in milliseconds
 */
export function safeSetLastActivity(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(timestamp));
  } catch (error) {
    console.warn('Failed to write lastActivityAt to localStorage:', error);
    // Continue without persistence - timer still works in memory
  }
}

/**
 * Clear last activity timestamp from localStorage
 */
export function clearLastActivity(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  } catch (error) {
    console.warn('Failed to clear lastActivityAt from localStorage:', error);
  }
}
