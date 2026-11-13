import { frontendConfig } from "../config/env.js";

const dateFormatter = new Intl.DateTimeFormat(
  frontendConfig.currency.locale,
  {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }
);

export const formatDate = (value) => dateFormatter.format(new Date(value));
