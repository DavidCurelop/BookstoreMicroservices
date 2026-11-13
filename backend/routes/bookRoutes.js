import express from "express";
import { getBookByIsbn, getBooks } from "../controllers/bookController.js";

const router = express.Router();

router.get("/", getBooks);
router.get("/:isbn", getBookByIsbn);

export default router;
