/**
 * Throttle utility function for idle timeout feature
 * Limits function execution frequency to reduce resource usage
 */

/**
 * Creates a throttled version of a function that only executes at most once per delay period
 * The first call executes immediately, subsequent calls within the throttle window are ignored
 * 
 * @param func - Function to throttle
 * @param delay - Minimum time in milliseconds between function executions
 * @returns Throttled version of the function
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}
