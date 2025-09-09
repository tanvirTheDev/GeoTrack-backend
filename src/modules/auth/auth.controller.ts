import { Request, Response } from "express";
import {
  AuthenticatedRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  ResetPasswordRequest,
} from "./auth.interface";
import { AuthService } from "./auth.service";

export class AuthController {
  // Login Controller
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;

      // Validate required fields
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          success: false,
          message: "Email and password are required",
          error: "MISSING_FIELDS",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginData.email)) {
        res.status(400).json({
          success: false,
          message: "Invalid email format",
          error: "INVALID_EMAIL",
        });
        return;
      }

      const result = await AuthService.login(loginData);

      // Set secure HTTP-only cookie for refresh token
      res.cookie("refreshToken", result.data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";

      res.status(401).json({
        success: false,
        message: errorMessage,
        error: "LOGIN_FAILED",
      });
    }
  }

  // Refresh Token Controller
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Try to get refresh token from cookie first, then from body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: "Refresh token is required",
          error: "MISSING_REFRESH_TOKEN",
        });
        return;
      }

      const refreshData: RefreshTokenRequest = { refreshToken };
      const result = await AuthService.refreshToken(refreshData);

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Token refresh failed";

      res.status(401).json({
        success: false,
        message: errorMessage,
        error: "TOKEN_REFRESH_FAILED",
      });
    }
  }

  // Forgot Password Controller
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const forgotData: ForgotPasswordRequest = req.body;

      if (!forgotData.email) {
        res.status(400).json({
          success: false,
          message: "Email is required",
          error: "MISSING_EMAIL",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(forgotData.email)) {
        res.status(400).json({
          success: false,
          message: "Invalid email format",
          error: "INVALID_EMAIL",
        });
        return;
      }

      await AuthService.forgotPassword(forgotData);

      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        success: true,
        message:
          "If the email exists in our system, you will receive a password reset link",
      });
    } catch (error) {
      // Always return success for security
      res.status(200).json({
        success: true,
        message:
          "If the email exists in our system, you will receive a password reset link",
      });
    }
  }

  // Reset Password Controller
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const resetData: ResetPasswordRequest = req.body;

      // Validate required fields
      if (
        !resetData.token ||
        !resetData.newPassword ||
        !resetData.confirmPassword
      ) {
        res.status(400).json({
          success: false,
          message: "Token, new password and confirm password are required",
          error: "MISSING_FIELDS",
        });
        return;
      }

      // Validate password match
      if (resetData.newPassword !== resetData.confirmPassword) {
        res.status(400).json({
          success: false,
          message: "Passwords do not match",
          error: "PASSWORD_MISMATCH",
        });
        return;
      }

      await AuthService.resetPassword(resetData);

      res.status(200).json({
        success: true,
        message: "Password has been reset successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Password reset failed";

      res.status(400).json({
        success: false,
        message: errorMessage,
        error: "RESET_PASSWORD_FAILED",
      });
    }
  }

  // Change Password Controller
  static async changePassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const changeData: ChangePasswordRequest = req.body;
      const userId = req.user!.userId;

      // Validate required fields
      if (
        !changeData.currentPassword ||
        !changeData.newPassword ||
        !changeData.confirmPassword
      ) {
        res.status(400).json({
          success: false,
          message:
            "Current password, new password and confirm password are required",
          error: "MISSING_FIELDS",
        });
        return;
      }

      // Validate password match
      if (changeData.newPassword !== changeData.confirmPassword) {
        res.status(400).json({
          success: false,
          message: "New passwords do not match",
          error: "PASSWORD_MISMATCH",
        });
        return;
      }

      await AuthService.changePassword(userId, changeData);

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Password change failed";

      res.status(400).json({
        success: false,
        message: errorMessage,
        error: "CHANGE_PASSWORD_FAILED",
      });
    }
  }

  // Logout Controller
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: "Refresh token is required",
          error: "MISSING_REFRESH_TOKEN",
        });
        return;
      }

      await AuthService.logout(userId, refreshToken);

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Logout failed";

      res.status(400).json({
        success: false,
        message: errorMessage,
        error: "LOGOUT_FAILED",
      });
    }
  }

  // Logout All Devices Controller
  static async logoutAllDevices(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user!.userId;

      await AuthService.logoutAllDevices(userId);

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Logged out from all devices successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Logout from all devices failed";

      res.status(400).json({
        success: false,
        message: errorMessage,
        error: "LOGOUT_ALL_FAILED",
      });
    }
  }

  // get Profile

  static async getProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user; // comes from AuthMiddleware
      if (!user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "UNAUTHORIZED",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          userId: user.userId,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId || null,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get profile";
      res.status(400).json({
        success: false,
        message: errorMessage,
        error: "GET_PROFILE_FAILED",
      });
    }
  }

  // Validate Token
  static async validateToken(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: "Invalid or expired token",
          error: "INVALID_TOKEN",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Token is valid",
        data: {
          userId: user.userId,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId || null,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Token validation failed";
      res.status(400).json({
        success: false,
        message: errorMessage,
        error: "TOKEN_VALIDATION_FAILED",
      });
    }
  }

  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "UNAUTHORIZED",
        });
        return;
      }

      // Example: Redirect dashboard based on role
      let dashboardUrl = "/dashboard";
      switch (user.role) {
        case "super_admin":
          dashboardUrl = "/super-admin/dashboard";
          break;
        case "admin":
          dashboardUrl = "/admin/dashboard";
          break;
        case "delivery_user":
          dashboardUrl = "/delivery/dashboard";
          break;
        default:
          dashboardUrl = "/dashboard";
      }

      res.status(200).json({
        success: true,
        data: { dashboardUrl },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get dashboard";
      res.status(400).json({
        success: false,
        message: errorMessage,
        error: "GET_DASHBOARD_FAILED",
      });
    }
  }
}
