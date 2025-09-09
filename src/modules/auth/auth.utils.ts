import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

// JWT Payload Interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: "super_admin" | "admin" | "delivery_user" | "organization_admin";
  organizationId?: string;
}

// Token Response Interface
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// JWT Configuration
const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES: jwt.SignOptions["expiresIn"] =
  env.ACCESS_TOKEN_EXPIRES;
const REFRESH_TOKEN_EXPIRES: jwt.SignOptions["expiresIn"] =
  env.REFRESH_TOKEN_EXPIRES;

export class AuthUtils {
  // Generate Access Token
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
      issuer: "geotrack-api",
    });
  }

  // Generate Refresh Token
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES,
      issuer: "geotrack-api",
    });
  }

  // Generate Both Tokens
  static generateTokens(payload: JWTPayload): TokenResponse {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 * 1000, // 15 minutes in milliseconds
    };
  }

  // Verify Access Token
  static verifyAccessToken(token: string): JWTPayload {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    if (typeof decoded === "string") throw new Error("Invalid token payload");
    return decoded as JWTPayload;
  }

  // Verify Refresh Token
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  // Hash Password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare Password
  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate Reset Token
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Generate Reset Token Expiry (1 hour from now)
  static generateResetTokenExpiry(): Date {
    return new Date(Date.now() + 3600000); // 1 hour
  }

  // Extract Token from Header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Get Role-based Dashboard URL
  static getDashboardUrl(role: JWTPayload["role"]): string {
    const dashboardUrls = {
      super_admin: "/super-admin/dashboard",
      admin: "/admin/dashboard",
      delivery_user: "/delivery/dashboard",
      organization_admin: "/organization-admin/dashboard",
    };

    return dashboardUrls[role as keyof typeof dashboardUrls] || "/login";
  }

  // Validate Password Strength
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
