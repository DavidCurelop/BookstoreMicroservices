import express from "express";

import { ingestEvents } from "../controllers/ingestController.js";
import { config } from "../config/env.js";

const router = express.Router();

// Sidecar batches are bigger than browser events, so this route has its own limit
router.post(
  "/events/ingest",
  express.json({ limit: config.ingest.bodyLimit }),
  ingestEvents
);

export default router;
