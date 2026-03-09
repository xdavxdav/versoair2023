import { Router, raw } from "express";
import adminRouter from "./admin";
import connectionsRouter from "./connections";
import subscriptionRouter from "./subscription";
import emailSubscriptionsRouter from "./email-subscriptions";
import paymentsRouter from "./payments";
import referralRouter from "./referral";
import cardsRouter from "./cards";

const router = Router();

// Version-specific routes
router.use("/admin", adminRouter);
router.use("/connections", connectionsRouter);
router.use("/subscription", subscriptionRouter);
router.use("/email-subscriptions", emailSubscriptionsRouter);

// Payments — webhook needs raw body for Stripe signature verification
router.use("/payments/webhook", raw({ type: "application/json" }));
router.use("/payments", paymentsRouter);
router.use("/referral", referralRouter);

// Verso Air Card — Stripe Issuing + Points rewards
router.use("/cards/webhook/issuing", raw({ type: "application/json" }));
router.use("/cards", cardsRouter);

// TODO: Add public and private routes as they're created
// router.use('/public', publicRouter);
// router.use('/private', privateRouter);

export default router;
