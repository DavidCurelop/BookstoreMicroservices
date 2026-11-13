import { useMemo, useState } from "react";

import { useAuth } from "../hooks/useAuth.js";
import {
  trackAddToCart,
  trackQuantityChanged,
  trackRemoveFromCart,
} from "../lib/cartAnalytics.js";
import { CartContext } from "./contexts.js";

const EMPTY_ITEMS = Object.freeze([]);

const normalizePositiveInteger = (value, maximum) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return 0;
  }

  return Math.min(parsedValue, maximum);
};

const toCartItem = (book, quantity) => ({
  bookId: book.id,
  isbn: book.isbn,
  title: book.title,
  price: book.price,
  image: book.image,
  stock: book.stock,
  quantity,
});

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const ownerId = user?.id ?? null;

  // The cart belongs to the signed-in customer; when the customer changes,
  // the previous items are simply ignored instead of reset in an effect.
  const [cart, setCart] = useState({ ownerId, items: EMPTY_ITEMS });
  const items = cart.ownerId === ownerId ? cart.items : EMPTY_ITEMS;

  const updateItems = (updater) => {
    setCart((currentCart) => ({
      ownerId,
      items: updater(
        currentCart.ownerId === ownerId ? currentCart.items : EMPTY_ITEMS
      ),
    }));
  };

  const addItem = (book, requestedQuantity = 1) => {
    if (!user) {
      return 0;
    }

    const existingItem = items.find((item) => item.bookId === book.id);
    const currentQuantity = existingItem?.quantity ?? 0;
    const availableQuantity = Math.max(0, book.stock - currentQuantity);
    const quantityToAdd = normalizePositiveInteger(
      requestedQuantity,
      availableQuantity
    );

    if (quantityToAdd === 0) {
      return 0;
    }

    updateItems((currentItems) => {
      const currentItem = currentItems.find((item) => item.bookId === book.id);

      if (!currentItem) {
        return [...currentItems, toCartItem(book, quantityToAdd)];
      }

      return currentItems.map((item) =>
        item.bookId === book.id
          ? { ...item, quantity: item.quantity + quantityToAdd }
          : item
      );
    });

    trackAddToCart(toCartItem(book, quantityToAdd), quantityToAdd);

    return quantityToAdd;
  };

  const updateQuantity = (bookId, requestedQuantity) => {
    const item = items.find((cartItem) => cartItem.bookId === bookId);

    if (!item) {
      return;
    }

    const quantity = normalizePositiveInteger(requestedQuantity, item.stock);

    if (quantity === 0 || quantity === item.quantity) {
      return;
    }

    updateItems((currentItems) =>
      currentItems.map((cartItem) =>
        cartItem.bookId === bookId ? { ...cartItem, quantity } : cartItem
      )
    );

    trackQuantityChanged(item, quantity);
  };

  const removeItem = (bookId) => {
    const item = items.find((cartItem) => cartItem.bookId === bookId);

    if (!item) {
      return;
    }

    updateItems((currentItems) =>
      currentItems.filter((cartItem) => cartItem.bookId !== bookId)
    );

    trackRemoveFromCart(item);
  };

  const clearCart = () => {
    updateItems(() => EMPTY_ITEMS);
  };

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
