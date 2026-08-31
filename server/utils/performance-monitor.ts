/**
 * Performance Monitoring Utilities
 * Tracks query times, slow queries, and connection metrics
 */

import { createLogger } from "./logger";

const log = createLogger("perf-monitor");

interface QueryMetric {
  query: string;
  durationMs: number;
  timestamp: Date;
  slow: boolean;
}

interface PerformanceStats {
  totalQueries: number;
  slowQueries: number;
  avgDurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
}

const SLOW_QUERY_THRESHOLD_MS = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || "500",
  10,
);
const MAX_METRICS_TO_KEEP = 1000;
const metrics: QueryMetric[] = [];

/**
 * Record a query execution time
 * Automatically logs if query exceeds slow threshold
 */
export function recordQuery(
  queryLabel: string,
  durationMs: number,
  context?: Record<string, any>,
): void {
  const slow = durationMs > SLOW_QUERY_THRESHOLD_MS;

  const metric: QueryMetric = {
    query: queryLabel,
    durationMs,
    timestamp: new Date(),
    slow,
  };

  metrics.push(metric);

  // Keep only recent metrics (trim old ones)
  if (metrics.length > MAX_METRICS_TO_KEEP) {
    metrics.shift();
  }

  if (slow) {
    log.warn(`⚠️ Slow query detected: ${queryLabel}`, {
      durationMs,
      threshold: SLOW_QUERY_THRESHOLD_MS,
      ...context,
    });
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(): PerformanceStats {
  if (metrics.length === 0) {
    return {
      totalQueries: 0,
      slowQueries: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      minDurationMs: 0,
    };
  }

  const durations = metrics.map((m) => m.durationMs);
  const slowCount = metrics.filter((m) => m.slow).length;

  return {
    totalQueries: metrics.length,
    slowQueries: slowCount,
    avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxDurationMs: Math.max(...durations),
    minDurationMs: Math.min(...durations),
  };
}

/**
 * Get recent slow queries for debugging
 */
export function getRecentSlowQueries(limit: number = 10): QueryMetric[] {
  return metrics
    .filter((m) => m.slow)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Reset metrics (useful for monitoring window resets)
 */
export function resetMetrics(): void {
  metrics.length = 0;
  log.info("Performance metrics reset");
}

/**
 * Middleware for Express: logs request duration
 * Usage: app.use(performanceMiddleware())
 */
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Intercept res.end to capture response time
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const durationMs = Date.now() - startTime;

      // Only track slow requests
      if (durationMs > 500) {
        log.warn(`⚠️ Slow request: ${req.method} ${req.path}`, {
          durationMs,
          statusCode: res.statusCode,
        });
      }

      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Timer utility for measuring async operations
 * Usage: const timer = new Timer("operation name");
 *        await doWork();
 *        timer.end();
 */
export class Timer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  end(context?: Record<string, any>): number {
    const durationMs = Date.now() - this.startTime;
    recordQuery(this.label, durationMs, context);
    return durationMs;
  }
}

/**
 * Periodic stats reporter (logs every N minutes)
 */
export function startStatsReporter(intervalMinutes: number = 5): void {
  setInterval(() => {
    const stats = getPerformanceStats();
    if (stats.totalQueries > 0) {
      log.info("📊 Performance stats (last interval)", stats);

      const slowQueries = getRecentSlowQueries(3);
      if (slowQueries.length > 0) {
        log.warn("🔴 Top slow queries:", slowQueries);
      }
    }
  }, intervalMinutes * 60 * 1000);
}
