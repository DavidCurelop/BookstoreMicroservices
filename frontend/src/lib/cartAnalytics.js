import { eventEndpoints } from "../config/endpoints.js";
import { behaviorEventTypes, resourceTypes } from "../config/events.js";
import { api } from "./api.js";

// Analytics must never break the shopping flow: failures are only logged.
const sendEvent = async (event) => {
  try {
    await api.post(eventEndpoints.create, event);
  } catch (error) {
    console.error("Unable to record behavioral event", error);
  }
};

const bookEvent = (eventType, item, quantity) => ({
  event_type: eventType,
  resource_type: resourceTypes.book,
  resource_id: item.bookId,
  isbn: item.isbn,
  quantity,
});

export const trackAddToCart = (item, quantity) => {
  void sendEvent(bookEvent(behaviorEventTypes.addToCart, item, quantity));
};

export const trackRemoveFromCart = (item) => {
  void sendEvent(
    bookEvent(behaviorEventTypes.removeFromCart, item, item.quantity)
  );
};

export const trackQuantityChanged = (item, quantity) => {
  void sendEvent(
    bookEvent(behaviorEventTypes.cartQuantityChanged, item, quantity)
  );
};

export const trackCheckoutStarted = (totalQuantity) => {
  void sendEvent({
    event_type: behaviorEventTypes.checkoutStarted,
    quantity: totalQuantity,
  });
};
