import express from "express";

import {
  postReleaseStock,
  postReserveStock,
} from "../controllers/internalController.js";

const router = express.Router();

router.post("/books/reserve-stock", postReserveStock);
router.post("/books/release-stock", postReleaseStock);

export default router;
