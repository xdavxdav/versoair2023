/**
 * Database Connection Pool Configuration
 * Optimizes PostgreSQL connection handling for high-concurrency scenarios
 *
 * Production recommendations:
 * - Max pool size: 20-40 connections (depends on available RAM and CPU)
 * - Min pool size: 5-10 (warm pool to avoid startup latency)
 * - Idle timeout: 30-60 seconds (free up resources)
 * - Connection timeout: 10-20 seconds (fail fast on connection issues)
 */

export const poolConfig = {
  // Maximum number of connections in the pool
  // For Render (shared infrastructure): start with 10, scale to 20 as needed
  max: parseInt(process.env.DB_POOL_MAX || "15", 10),

  // Minimum idle connections to keep warm
  // Reduces latency on first query of the day
  min: parseInt(process.env.DB_POOL_MIN || "5", 10),

  // How long (ms) a connection can sit idle before being closed
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10),

  // How long (ms) to wait for a connection to be available
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT_MS || "20000",
    10,
  ),

  // How many queries can queue up waiting for a connection
  max_queue: parseInt(process.env.DB_MAX_QUEUE || "10", 10),
};

/**
 * Current pool configuration (read-only, for logging/debugging)
 * Logs this when server starts for visibility into production settings
 */
export function logPoolConfig(): void {
  console.log("[DB Pool Config]", {
    max: poolConfig.max,
    min: poolConfig.min,
    idleTimeoutMs: poolConfig.idleTimeoutMillis,
    connectionTimeoutMs: poolConfig.connectionTimeoutMillis,
    maxQueue: poolConfig.max_queue,
  });
}

/**
 * Scaling guidelines for different load levels:
 *
 * Low (< 100 concurrent users):
 *   max: 5-10, min: 2-3
 *   Good for dev/staging
 *
 * Medium (100-1000 concurrent users):
 *   max: 15-25, min: 5-10
 *   Typical production for web app
 *
 * High (1000+ concurrent users):
 *   max: 30-50, min: 10-20
 *   Add read replicas for query scaling
 *   Consider connection pooler (PgBouncer, Neon proxy)
 *
 * Monitoring tips:
 * - Track active_connections in pg_stat_activity
 * - Monitor query wait times in logs
 * - Watch idle connections (may indicate resource leak)
 * - Alert if queue grows beyond 5
 */
