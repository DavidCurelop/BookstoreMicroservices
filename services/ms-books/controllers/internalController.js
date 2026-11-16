import { config } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { releaseStock, reserveStock } from "../services/stockService.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Same item shape as POST /api/orders: [{ book_id, quantity }]
const normalizeItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError("items must be a non-empty array", 400, "INVALID_STOCK_REQUEST");
  }

  if (rawItems.length > config.books.maxItemsPerRequest) {
    throw new AppError(
      `items cannot contain more than ${config.books.maxItemsPerRequest} books`,
      400,
      "INVALID_STOCK_REQUEST"
    );
  }

  const seenBookIds = new Set();

  return rawItems.map((rawItem) => {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      throw new AppError("Every item is invalid", 400, "INVALID_STOCK_REQUEST");
    }

    const bookId =
      typeof rawItem.book_id === "string" ? rawItem.book_id.trim().toLowerCase() : "";

    if (!UUID_PATTERN.test(bookId)) {
      throw new AppError("book_id is invalid", 400, "INVALID_STOCK_REQUEST");
    }

    if (seenBookIds.has(bookId)) {
      throw new AppError("The same book cannot appear more than once", 400, "INVALID_STOCK_REQUEST");
    }

    seenBookIds.add(bookId);

    if (
      !Number.isInteger(rawItem.quantity) ||
      rawItem.quantity <= 0 ||
      rawItem.quantity > config.books.maxQuantityPerItem
    ) {
      throw new AppError(
        `quantity must be an integer between 1 and ${config.books.maxQuantityPerItem}`,
        400,
        "INVALID_STOCK_REQUEST"
      );
    }

    return { bookId, quantity: rawItem.quantity };
  });
};

// Cluster-internal only: called by ms-orders. 200 with the reserved lines
// (price + isbn/title/author snapshot), 409 BOOK_UNAVAILABLE / INSUFFICIENT_STOCK.
export const postReserveStock = async (req, res) => {
  const items = await reserveStock(normalizeItems(req.body?.items));

  res.set("Cache-Control", "no-store");
  res.status(200).json({ items });
};

// Compensation when ms-orders fails to persist the order after reserving.
export const postReleaseStock = async (req, res) => {
  const items = await releaseStock(normalizeItems(req.body?.items));

  res.set("Cache-Control", "no-store");
  res.status(200).json({ items });
};
