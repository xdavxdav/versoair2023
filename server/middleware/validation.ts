import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Generic validation middleware for request body, query, or params
 * @param schema - Zod schema to validate against
 * @param source - Where to validate from: 'body' | 'query' | 'params'
 */
export function validateInput(
  schema: z.ZodSchema,
  source: "body" | "query" | "params" = "body",
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        return res.status(400).json({
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: errors,
          },
        });
      }

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request format",
        },
      });
    }
  };
}

/**
 * Middleware to validate pagination query parameters
 */
export function validatePagination(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { page = "1", limit = "20" } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      status: 400,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid page number",
        details: [{ field: "page", message: "Must be a positive integer" }],
      },
    });
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      status: 400,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid limit",
        details: [
          {
            field: "limit",
            message: "Must be between 1 and 100",
          },
        ],
      },
    });
  }

  // Attach validated values to request
  (req as any).pagination = { page: pageNum, limit: limitNum };
  next();
}
