import type { RequestParamHandler } from "express";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reject malformed UUID ids before they reach a database query. */
export const uuidRouteParam: RequestParamHandler = (
  _req,
  res,
  next,
  value,
) => {
  if (!UUID.test(value)) {
    res.status(404).json({ success: false, error: "Not found" });
    return;
  }
  next();
};
