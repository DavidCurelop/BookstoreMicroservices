import { jwtVerify } from "jose";

import { config } from "../config/env.js";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const secretKey = new TextEncoder().encode(config.auth.jwt.secret);

// Local JWT validation (shared AUTH_JWT_SECRET). ms-orders never issues tokens.
export const verifySessionToken = async (token) => {
  const { payload } = await jwtVerify(token, secretKey, {
    issuer: config.auth.jwt.issuer,
    audience: config.auth.jwt.audience,
    algorithms: [config.auth.jwt.algorithm],
  });

  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    !UUID_PATTERN.test(payload.sub) ||
    !UUID_PATTERN.test(payload.sid)
  ) {
    throw new Error("Session token is missing valid identity claims");
  }

  return {
    customerId: payload.sub,
    sessionId: payload.sid,
  };
};
