import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { ValidationMiddleware } from "../../middlewares/validate.middleware";
import { OrganizationController } from "./organization.controller";

const router = Router();

// Validation schemas for organization
const organizationValidationSchemas = {
  create: {
    name: "required|string|min:2|max:100",
    companyName: "required|string|min:2|max:100",
    email: "required|email",
    phone: "optional|string|max:20",
    address: "optional|object",
    "address.street": "required_with:address|string|max:200",
    "address.city": "required_with:address|string|max:50",
    "address.state": "required_with:address|string|max:50",
    "address.country": "required_with:address|string|max:50",
    "address.zipCode": "required_with:address|string|max:20",
    packageType: "required|in:basic,premium,platinum",
    maxUsers: "required|integer|min:1",
    subscriptionEndDate: "required|date|after:now",
  },
  update: {
    name: "optional|string|min:2|max:100",
    companyName: "optional|string|min:2|max:100",
    email: "optional|email",
    phone: "optional|string|max:20",
    address: "optional|object",
    "address.street": "required_with:address|string|max:200",
    "address.city": "required_with:address|string|max:50",
    "address.state": "required_with:address|string|max:50",
    "address.country": "required_with:address|string|max:50",
    "address.zipCode": "required_with:address|string|max:20",
    status: "optional|in:active,inactive,suspended",
    packageType: "optional|in:basic,premium,platinum",
    maxUsers: "optional|integer|min:1",
    subscriptionEndDate: "optional|date",
  },
  updateSubscription: {
    packageType: "required|in:basic,premium,platinum",
    maxUsers: "required|integer|min:1",
    endDate: "required|date|after:now",
  },
};

// Middleware for organization validation
const validateOrganization = (schema: any) => {
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

// Public Routes (No Authentication Required) - None for organizations

// Protected Routes (Authentication Required)

/**
 * @route   POST /api/organizations
 * @desc    Create a new organization
 * @access  Private (Super Admin only)
 * @body    { name, companyName, email, packageType, maxUsers, subscriptionEndDate, ... }
 */
router.post(
  "/",
  ValidationMiddleware.sanitizeInput,
  validateOrganization(organizationValidationSchemas.create),
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.createOrganization
);

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations with pagination and filters
 * @access  Private (Super Admin only)
 * @query   { page, limit, search, status, packageType }
 */
router.get(
  "/",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.getAllOrganizations
);

/**
 * @route   GET /api/organizations/expiring
 * @desc    Get organizations with expiring subscriptions
 * @access  Private (Super Admin only)
 * @query   { days }
 */
router.get(
  "/expiring",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.getExpiringOrganizations
);

/**
 * @route   GET /api/organizations/:organizationId
 * @desc    Get organization by ID
 * @access  Private (Super Admin, Admin can access their own organization)
 */
router.get(
  "/:organizationId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  OrganizationController.getOrganizationById
);

/**
 * @route   PUT /api/organizations/:organizationId
 * @desc    Update organization
 * @access  Private (Super Admin only)
 * @body    { name?, companyName?, email?, phone?, address?, status?, packageType?, maxUsers?, subscriptionEndDate? }
 */
router.put(
  "/:organizationId",
  ValidationMiddleware.sanitizeInput,
  validateOrganization(organizationValidationSchemas.update),
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.updateOrganization
);

/**
 * @route   DELETE /api/organizations/:organizationId
 * @desc    Delete organization
 * @access  Private (Super Admin only)
 */
router.delete(
  "/:organizationId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.deleteOrganization
);

/**
 * @route   POST /api/organizations/:organizationId/suspend
 * @desc    Suspend organization
 * @access  Private (Super Admin only)
 */
router.post(
  "/:organizationId/suspend",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.suspendOrganization
);

/**
 * @route   POST /api/organizations/:organizationId/activate
 * @desc    Activate organization
 * @access  Private (Super Admin only)
 */
router.post(
  "/:organizationId/activate",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.activateOrganization
);

/**
 * @route   GET /api/organizations/:organizationId/stats
 * @desc    Get organization statistics
 * @access  Private (Super Admin, Admin can access their own organization)
 */
router.get(
  "/:organizationId/stats",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  OrganizationController.getOrganizationStats
);

/**
 * @route   PUT /api/organizations/:organizationId/subscription
 * @desc    Update organization subscription
 * @access  Private (Super Admin only)
 * @body    { packageType, maxUsers, endDate }
 */
router.put(
  "/:organizationId/subscription",
  ValidationMiddleware.sanitizeInput,
  validateOrganization(organizationValidationSchemas.updateSubscription),
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationController.updateSubscription
);

export default router;
