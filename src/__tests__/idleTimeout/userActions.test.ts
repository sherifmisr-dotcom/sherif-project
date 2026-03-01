/**
 * Unit tests for user action handlers (Task 7)
 * Tests handleContinue and handleLogout functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';

describe('User Action Handlers (Task 7)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('handleContinue (Task 7.1)', () => {
    it('should close modal when continue is clicked', () => {
      const onLogout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated: true,
          onLogout,
        })
      );

      // Manually trigger modal state (simulating idle threshold reached)
      act(() => {
        // Access internal state by triggering the condition
        vi.advanceTimersByTime(50000); // Advance to warning threshold
      });

      // Call handleContinue
      act(() => {
        result.current.handleContinue();
      });

      // Verify modal is closed
      expect(result.current.showModal).toBe(false);
    });

    it('should reset lastActivityAt to current time', () => {
      const onLogout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated: true,
          onLogout,
        })
      );

      const beforeTime = Date.now();

      // Call handleContinue
      act(() => {
        result.current.handleContinue();
      });

      // Verify localStorage was updated with current time
      const stored = localStorage.getItem('lastActivityAt');
      expect(stored).toBeTruthy();
      const storedTime = parseInt(stored!, 10);
      expect(storedTime).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should update localStorage with new timestamp', () => {
      const onLogout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated: true,
          onLogout,
        })
      );

      // Set an old timestamp
      const oldTime = Date.now() - 50000;
      localStorage.setItem('lastActivityAt', String(oldTime));

      // Call handleContinue
      act(() => {
        result.current.handleContinue();
      });

      // Verify localStorage was updated with newer time
      const stored = localStorage.getItem('lastActivityAt');
      expect(stored).toBeTruthy();
      const storedTime = parseInt(stored!, 10);
      expect(storedTime).toBeGreaterThan(oldTime);
    });
  });

  describe('handleLogout (Task 7.2)', () => {
    it('should call onLogout callback', () => {
      const onLogout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated: true,
          onLogout,
        })
      );

      // Call handleLogout
      act(() => {
        result.current.handleLogout();
      });

      // Verify onLogout was called
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should close modal when logout is clicked', () => {
      const onLogout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated: true,
          onLogout,
        })
      );

      // Call handleLogout
      act(() => {
        result.current.handleLogout();
      });

      // Verify modal is closed
      expect(result.current.showModal).toBe(false);
    });

    it('should clear localStorage', () => {
      const onLogout = vi.fn();
      
      // Set initial value in localStorage
      localStorage.setItem('lastActivityAt', String(Date.now()));
      expect(localStorage.getItem('lastActivityAt')).toBeTruthy();

      const { result } = renderHook(() =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated: true,
          onLogout,
        })
      );

      // Call handleLogout
      act(() => {
        result.current.handleLogout();
      });

      // Verify localStorage was cleared
      expect(localStorage.getItem('lastActivityAt')).toBeNull();
    });

    it('should handle onLogout callback errors gracefully', () => {
      const onLogout = vi.fn(() => {
        throw new Error('Logout failed');
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useIdleTimeout({
          idleMs: 60000,
          warnMs: 10000,
          throttleMs: 3000,
          isAuthenticated: true,
          onLogout,
        })
      );

      // Call handleLogout - should not throw
      act(() => {
        result.current.handleLogout();
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Verify modal is still closed despite error
      expect(result.current.showModal).toBe(false);
      
      // Verify localStorage was still cleared
      expect(localStorage.getItem('lastActivityAt')).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });
});
