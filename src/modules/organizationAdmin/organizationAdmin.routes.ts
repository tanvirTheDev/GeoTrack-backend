import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { ValidationMiddleware } from "../../middlewares/validate.middleware";
import deliveryUserController from "../deliveryUser/delivery.controller";
import { TrackingController } from "../tracking/tracking.controller";
import { OrganizationAdminController } from "./organizationAdmin.controller";

const router = Router();

// Validation schemas for organization admin operations
const organizationAdminValidationSchemas = {
  create: {
    name: "required|string|min:2|max:50",
    email: "required|email",
    password: "required|string|min:8",
    organizationId: "required|string",
    status: "optional|in:active,inactive,suspended",
    permissions: "optional|object",
    "permissions.canManageUsers": "optional|boolean",
    "permissions.canViewReports": "optional|boolean",
    "permissions.canManageSettings": "optional|boolean",
    "permissions.canViewAnalytics": "optional|boolean",
    "permissions.canManageDeliveryUsers": "optional|boolean",
    "permissions.canViewLiveTracking": "optional|boolean",
  },
  update: {
    name: "optional|string|min:2|max:50",
    email: "optional|email",
    status: "optional|in:active,inactive,suspended",
    permissions: "optional|object",
    "permissions.canManageUsers": "optional|boolean",
    "permissions.canViewReports": "optional|boolean",
    "permissions.canManageSettings": "optional|boolean",
    "permissions.canViewAnalytics": "optional|boolean",
    "permissions.canManageDeliveryUsers": "optional|boolean",
    "permissions.canViewLiveTracking": "optional|boolean",
  },
  resetPassword: {
    newPassword: "required|string|min:8",
  },
  updatePermissions: {
    permissions: "required|object",
    "permissions.canManageUsers": "optional|boolean",
    "permissions.canViewReports": "optional|boolean",
    "permissions.canManageSettings": "optional|boolean",
    "permissions.canViewAnalytics": "optional|boolean",
    "permissions.canManageDeliveryUsers": "optional|boolean",
    "permissions.canViewLiveTracking": "optional|boolean",
  },
  // Delivery User validation schemas
  createDeliveryUser: {
    name: "required|string|min:2|max:50",
    email: "required|email",
    password: "required|string|min:8",
    phone: "required|string|min:10|max:15",
    vehicleType: "required|string|in:bike,motorcycle,car,van,truck",
    licenseNumber: "required|string|min:5|max:20",
    status: "optional|in:active,inactive,suspended",
    permissions: "optional|object",
    "permissions.canManageUsers": "optional|boolean",
    "permissions.canViewReports": "optional|boolean",
    "permissions.canManageSettings": "optional|boolean",
    "permissions.canViewAnalytics": "optional|boolean",
    "permissions.canManageDeliveryUsers": "optional|boolean",
    "permissions.canViewLiveTracking": "optional|boolean",
  },
  updateDeliveryUser: {
    name: "optional|string|min:2|max:50",
    email: "optional|email",
    phone: "optional|string|min:10|max:15",
    vehicleType: "optional|string|in:bike,motorcycle,car,van,truck",
    licenseNumber: "optional|string|min:5|max:20",
    status: "optional|in:active,inactive,suspended",
    permissions: "optional|object",
    "permissions.canManageUsers": "optional|boolean",
    "permissions.canViewReports": "optional|boolean",
    "permissions.canManageSettings": "optional|boolean",
    "permissions.canViewAnalytics": "optional|boolean",
    "permissions.canManageDeliveryUsers": "optional|boolean",
    "permissions.canViewLiveTracking": "optional|boolean",
  },
  resetDeliveryUserPassword: {
    newPassword: "required|string|min:8",
  },
};

// Middleware for organization admin validation
const validateOrganizationAdmin = (schema: any) => {
  return (req: any, res: any, next: any) => {
    // Basic validation - in production, use a proper validation library like Joi
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      // Handle nested properties like permissions.canManageUsers
      let value;
      if (field.includes(".")) {
        const parts = field.split(".");
        value = req.body;
        for (const part of parts) {
          value = value?.[part];
        }
      } else {
        value = req.body[field];
      }

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
        } else if (
          rule === "boolean" &&
          value !== undefined &&
          typeof value !== "boolean"
        ) {
          errors.push(`${field} must be a boolean`);
        } else if (
          rule === "object" &&
          value !== undefined &&
          typeof value !== "object"
        ) {
          errors.push(`${field} must be an object`);
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

// Protected Routes (Super Admin Only)

/**
 * @route   POST /api/organization-admins
 * @desc    Create a new organization admin
 * @access  Private (Super Admin only)
 * @body    { name, email, password, organizationId, status?, permissions? }
 */
router.post(
  "/",
  ValidationMiddleware.sanitizeInput,
  validateOrganizationAdmin(organizationAdminValidationSchemas.create),
  ValidationMiddleware.validatePasswordStrength,
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.createOrganizationAdmin
);

/**
 * @route   GET /api/organization-admins
 * @desc    Get all organization admins with pagination and filters
 * @access  Private (Super Admin only)
 * @query   { page, limit, search, status, organizationId }
 */
router.get(
  "/",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.getAllOrganizationAdmins
);

/**
 * @route   GET /api/organization-admins/stats
 * @desc    Get organization admin statistics
 * @access  Private (Super Admin and Organization Admin)
 * @query   { organizationId? }
 */
router.get(
  "/stats",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  OrganizationAdminController.getOrganizationAdminStats
);

/**
 * @route   GET /api/organization-admins/:adminId
 * @desc    Get organization admin by ID
 * @access  Private (Super Admin only)
 */
router.get(
  "/:adminId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.getOrganizationAdminById
);

/**
 * @route   PUT /api/organization-admins/:adminId
 * @desc    Update organization admin
 * @access  Private (Super Admin only)
 * @body    { name?, email?, status?, permissions? }
 */
router.put(
  "/:adminId",
  ValidationMiddleware.sanitizeInput,
  validateOrganizationAdmin(organizationAdminValidationSchemas.update),
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.updateOrganizationAdmin
);

/**
 * @route   DELETE /api/organization-admins/:adminId
 * @desc    Delete organization admin
 * @access  Private (Super Admin only)
 */
router.delete(
  "/:adminId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.deleteOrganizationAdmin
);

/**
 * @route   POST /api/organization-admins/:adminId/suspend
 * @desc    Suspend organization admin
 * @access  Private (Super Admin only)
 */
router.post(
  "/:adminId/suspend",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.suspendOrganizationAdmin
);

/**
 * @route   POST /api/organization-admins/:adminId/activate
 * @desc    Activate organization admin
 * @access  Private (Super Admin only)
 */
router.post(
  "/:adminId/activate",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.activateOrganizationAdmin
);

/**
 * @route   POST /api/organization-admins/:adminId/reset-password
 * @desc    Reset organization admin password
 * @access  Private (Super Admin only)
 * @body    { newPassword }
 */
router.post(
  "/:adminId/reset-password",
  ValidationMiddleware.sanitizeInput,
  validateOrganizationAdmin(organizationAdminValidationSchemas.resetPassword),
  ValidationMiddleware.validatePasswordStrength,
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.resetOrganizationAdminPassword
);

/**
 * @route   PUT /api/organization-admins/:adminId/permissions
 * @desc    Update organization admin permissions
 * @access  Private (Super Admin only)
 * @body    { permissions }
 */
router.put(
  "/:adminId/permissions",
  ValidationMiddleware.sanitizeInput,
  validateOrganizationAdmin(
    organizationAdminValidationSchemas.updatePermissions
  ),
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.updateOrganizationAdminPermissions
);

/**
 * @route   GET /api/organization-admins/organization/:organizationId
 * @desc    Get organization admins by organization
 * @access  Private (Super Admin only)
 * @query   { page, limit, search, status }
 */
router.get(
  "/organization/:organizationId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireSuperAdmin,
  OrganizationAdminController.getOrganizationAdminsByOrganization
);

// ============================================================================
// DELIVERY USER MANAGEMENT ROUTES (Organization Admin can manage their org's delivery users)
// ============================================================================

/**
 * @route   POST /api/organization-admins/delivery-users
 * @desc    Create a new delivery user in organization
 * @access  Private (Organization Admin only - for their organization)
 * @body    { name, email, password, phone, vehicleType, licenseNumber, status? }
 */
router.post(
  "/delivery-users",
  ValidationMiddleware.sanitizeInput,
  validateOrganizationAdmin(
    organizationAdminValidationSchemas.createDeliveryUser
  ),
  ValidationMiddleware.validatePasswordStrength,
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.createDeliveryUser
);

/**
 * @route   GET /api/organization-admins/delivery-users
 * @desc    Get all delivery users in organization
 * @access  Private (Organization Admin only - for their organization)
 * @query   { page, limit, search, status, vehicleType }
 */
router.get(
  "/delivery-users",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.getDeliveryUsers
);

/**
 * @route   GET /api/organization-admins/delivery-users/stats
 * @desc    Get delivery user statistics for organization
 * @access  Private (Organization Admin only - for their organization)
 */
router.get(
  "/delivery-users/stats",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.getDeliveryUserStats
);

/**
 * @route   GET /api/organization-admins/delivery-users/:userId
 * @desc    Get delivery user by ID
 * @access  Private (Organization Admin only - for their organization)
 */
router.get(
  "/delivery-users/:userId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.getDeliveryUserById
);

/**
 * @route   PUT /api/organization-admins/delivery-users/:userId
 * @desc    Update delivery user
 * @access  Private (Organization Admin only - for their organization)
 * @body    { name?, email?, phone?, vehicleType?, licenseNumber?, status? }
 */
router.put(
  "/delivery-users/:userId",
  ValidationMiddleware.sanitizeInput,
  validateOrganizationAdmin(
    organizationAdminValidationSchemas.updateDeliveryUser
  ),
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.updateDeliveryUser
);

/**
 * @route   DELETE /api/organization-admins/delivery-users/:userId
 * @desc    Delete delivery user
 * @access  Private (Organization Admin only - for their organization)
 */
router.delete(
  "/delivery-users/:userId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.deleteDeliveryUser
);

/**
 * @route   PATCH /api/organization-admins/delivery-users/:userId/status
 * @desc    Update delivery user status
 * @access  Private (Organization Admin only - for their organization)
 * @body    { status: "active" | "inactive" | "suspended" }
 */
router.patch(
  "/delivery-users/:userId/status",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.updateDeliveryUserStatus
);

/**
 * @route   PATCH /api/organization-admins/delivery-users/:userId/reset-password
 * @desc    Reset delivery user password
 * @access  Private (Organization Admin only - for their organization)
 * @body    { newPassword }
 */
router.patch(
  "/delivery-users/:userId/reset-password",
  ValidationMiddleware.sanitizeInput,
  validateOrganizationAdmin(
    organizationAdminValidationSchemas.resetDeliveryUserPassword
  ),
  ValidationMiddleware.validatePasswordStrength,
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  deliveryUserController.resetDeliveryUserPassword
);

// ============================================================================
// TRACKING AND REPORTS ROUTES (Organization Admin can view their org's data)
// ============================================================================

/**
 * @route   GET /api/organization-admins/tracking/locations/active
 * @desc    Get active delivery locations for organization
 * @access  Private (Organization Admin only - for their organization)
 */
router.get(
  "/tracking/locations/active",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  TrackingController.getActiveLocations
);

/**
 * @route   GET /api/organization-admins/tracking/locations/user/:userId
 * @desc    Get current location of specific delivery user
 * @access  Private (Organization Admin only - for their organization)
 */
router.get(
  "/tracking/locations/user/:userId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  TrackingController.getUserLocation
);

/**
 * @route   GET /api/organization-admins/tracking/locations/user/:userId/history
 * @desc    Get location history of specific delivery user
 * @access  Private (Organization Admin only - for their organization)
 * @query   { startDate, endDate, page, limit }
 */
router.get(
  "/tracking/locations/user/:userId/history",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  TrackingController.getUserLocationHistory
);

/**
 * @route   GET /api/organization-admins/tracking/emergency
 * @desc    Get emergency requests for organization
 * @access  Private (Organization Admin only - for their organization)
 * @query   { status, page, limit }
 */
router.get(
  "/tracking/emergency",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  TrackingController.getEmergencyRequests
);

/**
 * @route   PATCH /api/organization-admins/tracking/emergency/:requestId/acknowledge
 * @desc    Acknowledge emergency request
 * @access  Private (Organization Admin only - for their organization)
 */
router.patch(
  "/tracking/emergency/:requestId/acknowledge",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  TrackingController.acknowledgeEmergencyRequest
);

/**
 * @route   PATCH /api/organization-admins/tracking/emergency/:requestId/resolve
 * @desc    Resolve emergency request
 * @access  Private (Organization Admin only - for their organization)
 */
router.patch(
  "/tracking/emergency/:requestId/resolve",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  TrackingController.resolveEmergencyRequest
);

/**
 * @route   GET /api/organization-admins/tracking/stats
 * @desc    Get tracking statistics for organization
 * @access  Private (Organization Admin only - for their organization)
 * @query   { startDate, endDate }
 */
router.get(
  "/tracking/stats",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireOrganizationAdmin,
  TrackingController.getTrackingStats
);

export default router;
