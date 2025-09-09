import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { ValidationMiddleware } from "../../middlewares/validate.middleware";
import { AdminController } from "./admin.controller";

const router = Router();

// Validation schemas for admin operations
const adminValidationSchemas = {
  createUser: {
    name: "required|string|min:2|max:50",
    email: "required|email",
    password: "required|string|min:8",
    role: "required|in:admin,delivery_user",
    organizationId: "optional|string",
    status: "optional|in:active,inactive,suspended",
  },
  updateUser: {
    name: "optional|string|min:2|max:50",
    email: "optional|email",
    role: "optional|in:admin,delivery_user",
    status: "optional|in:active,inactive,suspended",
  },
  resetPassword: {
    newPassword: "required|string|min:8",
  },
};

// Middleware for admin validation
const validateAdmin = (schema: any) => {
  return (req: any, res: any, next: any) => {
    // Basic validation - in production, use a proper validation library like Joi
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      const ruleArray = (rules as string).split("|");

      for (const rule of ruleArray) {
        if (rule === "required" && (!value || value === "")) {
          errors.push(`${field} is required`);
        } else if (
          rule.startsWith("min:") &&
          value &&
          value.length < parseInt(rule.split(":")[1])
        ) {
          errors.push(
            `${field} must be at least ${rule.split(":")[1]} characters`
          );
        } else if (
          rule.startsWith("max:") &&
          value &&
          value.length > parseInt(rule.split(":")[1])
        ) {
          errors.push(
            `${field} cannot exceed ${rule.split(":")[1]} characters`
          );
        } else if (
          rule === "email" &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          errors.push(`${field} must be a valid email`);
        } else if (
          rule.startsWith("in:") &&
          value &&
          !rule.split(":")[1].split(",").includes(value)
        ) {
          errors.push(`${field} must be one of: ${rule.split(":")[1]}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
        error: "VALIDATION_ERROR",
      });
    }

    next();
  };
};

// Protected Routes (Authentication Required)

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Private (Super Admin, Admin can create users in their organization)
 * @body    { name, email, password, role, organizationId?, status? }
 */
router.post(
  "/users",
  ValidationMiddleware.sanitizeInput,
  validateAdmin(adminValidationSchemas.createUser),
  ValidationMiddleware.validatePasswordStrength,
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.createUser
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Super Admin, Admin can see users from their organization)
 * @query   { page, limit, search, role, status, organizationId }
 */
router.get(
  "/users",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.getAllUsers
);

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Private (Super Admin, Admin can see stats for their organization)
 * @query   { organizationId? }
 */
router.get(
  "/users/stats",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.getUserStats
);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user by ID
 * @access  Private (Super Admin, Admin can access users from their organization)
 */
router.get(
  "/users/:userId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.getUserById
);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Update user
 * @access  Private (Super Admin, Admin can update users from their organization)
 * @body    { name?, email?, role?, status? }
 */
router.put(
  "/users/:userId",
  ValidationMiddleware.sanitizeInput,
  validateAdmin(adminValidationSchemas.updateUser),
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user
 * @access  Private (Super Admin, Admin can delete users from their organization)
 */
router.delete(
  "/users/:userId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.deleteUser
);

/**
 * @route   POST /api/admin/users/:userId/suspend
 * @desc    Suspend user
 * @access  Private (Super Admin, Admin can suspend users from their organization)
 */
router.post(
  "/users/:userId/suspend",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.suspendUser
);

/**
 * @route   POST /api/admin/users/:userId/activate
 * @desc    Activate user
 * @access  Private (Super Admin, Admin can activate users from their organization)
 */
router.post(
  "/users/:userId/activate",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.activateUser
);

/**
 * @route   POST /api/admin/users/:userId/reset-password
 * @desc    Reset user password
 * @access  Private (Super Admin, Admin can reset passwords for users from their organization)
 * @body    { newPassword }
 */
router.post(
  "/users/:userId/reset-password",
  ValidationMiddleware.sanitizeInput,
  validateAdmin(adminValidationSchemas.resetPassword),
  ValidationMiddleware.validatePasswordStrength,
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.resetUserPassword
);

/**
 * @route   GET /api/admin/organizations/:organizationId/users
 * @desc    Get users by organization
 * @access  Private (Super Admin, Admin can see users from their organization)
 * @query   { page, limit, search, role, status }
 */
router.get(
  "/organizations/:organizationId/users",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  AdminController.getUsersByOrganization
);

export default router;
