// Subset of backend/config/events.js: only what ms-books emits.
export const EVENT_SCHEMA_VERSION = 1;

export const EVENT_SOURCES = Object.freeze({
  HTTP: "http",
});

export const EVENT_TYPES = Object.freeze({
  CATALOG_VIEW: "catalog_view",
  BOOK_VIEW: "book_view",
});

export const RESOURCE_TYPES = Object.freeze({
  BOOK: "book",
  CATALOG: "catalog",
});
