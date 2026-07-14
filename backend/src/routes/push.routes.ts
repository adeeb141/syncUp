import { Router } from "express";

import { requireAuth } from "../middlewares/requireAuth";

import {
  savePushSubscription,
  removePushSubscription,
} from "../controllers/push.controller";

const router = Router();

router.post(
  "/subscribe",
  requireAuth,
  savePushSubscription
);

router.post(
  "/unsubscribe",
  requireAuth,
  removePushSubscription
);

export default router;