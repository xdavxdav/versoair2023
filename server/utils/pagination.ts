/**
 * Pagination Utilities
 * Provides cursor-based pagination (preferred over offset for large datasets)
 * and offset-based pagination (simpler, for smaller datasets)
 */

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string;
  limit: number;
  hasMore: boolean;
}

/**
 * Validate and normalize pagination params
 * Prevents unbounded queries and DoS attacks
 */
export function validatePaginationParams(
  limit?: number | string,
  offset?: number | string,
): { limit: number; offset: number } {
  let parsedLimit = typeof limit === "string" ? parseInt(limit, 10) : limit || 20;
  let parsedOffset = typeof offset === "string" ? parseInt(offset, 10) : offset || 0;

  // Clamp to reasonable limits
  parsedLimit = Math.min(Math.max(1, parsedLimit), 100); // 1-100 items per page
  parsedOffset = Math.max(0, parsedOffset); // Can't be negative

  return { limit: parsedLimit, offset: parsedOffset };
}

/**
 * Format SQL LIMIT and OFFSET for database queries
 */
export function formatPaginationSql(
  limit: number,
  offset: number,
): { limit: number; offset: number } {
  return {
    limit: Math.min(limit + 1, 101), // Fetch one extra to detect hasMore
    offset,
  };
}

/**
 * Determine if there are more results (cursor handling)
 * If we requested N+1 items but got N+1, there are more
 */
export function hasMoreResults<T>(
  results: T[],
  requestedLimit: number,
): boolean {
  return results.length > requestedLimit;
}

/**
 * Trim excess result and prepare cursor response
 */
export function preparePaginatedResponse<T extends { id?: string | number }>(
  results: T[],
  requestedLimit: number,
): CursorPaginatedResponse<T> {
  const hasMore = results.length > requestedLimit;
  const trimmedResults = results.slice(0, requestedLimit);

  return {
    data: trimmedResults,
    limit: requestedLimit,
    hasMore,
    // Cursor is the ID of the last item (client sends this as "after" param next time)
    cursor: hasMore ? String(trimmedResults[trimmedResults.length - 1]?.id) : undefined,
  };
}

/**
 * Recommended: Use cursor-based pagination for infinite scroll / large datasets
 * Example in route:
 *
 * router.get("/api/messages", async (req, res) => {
 *   const { limit, cursor } = req.query;
 *   const { limit: pageSize } = validatePaginationParams(limit);
 *   const { limit: dbLimit, offset } = formatPaginationSql(pageSize, 0);
 *
 *   const messages = await db
 *     .select()
 *     .from(schema.messages)
 *     .where(cursor ? gt(schema.messages.id, cursor) : undefined)
 *     .limit(dbLimit);
 *
 *   return res.json(preparePaginatedResponse(messages, pageSize));
 * });
 */

/**
 * Alternative: Offset-based pagination (simpler, for small datasets)
 * Example in route:
 *
 * router.get("/api/items", async (req, res) => {
 *   const { limit, offset } = validatePaginationParams(req.query.limit, req.query.offset);
 *   const { limit: dbLimit, offset: dbOffset } = formatPaginationSql(limit, offset);
 *
 *   const items = await db
 *     .select()
 *     .from(schema.items)
 *     .limit(dbLimit)
 *     .offset(dbOffset);
 *
 *   const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM items`);
 *   const total = (totalResult.rows?.[0] as any)?.count || 0;
 *
 *   return res.json({
 *     data: items.slice(0, limit),
 *     total,
 *     limit,
 *     offset,
 *     hasMore: offset + limit < total,
 *   });
 * });
 */
