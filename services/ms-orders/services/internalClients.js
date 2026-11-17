import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../errors/AppError.js";

// Thin fetch wrappers for the cluster-internal APIs of ms-auth and ms-books.

const callService = async (serviceName, url, options = {}) => {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(config.services.timeoutMs),
    });
  } catch (error) {
    logger.error("Internal service call failed", {
      service: serviceName,
      url,
      error: error.message,
    });
    throw new AppError(`${serviceName} is unavailable`, 503, "SERVICE_UNAVAILABLE");
  }

  const body = await response.json().catch(() => null);
  return { status: response.status, body };
};

const unexpectedResponse = (serviceName, status) => {
  logger.error("Unexpected internal service response", { service: serviceName, status });
  return new AppError(`${serviceName} returned an unexpected response`, 502, "BAD_GATEWAY");
};

// Returns the customer, or null when ms-auth does not know it / it is deleted.
export const findActiveCustomer = async (customerId) => {
  const { status, body } = await callService(
    "ms-auth",
    `${config.services.authUrl}/internal/customers/${encodeURIComponent(customerId)}`
  );

  if (status === 404) return null;
  if (status !== 200 || body?.status !== "active") {
    throw unexpectedResponse("ms-auth", status);
  }

  return body;
};

// Reserves stock and returns the lines with the isbn/title/author/unit_price snapshot.
// Business rejections from ms-books (409) are passed through to the client.
export const reserveStock = async (items) => {
  const { status, body } = await callService(
    "ms-books",
    `${config.services.booksUrl}/internal/books/reserve-stock`,
    { method: "POST", body: JSON.stringify({ items }) }
  );

  if (status === 200 && Array.isArray(body?.items)) return body.items;
  if (status === 409 && body?.error) {
    throw new AppError(body.error.message, 409, body.error.code);
  }

  throw unexpectedResponse("ms-books", status);
};

// Saga compensation: gives back the reserved stock.
export const releaseStock = async (items) => {
  const { status } = await callService(
    "ms-books",
    `${config.services.booksUrl}/internal/books/release-stock`,
    { method: "POST", body: JSON.stringify({ items }) }
  );

  if (status !== 200) {
    throw unexpectedResponse("ms-books", status);
  }
};
