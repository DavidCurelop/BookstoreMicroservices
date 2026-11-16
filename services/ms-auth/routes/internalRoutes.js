import express from "express";

import { getCustomer } from "../controllers/internalController.js";

const router = express.Router();

router.get("/customers/:customerId", getCustomer);

export default router;
