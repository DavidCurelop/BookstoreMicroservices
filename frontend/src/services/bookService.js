import { bookEndpoints } from "../config/endpoints.js";
import { api } from "../lib/api.js";

const toBook = (raw) => ({
  id: raw.book_id,
  isbn: raw.isbn,
  title: raw.title,
  author: raw.author,
  description: raw.description,
  category: raw.category,
  publisher: raw.publisher,
  publicationYear: raw.publication_year,
  price: Number(raw.price),
  stock: raw.stock,
  image: raw.image,
});

export const bookService = Object.freeze({
  list: async () => {
    const { data } = await api.get(bookEndpoints.list);
    return data.map(toBook);
  },

  getByIsbn: async (isbn) => {
    const { data } = await api.get(bookEndpoints.detail(isbn));
    return toBook(data);
  },
});
