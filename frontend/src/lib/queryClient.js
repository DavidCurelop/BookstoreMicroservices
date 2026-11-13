import { QueryClient } from "@tanstack/react-query";

import { isRetryableError } from "./apiError.js";

const STALE_TIME_MS = 30_000;
const MAX_RETRIES = 1;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < MAX_RETRIES && isRetryableError(error),
    },
    mutations: {
      retry: false,
    },
  },
});
