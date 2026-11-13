const DEFAULT_MESSAGE = "Ocurrió un error inesperado. Intenta nuevamente.";
const NETWORK_MESSAGE = "No fue posible conectar con el servidor.";

export class ApiError extends Error {
  constructor({ status, code, message }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const normalizeApiError = (error) => {
  if (error instanceof ApiError) {
    return error;
  }

  if (!error.response) {
    return new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: NETWORK_MESSAGE,
    });
  }

  const { status, data } = error.response;

  return new ApiError({
    status,
    code: data?.error?.code ?? "UNKNOWN_ERROR",
    message:
      status < 500 && data?.error?.message
        ? data.error.message
        : DEFAULT_MESSAGE,
  });
};

export const isRetryableError = (error) =>
  !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
