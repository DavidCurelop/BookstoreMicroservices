import { AppError } from "../errors/AppError.js";
import { findCustomerById } from "../repositories/customerRepository.js";
import { UUID_PATTERN } from "../services/authService.js";

// Internal cluster-only lookup used by ms-orders. 200 for an existing,
// non-deleted customer; 404 for unknown, deleted or malformed ids.
export const getCustomer = async (req, res) => {
  const { customerId } = req.params;
  const customer = UUID_PATTERN.test(customerId)
    ? await findCustomerById(customerId)
    : null;

  if (!customer) {
    throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }

  res.set("Cache-Control", "no-store");
  res.status(200).json({
    customerId: customer.customer_id,
    status: "active",
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email,
    city: customer.city,
    country: customer.country,
  });
};
