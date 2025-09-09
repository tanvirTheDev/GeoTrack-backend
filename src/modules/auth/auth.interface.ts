import { Request } from "express";

// Auth Request Interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Auth Response Interfaces
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId?: string;
      organizationName?: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    dashboardUrl: string;
  };
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// Extended Request Interface for Authenticated Routes
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: "super_admin" | "admin" | "delivery_user" | "organization_admin";
    organizationId?: string;
  };
}

// User Role Enum
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  DELIVERY_USER = "delivery_user",
  ORGANIZATION_ADMIN = "organization_admin",
}

// Auth Error Types
export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

// Password Reset Token Interface
export interface PasswordResetToken {
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

// Refresh Token Interface
export interface RefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
}
