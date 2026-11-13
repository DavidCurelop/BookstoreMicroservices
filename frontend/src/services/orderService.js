import { orderEndpoints } from "../config/endpoints.js";
import { api } from "../lib/api.js";

const toOrderSummary = (raw) => ({
  id: raw.orderId,
  status: raw.status,
  totalAmount: Number(raw.totalAmount),
  totalQuantity: raw.totalQuantity,
  orderTimestamp: raw.orderTimestamp,
});

const toOrderItem = (raw) => ({
  id: raw.orderItemId,
  bookId: raw.bookId,
  isbn: raw.isbn,
  title: raw.title,
  author: raw.author,
  quantity: raw.quantity,
  unitPrice: Number(raw.unitPrice),
  lineTotal: Number(raw.lineTotal),
});

const toOrderDetail = (raw) => ({
  ...toOrderSummary(raw),
  items: raw.items.map(toOrderItem),
});

export const orderService = Object.freeze({
  list: async () => {
    const { data } = await api.get(orderEndpoints.list);
    return data.orders.map(toOrderSummary);
  },

  getById: async (orderId) => {
    const { data } = await api.get(orderEndpoints.detail(orderId));
    return toOrderDetail(data.order);
  },

  create: async (cartItems) => {
    const { data } = await api.post(orderEndpoints.create, {
      items: cartItems.map((item) => ({
        book_id: item.bookId,
        quantity: item.quantity,
      })),
    });

    return toOrderSummary(data.order);
  },
});
