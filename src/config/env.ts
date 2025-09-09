// env.ts
import "dotenv/config";
import type { SignOptions } from "jsonwebtoken";

function required(key: string, value?: string) {
  if (!value) throw new Error(`Missing env var ${key}`);
  return value;
}

export const env = {
  JWT_ACCESS_SECRET: required(
    "JWT_ACCESS_SECRET",
    process.env.JWT_ACCESS_SECRET
  ),
  JWT_REFRESH_SECRET: required(
    "JWT_REFRESH_SECRET",
    process.env.JWT_REFRESH_SECRET
  ),
  ACCESS_TOKEN_EXPIRES:
    (process.env.ACCESS_TOKEN_EXPIRES as SignOptions["expiresIn"]) ?? "15m",
  REFRESH_TOKEN_EXPIRES:
    (process.env.REFRESH_TOKEN_EXPIRES as SignOptions["expiresIn"]) ?? "7d",
  // optionally expose ms for consistency:
  ACCESS_TOKEN_EXPIRES_MS: Number(
    process.env.ACCESS_TOKEN_EXPIRES_MS ?? 15 * 60 * 1000
  ),
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
};
