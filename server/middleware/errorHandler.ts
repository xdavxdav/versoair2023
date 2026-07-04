import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";

const log = createLogger("errorHandler");

/**
 * Global error handling middleware
 * Must be registered LAST in Express app
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  log.error("Unhandled request error:", err);

  // Database errors
  if (err.code?.startsWith("42")) {
    return res.status(500).json({
      success: false,
      status: 500,
      error: {
        code: "DATABASE_ERROR",
        message: "A database error occurred",
        ...(process.env.NODE_ENV === "development" && {
          details: err.message,
        }),
      },
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      status: 401,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid token",
      },
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      status: 401,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      },
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      status: 400,
      error: {
        code: "VALIDATION_ERROR",
        message: err.message,
      },
    });
  }

  // Generic error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    error: {
      code: "INTERNAL_ERROR",
      message,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
      }),
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.status(404).json({
    success: false,
    status: 404,
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
}
