import jwt from "jsonwebtoken";

const DEVELOPMENT_JWT_SECRET = "cloudcode_default_jwt_secret_dev_only";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function getJwtSecret() {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) return configuredSecret;

  // Keep local development convenient, but never silently use a predictable
  // secret in a deployed production environment.
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in the production environment");
  }

  return DEVELOPMENT_JWT_SECRET;
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function getCookieOptions() {
  const isSecure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false");
  const sameSite = process.env.COOKIE_SAMESITE || "lax";

  let maxAge = 7 * 24 * 60 * 60 * 1000;
  if (typeof JWT_EXPIRES_IN === "string") {
    if (JWT_EXPIRES_IN.endsWith("d")) {
      maxAge = parseInt(JWT_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000;
    } else if (JWT_EXPIRES_IN.endsWith("h")) {
      maxAge = parseInt(JWT_EXPIRES_IN, 10) * 60 * 60 * 1000;
    } else if (JWT_EXPIRES_IN.endsWith("m")) {
      maxAge = parseInt(JWT_EXPIRES_IN, 10) * 60 * 1000;
    }
  }

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: sameSite,
    maxAge: maxAge,
    path: "/",
  };
}

