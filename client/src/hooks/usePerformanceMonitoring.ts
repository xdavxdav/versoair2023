import { useEffect, useRef } from "react";

/**
 * Performance Monitoring Hook
 * Tracks component render times and logs performance metrics
 *
 * Usage:
 * usePerformanceMonitoring("TableBrowser");
 */
export function usePerformanceMonitoring(componentName: string) {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    renderStartRef.current = performance.now();

    return () => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStartRef.current;

      if (renderTime > 16) {
        // Warn if render takes longer than one frame (60fps)
        console.warn(
          `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (>16ms)`,
        );
      } else {
        console.log(
          `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms`,
        );
      }
    };
  });
}

/**
 * Measure Computation Time
 * Useful for measuring expensive operations
 *
 * Usage:
 * const result = measureTime(() => expensiveComputation(), "filter operation");
 */
export function measureTime<T>(fn: () => T, label: string): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  return result;
}

/**
 * Create Performance Mark and Measure
 * Standard Web Performance API usage
 *
 * Usage:
 * const perfMarker = createPerfMarker("data-fetch");
 * // ... do work
 * perfMarker.end(); // Logs measure
 */
export class PerfMarker {
  private markName: string;

  constructor(label: string) {
    this.markName = `mark-${label}`;
    performance.mark(this.markName);
  }

  end(label?: string): number {
    const endMark = `${this.markName}-end`;
    const measureName = label || this.markName;

    performance.mark(endMark);
    performance.measure(measureName, this.markName, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    const duration = (measure as PerformanceMeasure).duration;

    console.log(`[Performance] ${measureName}: ${duration.toFixed(2)}ms`);

    return duration;
  }
}

export function createPerfMarker(label: string): PerfMarker {
  return new PerfMarker(label);
}

/**
 * Get Performance Metrics
 * Returns current page performance metrics
 */
export interface PerformanceMetrics {
  pageLoadTime: number;
  domReadyTime: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
}

export function getPerformanceMetrics(): PerformanceMetrics {
  const navigationTiming = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming;

  const paintEntries = performance.getEntriesByType("paint");
  const fcp = paintEntries.find(
    (entry) => entry.name === "first-contentful-paint",
  );

  const metrics: PerformanceMetrics = {
    pageLoadTime: navigationTiming
      ? navigationTiming.loadEventEnd - navigationTiming.fetchStart
      : 0,
    domReadyTime: navigationTiming
      ? navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart
      : 0,
    firstContentfulPaint: fcp ? fcp.startTime : undefined,
  };

  // Try to get Web Vitals if available
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ("value" in entry) {
            const vitalEntry = entry as unknown as {
              name: string;
              value: number;
            };
            if (vitalEntry.name === "LCP") {
              metrics.largestContentfulPaint = vitalEntry.value;
            } else if (vitalEntry.name === "FID") {
              metrics.firstInputDelay = vitalEntry.value;
            }
          }
        }
      });

      observer.observe({
        entryTypes: ["largest-contentful-paint", "first-input"],
        buffered: true,
      });
    } catch {
      // PerformanceObserver might not be available
    }
  }

  return metrics;
}

/**
 * Log Performance Metrics
 * Logs all available performance metrics to console
 */
export function logPerformanceMetrics() {
  const metrics = getPerformanceMetrics();

  console.group("[Performance Metrics]");
  console.log(`Page Load Time: ${metrics.pageLoadTime.toFixed(2)}ms`);
  console.log(`DOM Ready Time: ${metrics.domReadyTime.toFixed(2)}ms`);

  if (metrics.firstContentfulPaint) {
    console.log(
      `First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`,
    );
  }
  if (metrics.largestContentfulPaint) {
    console.log(
      `Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms`,
    );
  }
  if (metrics.firstInputDelay) {
    console.log(`First Input Delay: ${metrics.firstInputDelay.toFixed(2)}ms`);
  }

  console.groupEnd();
}

/**
 * Monitor React Query Performance
 * Example usage in effects or callbacks
 *
 * Usage in query:
 * const { data, isPending } = useQuery({
 *   queryKey: ["tables"],
 *   queryFn: async () => {
 *     const marker = createPerfMarker("fetch-tables");
 *     const response = await fetch(...);
 *     const data = await response.json();
 *     marker.end("fetch-tables");
 *     return data;
 *   },
 * });
 */

/**
 * Batch Performance Measurements
 * Useful for measuring multiple operations
 */
export class PerformanceBatch {
  private measurements: Map<string, number[]> = new Map();

  start(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      const existing = this.measurements.get(label) || [];
      existing.push(duration);
      this.measurements.set(label, existing);
    };
  }

  report() {
    console.group("[Performance Batch Report]");

    for (const [label, durations] of this.measurements) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      console.log(`${label}:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
      console.log(`  Samples: ${durations.length}`);
    }

    console.groupEnd();
  }

  clear() {
    this.measurements.clear();
  }
}

export function createPerformanceBatch(): PerformanceBatch {
  return new PerformanceBatch();
}

/**
 * Memory Usage Monitor (Chrome DevTools Protocol)
 * Note: Only available in development with specific browser configuration
 */
export async function getMemoryUsage() {
  if (
    "memory" in performance &&
    typeof (performance as any).memory === "object"
  ) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      percentUsed: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }

  return null;
}

/**
 * Log Memory Usage
 */
export async function logMemoryUsage() {
  const memory = await getMemoryUsage();

  if (memory) {
    console.group("[Memory Usage]");
    console.log(`Used: ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB`);
    console.log(`Total: ${(memory.totalJSHeapSize / 1048576).toFixed(2)}MB`);
    console.log(`Limit: ${(memory.jsHeapSizeLimit / 1048576).toFixed(2)}MB`);
    console.log(`Used: ${memory.percentUsed.toFixed(1)}%`);
    console.groupEnd();
  } else {
    console.warn("Memory API not available in this browser");
  }
}
