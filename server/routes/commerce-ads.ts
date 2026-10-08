import { Router, Request, Response } from "express";

const router = Router();

function unavailable(_req: Request, res: Response) {
  return res.status(503).json({
    success: false,
    error:
      "Advertising products and campaign analytics are not currently available.",
    code: "ADVERTISING_UNAVAILABLE",
  });
}

router.get("/ads/search", unavailable);
router.get("/analytics", unavailable);

export default router;
