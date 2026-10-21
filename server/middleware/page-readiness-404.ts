import type { RequestHandler } from "express";
import { isLocalPreviewOnlyPath } from "@shared/page-readiness";

export function pageReadinessNotFound(
  isProduction = process.env.NODE_ENV === "production",
): RequestHandler {
  return (req, res, next) => {
    if (
      isProduction &&
      ["GET", "HEAD"].includes(req.method) &&
      isLocalPreviewOnlyPath(req.path)
    ) {
      res.set("Cache-Control", "no-store");
      res.status(404).type("text/plain").send("Not Found");
      return;
    }
    next();
  };
}
