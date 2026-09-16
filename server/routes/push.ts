// GET  /api/push/vapid-public-key — public key for client-side subscribe()
// POST /api/push/subscribe        — save a browser push subscription for the current user
// POST /api/push/unsubscribe      — remove a subscription (by endpoint)
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  getVapidPublicKey,
  isPushConfigured,
  saveSubscription,
  removeSubscription,
} from "../services/push-service";

const router = Router();

router.get("/vapid-public-key", requireAuth(), (_req, res) => {
  res.json({ configured: isPushConfigured(), publicKey: getVapidPublicKey() });
});

router.post(
  "/subscribe",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body?.subscription || req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid push subscription" });
    }
    const userId = parseInt(req.user!.userId);
    await saveSubscription(userId, { endpoint, keys });
    res.json({ success: true });
  }),
);

router.post(
  "/unsubscribe",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res
        .status(400)
        .json({ success: false, message: "Missing endpoint" });
    }
    await removeSubscription(endpoint);
    res.json({ success: true });
  }),
);

export default router;
