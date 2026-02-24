/**
 * Query Security Utilities
 * Validate and sanitize database queries to prevent malicious operations
 */

export interface QueryValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * List of dangerous SQL keywords that should trigger warnings
 */
const DANGEROUS_KEYWORDS = [
  "DROP DATABASE",
  "DROP TABLE",
  "DELETE FROM",
  "TRUNCATE",
  "ALTER TABLE",
  "CREATE USER",
  "GRANT",
  "REVOKE",
];

/**
 * List of suspicious patterns
 */
const SUSPICIOUS_PATTERNS = [
  /--\s*;/, // Comment injection
  /\/\*.*\*\//m, // Multi-line comment injection
  /;\s*DROP/i, // Chained DROP commands
  /;\s*DELETE/i, // Chained DELETE commands
];

/**
 * Validate a SQL query for security concerns
 */
export const validateQuery = (query: string): QueryValidationResult => {
  const result: QueryValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
  };

  if (!query || query.trim().length === 0) {
    result.isValid = false;
    result.errors.push("Query cannot be empty");
    return result;
  }

  const upperQuery = query.toUpperCase();

  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      result.isValid = false;
      result.errors.push(
        `Potentially dangerous operation detected: ${keyword}. This operation is not permitted.`,
      );
    }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(query)) {
      result.isValid = false;
      result.errors.push(
        "Suspicious SQL pattern detected. Possible injection attempt.",
      );
    }
  }

  // Warnings for read-only queries without limits
  if (
    upperQuery.startsWith("SELECT") &&
    !upperQuery.includes("LIMIT") &&
    query.length > 1000
  ) {
    result.warnings.push(
      "Large SELECT query without LIMIT clause may return excessive results",
    );
  }

  // Warning for bulk operations
  if (
    (upperQuery.includes("UPDATE") || upperQuery.includes("DELETE")) &&
    !upperQuery.includes("WHERE")
  ) {
    result.warnings.push(
      "This query will affect all records without a WHERE clause",
    );
  }

  return result;
};

/**
 * Sanitize query for logging (remove sensitive data)
 */
export const sanitizeQueryForLogging = (query: string): string => {
  return query
    .replace(/password\s*=\s*['"][^'"]*['"]/gi, "password=***")
    .replace(/token\s*=\s*['"][^'"]*['"]/gi, "token=***")
    .substring(0, 500); // Limit logged query length
};

/**
 * Extract table names from a query
 */
export const extractTableNames = (query: string): string[] => {
  const fromMatch = query.match(/FROM\s+(\w+)/gi);
  const joinMatch = query.match(/JOIN\s+(\w+)/gi);
  const updateMatch = query.match(/UPDATE\s+(\w+)/gi);

  const tables = new Set<string>();

  if (fromMatch) {
    fromMatch.forEach((match) => {
      const table = match.replace(/FROM|JOIN|UPDATE/gi, "").trim();
      if (table) tables.add(table);
    });
  }

  return Array.from(tables);
};
