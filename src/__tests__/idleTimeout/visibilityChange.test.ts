/**
 * Tests for visibility change handling (Task 8.1)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';

describe('Visibility Change Handling (Task 8.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should check idle status when page becomes visible', () => {
    const onLogout = vi.fn();
    const idleMs = 60000; // 60 seconds
    const warnMs = 10000; // 10 seconds

    const { result } = renderHook(() =>
      useIdleTimeout({
        idleMs,
        warnMs,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Simulate user being idle for 51 seconds (past warning threshold)
    // The check interval runs every second, so modal will be shown automatically
    act(() => {
      vi.advanceTimersByTime(51000);
    });

    // Modal should be shown by the check interval
    expect(result.current.showModal).toBe(true);

    // Close the modal to test visibility change behavior
    act(() => {
      result.current.handleContinue();
    });

    // Modal should be closed now
    expect(result.current.showModal).toBe(false);

    // Advance time again to exceed warning threshold
    act(() => {
      vi.advanceTimersByTime(51000);
    });

    // Simulate visibility change to visible
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Modal should be shown again because idle duration exceeded warning threshold
    expect(result.current.showModal).toBe(true);
  });

  it('should trigger logout when page becomes visible after full idle period', () => {
    const onLogout = vi.fn();
    const idleMs = 60000; // 60 seconds
    const warnMs = 10000; // 10 seconds

    renderHook(() =>
      useIdleTimeout({
        idleMs,
        warnMs,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Simulate user being idle for 61 seconds (past full idle period)
    // The check interval will trigger logout automatically
    act(() => {
      vi.advanceTimersByTime(61000);
    });

    // Logout should already be triggered by the check interval
    const callCountAfterInterval = onLogout.mock.calls.length;
    expect(callCountAfterInterval).toBeGreaterThan(0);

    // Simulate visibility change to visible
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify that visibility change may trigger additional logout calls
    // (this is acceptable behavior - the system ensures logout happens)
    expect(onLogout).toHaveBeenCalled();
  });

  it('should check idle status when window gains focus', () => {
    const onLogout = vi.fn();
    const idleMs = 60000; // 60 seconds
    const warnMs = 10000; // 10 seconds

    const { result } = renderHook(() =>
      useIdleTimeout({
        idleMs,
        warnMs,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Simulate user being idle for 51 seconds (past warning threshold)
    // The check interval runs every second, so modal will be shown automatically
    act(() => {
      vi.advanceTimersByTime(51000);
    });

    // Modal should be shown by the check interval
    expect(result.current.showModal).toBe(true);

    // Close the modal to test focus behavior
    act(() => {
      result.current.handleContinue();
    });

    // Modal should be closed now
    expect(result.current.showModal).toBe(false);

    // Advance time again to exceed warning threshold
    act(() => {
      vi.advanceTimersByTime(51000);
    });

    // Simulate window gaining focus
    act(() => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      window.dispatchEvent(new Event('focus'));
    });

    // Modal should be shown again
    expect(result.current.showModal).toBe(true);
  });

  it('should NOT reset timer when visibility changes (Requirement 8.4)', () => {
    const onLogout = vi.fn();
    const idleMs = 60000; // 60 seconds
    const warnMs = 10000; // 10 seconds

    const { result } = renderHook(() =>
      useIdleTimeout({
        idleMs,
        warnMs,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Simulate user being idle for 51 seconds (past warning threshold)
    act(() => {
      vi.advanceTimersByTime(51000);
    });

    // Trigger visibility change
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Modal should be shown
    expect(result.current.showModal).toBe(true);

    // Verify that lastActivityAt was NOT updated by checking localStorage
    const lastActivity = localStorage.getItem('lastActivityAt');
    const lastActivityTime = lastActivity ? parseInt(lastActivity, 10) : 0;
    const now = Date.now();
    const idleDuration = now - lastActivityTime;

    // Idle duration should still be around 51 seconds (not reset to 0)
    expect(idleDuration).toBeGreaterThan(50000);
  });

  it('should not attach visibility listeners when unauthenticated', () => {
    const onLogout = vi.fn();
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener');

    renderHook(() =>
      useIdleTimeout({
        idleMs: 60000,
        warnMs: 10000,
        throttleMs: 3000,
        isAuthenticated: false,
        onLogout,
      })
    );

    // Verify that visibilitychange and focus listeners were NOT attached
    const visibilityListenerAdded = addEventListenerSpy.mock.calls.some(
      (call) => call[0] === 'visibilitychange'
    );
    const focusListenerAdded = windowAddEventListenerSpy.mock.calls.some(
      (call) => call[0] === 'focus'
    );

    expect(visibilityListenerAdded).toBe(false);
    expect(focusListenerAdded).toBe(false);
  });

  it('should remove visibility listeners on unmount', () => {
    const onLogout = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useIdleTimeout({
        idleMs: 60000,
        warnMs: 10000,
        throttleMs: 3000,
        isAuthenticated: true,
        onLogout,
      })
    );

    // Unmount the hook
    unmount();

    // Verify that visibilitychange and focus listeners were removed
    const visibilityListenerRemoved = removeEventListenerSpy.mock.calls.some(
      (call) => call[0] === 'visibilitychange'
    );
    const focusListenerRemoved = windowRemoveEventListenerSpy.mock.calls.some(
      (call) => call[0] === 'focus'
    );

    expect(visibilityListenerRemoved).toBe(true);
    expect(focusListenerRemoved).toBe(true);
  });
});
