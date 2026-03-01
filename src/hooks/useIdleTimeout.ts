/**
 * useIdleTimeout Hook
 * 
 * Manages idle session timeout detection and warning modal display.
 * Tracks user activity, persists state to localStorage, and triggers logout
 * when idle threshold is exceeded.
 * 
 * Requirements: 13.1, 13.2, 13.4, 14.1, 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 10.1
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { UseIdleTimeoutOptions, UseIdleTimeoutReturn, ActivityEvent } from '../types/idleTimeout.types';
import { throttle, safeSetLastActivity, safeGetLastActivity, clearLastActivity } from '../utils/idleTimeout.utils';

/**
 * Hook for managing idle session timeout
 * 
 * @param options - Configuration options
 * @returns Hook state and handlers
 */
export function useIdleTimeout(options: UseIdleTimeoutOptions): UseIdleTimeoutReturn {
  const { idleMs, warnMs, throttleMs, isAuthenticated, onLogout } = options;

  // State variables for UI
  const [showModal, setShowModal] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(Math.floor(warnMs / 1000));
  const [expired, setExpired] = useState<boolean>(false);

  // Refs to avoid stale closures in intervals/timeouts
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const isModalOpenRef = useRef<boolean>(false);
  const isLoggingOutRef = useRef<boolean>(false);

  // Activity tracking logic (Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 10.1)
  // Create throttled activity handler to reduce resource usage
  const handleActivity = useCallback(
    throttle(() => {
      // Ignore activity when modal is open (Requirement 10.1)
      if (isModalOpenRef.current) {
        return;
      }

      // Update last activity time
      const now = Date.now();
      lastActivityRef.current = now;

      // Persist to localStorage
      safeSetLastActivity(now);
    }, throttleMs),
    [throttleMs]
  );

  // Activity events to track (Requirements: 1.1, 1.2, 1.3, 1.4)
  const activityEvents: ActivityEvent[] = [
    'mousemove',   // Requirement 1.1: Track mouse events
    'mousedown',   // Requirement 1.1: Track mouse events
    'keydown',     // Requirement 1.2: Track keyboard events
    'scroll',      // Requirement 1.3: Track scroll events
    'touchstart',  // Requirement 1.4: Track touch events
  ];

  // Attach/detach activity event listeners based on authentication state
  useEffect(() => {
    // Only track activity when authenticated (Requirement 1.5)
    if (!isAuthenticated) {
      return;
    }

    // Attach event listeners to document
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup: Remove event listeners
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, handleActivity]);

  // Countdown interval management (Requirement 3.5)
  // Start countdown when modal opens
  const startCountdown = useCallback(() => {
    // Clear any existing countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Reset countdown to initial value
    setExpired(false);
    setRemainingSeconds(Math.floor(warnMs / 1000));

    // Start new countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;

        // When countdown reaches 0, mark as expired
        if (next <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setExpired(true);
          return 0;
        }

        return next;
      });
    }, 1000); // Decrement every second
  }, [warnMs]);

  // Stop countdown when modal closes
  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Shared logout logic used by both handleLogout and checkIdleStatus
  // Requirements: 5.1, 5.4, 6.1
  const performLogout = useCallback(() => {
    // Prevent double-logout race conditions
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      // Close modal if open
      setShowModal(false);
      isModalOpenRef.current = false;

      // Stop countdown interval
      stopCountdown();

      // Stop check interval to prevent re-triggering
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }

      // Clear localStorage (auth system will clear tokens)
      clearLastActivity();

      // Call onLogout callback with error handling
      // This should clear auth state, tokens, and redirect to login
      onLogout();

    } catch (error) {
      // Error handling: Even if callback fails, ensure local state is cleaned up
      console.error('[IdleTimeout] Error during logout:', error);

      // Still clear local state to prevent stuck states
      setShowModal(false);
      isModalOpenRef.current = false;
      clearLastActivity();
    } finally {
      // Reset the flag after a short delay to allow re-login
      setTimeout(() => { isLoggingOutRef.current = false; }, 1000);
    }
  }, [onLogout, stopCountdown]);

  // Idle status checking logic (Requirements: 3.1, 6.1, 8.2, 8.3, 14.1)
  const checkIdleStatus = useCallback(() => {
    const now = Date.now();
    const lastActivity = lastActivityRef.current;
    let idleDuration = now - lastActivity;

    // Handle negative idle duration (clock went backwards)
    // Requirement 14.1: Handle clock changes gracefully
    if (idleDuration < 0) {

      lastActivityRef.current = now;
      safeSetLastActivity(now);
      idleDuration = 0;
      return;
    }

    // Requirement 6.1: Trigger logout when idle >= idleMs
    // BUT: if warning modal is already open, let the countdown handle logout timing
    // to guarantee the user gets the full warning duration (e.g. 60 seconds)
    if (idleDuration >= idleMs && !isModalOpenRef.current) {
      // Auto logout after full idle period (no modal was shown)
      performLogout();
      return;
    }

    // Requirement 3.1: Show modal when idle >= (idleMs - warnMs)
    // Requirement 8.2: Show modal immediately when returning to tab if threshold exceeded
    if (idleDuration >= idleMs - warnMs && !isModalOpenRef.current) {
      setShowModal(true);
      isModalOpenRef.current = true;
      startCountdown();
    }
  }, [idleMs, warnMs, startCountdown, performLogout]);

  // Visibility change handling (Task 8.1)
  // Requirements: 8.1, 8.2, 8.3, 8.4
  const handleVisibilityChange = useCallback(() => {
    // Requirement 8.1: Check idle status when visibility changes or window gains focus
    // Only check when page becomes visible or gains focus
    if (document.visibilityState === 'visible' || document.hasFocus()) {


      // Requirement 8.4: Do NOT reset timer - just check current idle status
      // This is different from activity events which DO reset the timer
      checkIdleStatus();
    }
  }, [checkIdleStatus]);

  // User action handlers (Task 7)

  // Task 7.1: handleContinue - Reset timer and close modal
  // Requirements: 4.1, 4.2, 4.3, 10.4
  const handleContinue = useCallback(() => {
    // If countdown expired, treat Continue as logout
    if (expired) {
      performLogout();
      return;
    }

    // Requirement 4.1: Close modal
    setShowModal(false);
    isModalOpenRef.current = false;

    // Stop countdown interval
    stopCountdown();

    // Requirement 4.2: Reset lastActivityAt to current time
    const now = Date.now();
    lastActivityRef.current = now;

    // Requirement 4.3 & 10.4: Update localStorage
    safeSetLastActivity(now);

    // Activity tracking resumes automatically (event listeners still attached)

  }, [stopCountdown, expired, performLogout]);

  // Task 7.2: handleLogout - Trigger logout and cleanup
  // Requirements: 5.1, 5.4
  const handleLogout = useCallback(() => {

    performLogout();
  }, [performLogout]);

  // Cleanup countdown interval on unmount or when modal closes
  useEffect(() => {
    if (!showModal) {
      stopCountdown();
    }
  }, [showModal, stopCountdown]);

  // Attach/detach visibility change event listeners (Task 8.1)
  // Requirements: 8.1, 8.2, 8.3, 8.4
  useEffect(() => {
    // Only listen to visibility changes when authenticated
    if (!isAuthenticated) {
      return;
    }

    // Attach visibility change listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Cleanup: Remove event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isAuthenticated, handleVisibilityChange]);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      stopCountdown();
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [stopCountdown]);

  // Task 9.1: Authentication state management - initialization and cleanup
  // Requirements: 7.1, 7.2, 7.3, 7.4, 9.2, 9.3, 9.4, 9.5
  useEffect(() => {
    // Requirement 7.1, 7.2: When unauthenticated, don't start timer or show modal
    if (!isAuthenticated) {


      // Requirement 7.4: Clean up intervals when authentication becomes false
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      // Requirement 9.5: Clear lastActivityAt from localStorage on logout
      clearLastActivity();

      // Hide modal if shown
      setShowModal(false);
      isModalOpenRef.current = false;

      return;
    }

    // Requirement 7.3: When user becomes authenticated, start tracking


    // Requirement 9.2, 9.3, 9.4: Restore state from localStorage on mount/authentication
    const storedLastActivity = safeGetLastActivity();

    if (storedLastActivity !== null) {
      // Restore from localStorage

      lastActivityRef.current = storedLastActivity;

      // Immediately check if session expired while away
      // This handles page reload or returning after being away
      checkIdleStatus();
    } else {
      // No stored activity, initialize with current time

      const now = Date.now();
      lastActivityRef.current = now;
      safeSetLastActivity(now);
    }

    // Start idle check interval (check every 1 second for responsiveness)

    checkIntervalRef.current = setInterval(() => {
      checkIdleStatus();
    }, 1000);

    // Cleanup function: stop intervals when authentication changes or component unmounts
    return () => {

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkIdleStatus]);

  return {
    showModal,
    remainingSeconds,
    expired,
    handleContinue,
    handleLogout,
  };
}
