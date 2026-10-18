import type { RequestParamHandler } from "express";

/** Reject invalid PostgreSQL serial IDs before they reach a database query. */
export const numericRouteParam: RequestParamHandler = (_req, res, next, value) => {
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    res.status(404).json({ success: false, error: "Not found" });
    return;
  }
  next();
};
