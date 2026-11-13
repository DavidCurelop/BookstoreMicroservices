import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Variables compiled into the application: required for every build, so a
// missing value fails here instead of breaking the app in the browser.
const APP_VARIABLES = Object.freeze([
  "VITE_API_BASE_URL",
  "VITE_API_PREFIX",
  "VITE_CURRENCY_LOCALE",
  "VITE_CURRENCY_CODE",
]);

const requireEnv = (env, name) => {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required Vite environment variable: ${name}`);
  }

  return value;
};

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), "");

  APP_VARIABLES.forEach((name) => requireEnv(env, name));

  const apiPrefix = requireEnv(env, "VITE_API_PREFIX");

  if (!apiPrefix.startsWith("/")) {
    throw new Error("VITE_API_PREFIX must start with '/'");
  }

  const config = {
    base: "/",
    plugins: [react()],
  };

  // Only the development server (npm run dev) uses VITE_DEV_* variables.
  if (command === "serve" && !isPreview) {
    const devServerPort = Number.parseInt(
      requireEnv(env, "VITE_DEV_SERVER_PORT"),
      10
    );

    if (!Number.isInteger(devServerPort) || devServerPort <= 0) {
      throw new Error("VITE_DEV_SERVER_PORT must be a positive integer");
    }

    config.server = {
      port: devServerPort,
      proxy: {
        [apiPrefix]: {
          target: requireEnv(env, "VITE_DEV_API_TARGET"),
          changeOrigin: true,
        },
      },
    };
  }

  return config;
});
