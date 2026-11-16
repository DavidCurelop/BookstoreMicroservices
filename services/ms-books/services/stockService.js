import { withTransaction } from "../config/database.js";
import { AppError } from "../errors/AppError.js";
import {
  decreaseBookStock,
  findBooksByIdsForUpdate,
  increaseBookStock,
} from "../repositories/bookRepository.js";

// Same ordering used by backend/services/orderService.js. Locking rows always
// in book_id order prevents deadlocks between concurrent reservations.
const byBookId = (left, right) => left.bookId.localeCompare(right.bookId);

export const reserveStock = async (items) =>
  withTransaction(async (client) => {
    const orderedItems = [...items].sort(byBookId);
    const books = await findBooksByIdsForUpdate(
      orderedItems.map((item) => item.bookId),
      client
    );

    if (books.length !== orderedItems.length) {
      throw new AppError(
        "One or more books are no longer available",
        409,
        "BOOK_UNAVAILABLE"
      );
    }

    const booksById = new Map(books.map((book) => [book.book_id, book]));

    // Validate everything first so a failure never leaves a partial decrement.
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

    for (const item of orderedItems) {
      const book = booksById.get(item.bookId);
      const updatedBook = await decreaseBookStock(item, client);

      if (!updatedBook) {
        throw new AppError(
          `Insufficient stock for ${book.title}`,
          409,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    return orderedItems.map((item) => {
      const book = booksById.get(item.bookId);

      return {
        book_id: book.book_id,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        quantity: item.quantity,
        unit_price: book.price,
      };
    });
  });

export const releaseStock = async (items) =>
  withTransaction(async (client) => {
    const orderedItems = [...items].sort(byBookId);
    const released = [];

    for (const item of orderedItems) {
      const updatedBook = await increaseBookStock(item, client);

      if (!updatedBook) {
        throw new AppError("Book not found", 404, "BOOK_NOT_FOUND");
      }

      released.push({
        book_id: item.bookId,
        quantity: item.quantity,
        stock: updatedBook.stock,
      });
    }

    return released;
  });
