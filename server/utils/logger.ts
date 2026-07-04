/**
 * Structured server-side logger.
 * Wraps console.* with log levels, timestamps, and context labels.
 * Set LOG_LEVEL=error in production to suppress debug/info output.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function currentLevel(): number {
  const env = process.env.LOG_LEVEL as LogLevel | undefined;
  if (env && env in LEVELS) return LEVELS[env];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
}

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: LogLevel, context: string, message: string): string {
  return `${timestamp()} [${level.toUpperCase()}] [${context}] ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= currentLevel();
}

export function createLogger(context: string) {
  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog("debug")) console.debug(format("debug", context, message), ...args);
    },
    info(message: string, ...args: unknown[]): void {
      if (shouldLog("info")) console.info(format("info", context, message), ...args);
    },
    warn(message: string, ...args: unknown[]): void {
      if (shouldLog("warn")) console.warn(format("warn", context, message), ...args);
    },
    error(message: string, ...args: unknown[]): void {
      if (shouldLog("error")) console.error(format("error", context, message), ...args);
    },
  };
}

/** Default root logger for use outside a specific context. */
export const logger = createLogger("app");
