import { withTransaction } from "../config/database.js";
import { ORDER_STATUSES } from "../config/orders.js";
import { logger } from "../config/logger.js";
import { AppError } from "../errors/AppError.js";
import {
  createOrderItem,
  createOrderRecord,
  recalculateOrderTotal,
} from "../repositories/orderRepository.js";
import {
  findActiveCustomer,
  releaseStock,
  reserveStock,
} from "./internalClients.js";

const persistOrder = ({ customerId, lines }) =>
  withTransaction(async (client) => {
    const order = await createOrderRecord(
      { customerId, orderStatus: ORDER_STATUSES.PLACED },
      client
    );

    // Immutable snapshot (isbn, title, author, unit_price) returned by ms-books
    for (const line of lines) {
      await createOrderItem(
        {
          orderId: order.order_id,
          bookId: line.book_id,
          isbn: line.isbn,
          title: line.title,
          author: line.author,
          quantity: line.quantity,
          unitPrice: line.unit_price,
        },
        client
      );
    }

    return recalculateOrderTotal(order.order_id, client);
  });

// Saga: verify customer (ms-auth) -> reserve stock (ms-books) -> save order.
// If saving fails, the reserved stock is released (compensation).
export const placeOrder = async ({ customerId, items }) => {
  const customer = await findActiveCustomer(customerId);

  if (!customer) {
    throw new AppError(
      "The authenticated customer no longer exists",
      401,
      "INVALID_SESSION"
    );
  }

  const stockItems = items.map((item) => ({
    book_id: item.bookId,
    quantity: item.quantity,
  }));
  const lines = await reserveStock(stockItems);

  try {
    const placedOrder = await persistOrder({ customerId, lines });

    return {
      ...placedOrder,
      total_quantity: items.reduce((total, item) => total + item.quantity, 0),
    };
  } catch (error) {
    try {
      await releaseStock(stockItems);
    } catch (releaseError) {
      // The original error is still the one the client receives.
      logger.error("Stock compensation failed, manual reconciliation required", {
        customerId,
        items: stockItems,
        error: releaseError.message,
      });
    }

    throw error;
  }
};
