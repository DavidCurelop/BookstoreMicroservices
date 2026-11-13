import { withTransaction } from "../config/database.js";
import { ORDER_STATUSES } from "../config/orders.js";
import { AppError } from "../errors/AppError.js";
import {
  decreaseBookStock,
  findBooksByIdsForUpdate,
} from "../repositories/bookRepository.js";
import { findCustomerById } from "../repositories/customerRepository.js";
import {
  createOrderItem,
  createOrderRecord,
  recalculateOrderTotal,
} from "../repositories/orderRepository.js";

const byBookId = (left, right) => left.bookId.localeCompare(right.bookId);

export const placeOrder = async ({ customerId, items }) =>
  withTransaction(async (client) => {
    const customer = await findCustomerById(customerId, client);

    if (!customer) {
      throw new AppError(
        "The authenticated customer no longer exists",
        401,
        "INVALID_SESSION"
      );
    }

    const orderedItems = [...items].sort(byBookId);
    const bookIds = orderedItems.map((item) => item.bookId);
    const books = await findBooksByIdsForUpdate(bookIds, client);

    if (books.length !== orderedItems.length) {
      throw new AppError(
        "One or more books are no longer available",
        409,
        "BOOK_UNAVAILABLE"
      );
    }

    const booksById = new Map(books.map((book) => [book.book_id, book]));

    for (const item of orderedItems) {
      const book = booksById.get(item.bookId);

      if (!book) {
        throw new AppError(
          "One or more books are no longer available",
          409,
          "BOOK_UNAVAILABLE"
        );
      }

      if (book.stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${book.title}`,
          409,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    const order = await createOrderRecord(
      {
        customerId,
        orderStatus: ORDER_STATUSES.PLACED,
      },
      client
    );

    for (const item of orderedItems) {
      const book = booksById.get(item.bookId);

      await createOrderItem(
        {
          orderId: order.order_id,
          bookId: book.book_id,
          quantity: item.quantity,
          unitPrice: book.price,
        },
        client
      );

      const updatedBook = await decreaseBookStock(
        {
          bookId: book.book_id,
          quantity: item.quantity,
        },
        client
      );

      if (!updatedBook) {
        throw new AppError(
          `Insufficient stock for ${book.title}`,
          409,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    const placedOrder = await recalculateOrderTotal(order.order_id, client);
    const totalQuantity = orderedItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    return {
      ...placedOrder,
      total_quantity: totalQuantity,
    };
  });
