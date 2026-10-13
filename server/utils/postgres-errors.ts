export interface PostgresErrorDetails {
  code: string;
  message: string;
  constraint?: string;
  table?: string;
  column?: string;
}

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  constraint?: unknown;
  table?: unknown;
  column?: unknown;
  cause?: unknown;
};

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null;
}

export function getPostgresErrorDetails(
  error: unknown,
): PostgresErrorDetails | null {
  const visited = new Set<unknown>();
  let current: unknown = error;

  for (let depth = 0; depth < 6 && isErrorLike(current); depth += 1) {
    if (visited.has(current)) break;
    visited.add(current);

    if (typeof current.code === "string" && /^\d{5}$/.test(current.code)) {
      const details: PostgresErrorDetails = {
        code: current.code,
        message:
          typeof current.message === "string"
            ? current.message
            : "PostgreSQL query failed",
      };

      if (typeof current.constraint === "string") {
        details.constraint = current.constraint;
      }
      if (typeof current.table === "string") details.table = current.table;
      if (typeof current.column === "string") details.column = current.column;

      return details;
    }

    current = current.cause;
  }

  return null;
}

export function isUniqueConstraintViolation(
  error: unknown,
  constraint?: string | readonly string[],
): boolean {
  const details = getPostgresErrorDetails(error);
  return (
    details?.code === "23505" &&
    (constraint === undefined ||
      (typeof constraint === "string"
        ? details.constraint === constraint
        : constraint.includes(details.constraint ?? "")))
  );
}

export function isTransientDatabaseError(error: unknown): boolean {
  const details = getPostgresErrorDetails(error);
  if (details?.code.startsWith("08")) return true;
  if (details?.code === "40001" || details?.code === "40P01") return true;

  const visited = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 6 && isErrorLike(current); depth += 1) {
    if (visited.has(current)) break;
    visited.add(current);
    if (
      typeof current.code === "string" &&
      ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE"].includes(
        current.code,
      )
    ) {
      return true;
    }
    current = current.cause;
  }

  return false;
}
