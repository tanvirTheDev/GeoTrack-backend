import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { ValidationMiddleware } from "../../middlewares/validate.middleware";
import { AuthController } from "./auth.controller";

const router = Router();

// Public Routes (No Authentication Required)

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post(
  "/login",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.rateLimitAuth,
  ValidationMiddleware.validateLogin,
  AuthController.login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken: string } or cookie
 */
router.post(
  "/refresh-token",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateRefreshToken,
  AuthController.refreshToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @body    { email: string }
 */
router.post(
  "/forgot-password",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.rateLimitAuth,
  ValidationMiddleware.validateForgotPassword,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 * @body    { token: string, newPassword: string, confirmPassword: string }
 */
router.post(
  "/reset-password",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateResetPassword,
  ValidationMiddleware.validatePasswordStrength,
  AuthController.resetPassword
);

// Protected Routes (Authentication Required)

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @body    { currentPassword: string, newPassword: string, confirmPassword: string }
 */
router.post(
  "/change-password",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateChangePassword,
  ValidationMiddleware.validatePasswordStrength,
  AuthMiddleware.verifyToken,
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 * @body    { refreshToken: string } (optional if in cookie)
 */
router.post("/logout", AuthMiddleware.verifyToken, AuthController.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout user from all devices
 * @access  Private
 */
router.post(
  "/logout-all",
  AuthMiddleware.verifyToken,
  AuthController.logoutAllDevices
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", AuthMiddleware.verifyToken, AuthController.getProfile);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate current token
 * @access  Private
 */
router.get(
  "/validate",
  AuthMiddleware.verifyToken,
  AuthController.validateToken
);

/**
 * @route   GET /api/auth/dashboard
 * @desc    Get dashboard URL based on user role
 * @access  Private
 */
router.get(
  "/dashboard",
  AuthMiddleware.verifyToken,
  AuthController.getDashboard
);

export default router;
