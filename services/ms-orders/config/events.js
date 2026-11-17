// Subset of backend/config/events.js: only what ms-orders emits.
export const EVENT_SCHEMA_VERSION = 1;

export const EVENT_SOURCES = Object.freeze({
  HTTP: "http",
});

export const EVENT_TYPES = Object.freeze({
  PURCHASE: "purchase",
});

export const RESOURCE_TYPES = Object.freeze({
  ORDER: "order",
});
