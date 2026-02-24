/**
 * Debounce and Throttle Utilities
 * Rate limiting helpers for performance optimization
 */

/**
 * Debounce function that delays execution until after wait milliseconds
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  };
};

/**
 * Throttle function that executes at most once every wait milliseconds
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      fn(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        fn(...args);
      }, remaining);
    }
  };
};

/**
 * Async debounce for async functions
 */
export const asyncDebounce = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  wait: number,
): ((...args: Parameters<T>) => Promise<void>) => {
  let timeout: NodeJS.Timeout | null = null;

  return async (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);

    return new Promise<void>((resolve) => {
      timeout = setTimeout(async () => {
        await fn(...args);
        resolve();
      }, wait);
    });
  };
};

/**
 * Rate limiter that tracks call count within a time window
 */
export class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number;

  constructor(maxCalls: number = 10, timeWindow: number = 1000) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow;
  }

  isAllowed(): boolean {
    const now = Date.now();

    // Remove old calls outside the time window
    this.calls = this.calls.filter((time) => now - time < this.timeWindow);

    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }

    return false;
  }

  getRemainingTime(): number {
    if (this.calls.length === 0) return 0;
    const oldestCall = this.calls[0];
    return Math.max(0, this.timeWindow - (Date.now() - oldestCall));
  }

  reset(): void {
    this.calls = [];
  }
}
