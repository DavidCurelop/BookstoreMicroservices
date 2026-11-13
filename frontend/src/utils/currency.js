import { frontendConfig } from "../config/env.js";

const currencyFormatter = new Intl.NumberFormat(
  frontendConfig.currency.locale,
  {
    style: "currency",
    currency: frontendConfig.currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }
);

export const formatCurrency = (value) => currencyFormatter.format(Number(value));
