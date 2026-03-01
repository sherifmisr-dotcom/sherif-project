/**
 * Unit tests for throttle utility function
 * Tests Requirements 11.1, 11.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../../utils/idleTimeout.utils';

describe('throttle utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute first call immediately', () => {
    const mockFn = vi.fn();
    const throttled = throttle(mockFn, 3000);

    throttled();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should ignore subsequent calls within throttle window', () => {
    const mockFn = vi.fn();
    const throttled = throttle(mockFn, 3000);

    // First call - should execute
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Subsequent calls within 3 seconds - should be ignored
    vi.advanceTimersByTime(1000);
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should execute call after throttle window expires', () => {
    const mockFn = vi.fn();
    const throttled = throttle(mockFn, 3000);

    // First call
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Wait for throttle window to expire
    vi.advanceTimersByTime(3000);

    // Next call should execute
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to the throttled function', () => {
    const mockFn = vi.fn();
    const throttled = throttle(mockFn, 3000);

    throttled('arg1', 'arg2', 123);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should handle multiple rapid calls correctly', () => {
    const mockFn = vi.fn();
    const throttled = throttle(mockFn, 3000);

    // Simulate rapid mousemove events
    for (let i = 0; i < 10; i++) {
      throttled();
      vi.advanceTimersByTime(100);
    }

    // Only first call should execute (10 calls over 1 second, throttle is 3 seconds)
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should allow execution after each throttle period', () => {
    const mockFn = vi.fn();
    const throttled = throttle(mockFn, 1000);

    // Call 1 - executes immediately
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Wait 1 second
    vi.advanceTimersByTime(1000);

    // Call 2 - executes
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Wait 1 second
    vi.advanceTimersByTime(1000);

    // Call 3 - executes
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should work with different delay values', () => {
    const mockFn = vi.fn();
    const throttled = throttle(mockFn, 5000);

    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Within 5 seconds - ignored
    vi.advanceTimersByTime(4999);
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(1);

    // At exactly 5 seconds - executes
    vi.advanceTimersByTime(1);
    throttled();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should maintain independent state for multiple throttled functions', () => {
    const mockFn1 = vi.fn();
    const mockFn2 = vi.fn();
    const throttled1 = throttle(mockFn1, 3000);
    const throttled2 = throttle(mockFn2, 3000);

    // Both should execute immediately
    throttled1();
    throttled2();
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);

    // Both should be throttled independently
    vi.advanceTimersByTime(1000);
    throttled1();
    throttled2();
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });
});
