import { Router } from "express";
import adminRouter from "./admin";
import connectionsRouter from "./connections";
import subscriptionRouter from "./subscription";

const router = Router();

// Version-specific routes
router.use("/admin", adminRouter);
router.use("/connections", connectionsRouter);
router.use("/subscription", subscriptionRouter);

// TODO: Add public and private routes as they're created
// router.use('/public', publicRouter);
// router.use('/private', privateRouter);

export default router;
