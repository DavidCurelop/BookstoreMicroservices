import axios from "axios";

import { frontendConfig } from "../config/env.js";
import { normalizeApiError } from "./apiError.js";

export const api = axios.create({
  baseURL: frontendConfig.apiBaseUrl,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
);
