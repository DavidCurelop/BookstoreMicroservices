// Subset of backend/config/events.js: only what ms-auth emits.
export const EVENT_SCHEMA_VERSION = 1;

export const EVENT_SOURCES = Object.freeze({
  HTTP: "http",
});

export const EVENT_TYPES = Object.freeze({
  LOGIN: "login",
  LOGOUT: "logout",
});

export const RESOURCE_TYPES = Object.freeze({
  CUSTOMER: "customer",
});
