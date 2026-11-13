import { frontendConfig } from "./env.js";

const booksBasePath = `${frontendConfig.apiPrefix}/books`;
const authBasePath = `${frontendConfig.apiPrefix}/auth`;
const eventsBasePath = `${frontendConfig.apiPrefix}/events`;
const ordersBasePath = `${frontendConfig.apiPrefix}/orders`;

export const bookEndpoints = Object.freeze({
  list: booksBasePath,
  detail: (isbn) => `${booksBasePath}/${encodeURIComponent(isbn)}`,
});

export const authEndpoints = Object.freeze({
  login: `${authBasePath}/login`,
  me: `${authBasePath}/me`,
  logout: `${authBasePath}/logout`,
});

export const eventEndpoints = Object.freeze({
  create: eventsBasePath,
});

export const orderEndpoints = Object.freeze({
  list: ordersBasePath,
  detail: (orderId) => `${ordersBasePath}/${encodeURIComponent(orderId)}`,
  create: ordersBasePath,
});
