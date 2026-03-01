/**
 * Tests for authentication state management (Task 9.1)
 * Requirements: 7.1, 7.2, 7.3, 7.4, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';

describe('Authentication State Management (Task 9.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should not start timer when unauthenticated (Requirements 7.1, 7.2)', () => {
    const onLogout = vi.fn();

    const { result } = renderHook(() =>
      useIdleTimeout({
        idleMs: 60000,
        warnMs: 10000,
        throttleMs: 3000,
        isAuthenticated: false,
        onLogout,
      })
    );

    // Advance time significantly
    act(() => {
      vi.advanceTimersByTime(70000);
    });

    // Modal should not be shown
    expect(result.current.showModal).toBe(false);
    
    // Logout should not be called
    expect(onLogout).not.toHaveBeenCalled();
    
    // localStorage should be empty
    expect(localStorage.getItem('lastActivityAt')).toBeNull();
  });

  it('should start tracking when user becomes authenticated (Requirement 7.3)', () => {
    const onLogout = vi.fn();

    const { rerender } = renderHook(
      ({ isAuthenticated }) =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated,
          onLogout,
        }),
      { initialProps: { isAuthenticated: false } }
    );

    // Initially unauthenticated - no lastActivityAt
    expect(localStorage.getItem('lastActivityAt')).toBeNull();

    // Become authenticated
    act(() => {
      rerender({ isAuthenticated: true });
    });

    // Now lastActivityAt should be set
    expect(localStorage.getItem('lastActivityAt')).not.toBeNull();
  });

  it('should cleanup when user becomes unauthenticated (Requirements 7.4, 9.5)', () => {
    const onLogout = vi.fn();

    const { rerender } = renderHook(
      ({ isAuthenticated }) =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated,
          onLogout,
        }),
      { initialProps: { isAuthenticated: true } }
    );

    // Initially authenticated - lastActivityAt should be set
    expect(localStorage.getItem('lastActivityAt')).not.toBeNull();

    // Become unauthenticated
    act(() => {
      rerender({ isAuthenticated: false });
    });

    // lastActivityAt should be cleared (Requirement 9.5)
    expect(localStorage.getItem('lastActivityAt')).toBeNull();
  });

  it('should restore state from localStorage on mount (Requirements 9.2, 9.3, 9.4)', () => {
    const onLogout = vi.fn();
    const idleMs = 60000;
    const warnMs = 10000;

    // Set lastActivityAt to 55 seconds ago (past warning threshold)
    const pastTime = Date.now() - 55000;
    localStorage.setItem('lastActivityAt', String(pastTime));

    const { result } = renderHook(() =>
      useIdleTimeout({
        idleMs,
        warnMs,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Modal should be shown immediately because we're past the warning threshold
    expect(result.current.showModal).toBe(true);
  });

  it('should trigger logout immediately if session expired during page reload (Requirements 9.2, 9.3, 9.4)', () => {
    const onLogout = vi.fn();
    const idleMs = 60000;
    const warnMs = 10000;

    // Set lastActivityAt to 65 seconds ago (past full idle period)
    const pastTime = Date.now() - 65000;
    localStorage.setItem('lastActivityAt', String(pastTime));

    renderHook(() =>
      useIdleTimeout({
        idleMs,
        warnMs,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Logout should be triggered immediately
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('should initialize with current time if no stored activity', () => {
    const onLogout = vi.fn();

    renderHook(() =>
      useIdleTimeout({
        idleMs: 60000,
        warnMs: 10000,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // lastActivityAt should be set to current time
    const lastActivity = localStorage.getItem('lastActivityAt');
    expect(lastActivity).not.toBeNull();
    
    const lastActivityTime = parseInt(lastActivity!, 10);
    const now = Date.now();
    
    // Should be very recent (within 1 second)
    expect(now - lastActivityTime).toBeLessThan(1000);
  });

  it('should start check interval when authenticated', () => {
    const onLogout = vi.fn();
    const idleMs = 60000;
    const warnMs = 10000;

    const { result } = renderHook(() =>
      useIdleTimeout({
        idleMs,
        warnMs,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Modal should not be shown initially
    expect(result.current.showModal).toBe(false);

    // Advance time to warning threshold
    act(() => {
      vi.advanceTimersByTime(51000); // 51 seconds (past 50 second warning threshold)
    });

    // Modal should now be shown (check interval detected it)
    expect(result.current.showModal).toBe(true);
  });

  it('should stop check interval when unauthenticated', () => {
    const onLogout = vi.fn();
    const idleMs = 60000;
    const warnMs = 10000;

    const { rerender } = renderHook(
      ({ isAuthenticated }) =>
        useIdleTimeout({
          idleMs,
          warnMs,
          throttleMs: 3000,
          isAuthenticated,
          onLogout,
        }),
      { initialProps: { isAuthenticated: true } }
    );

    // Become unauthenticated
    act(() => {
      rerender({ isAuthenticated: false });
    });

    // Advance time significantly
    act(() => {
      vi.advanceTimersByTime(70000);
    });

    // Logout should not be called (check interval stopped)
    expect(onLogout).not.toHaveBeenCalled();
  });
});
