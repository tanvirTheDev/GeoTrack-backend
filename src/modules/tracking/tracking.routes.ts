import { Router } from "express";
import Joi from "joi";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { ValidationMiddleware } from "../../middlewares/validate.middleware";
import { UserRole } from "../auth/auth.interface";
import { TrackingController } from "./tracking.controller";

const router = Router();

// Location update validation schema
const locationUpdateSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0).optional(),
  altitude: Joi.number().optional(),
  speed: Joi.number().min(0).optional(),
  heading: Joi.number().min(0).max(360).optional(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  networkType: Joi.string()
    .valid("wifi", "4g", "5g", "3g", "2g", "unknown")
    .optional(),
  deviceInfo: Joi.object({
    model: Joi.string().optional(),
    os: Joi.string().optional(),
    appVersion: Joi.string().optional(),
  }).optional(),
});

// Emergency request validation schema
const emergencyRequestSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0).optional(),
  message: Joi.string().max(500).optional(),
  priority: Joi.string().valid("low", "medium", "high", "critical").optional(),
});

// Query validation schema
const querySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  status: Joi.string().valid("pending", "acknowledged", "resolved").optional(),
  priority: Joi.string().valid("low", "medium", "high", "critical").optional(),
});

// ==================== DELIVERY USER ROUTES ====================

// Update location (Delivery User)
router.post(
  "/location/update",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.DELIVERY_USER]),
  ValidationMiddleware.validateBody(locationUpdateSchema),
  TrackingController.updateLocation
);

// Get current location (Delivery User)
router.get(
  "/location/current",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.DELIVERY_USER]),
  TrackingController.getCurrentLocation
);

// Get location history (Delivery User)
router.get(
  "/location/history",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.DELIVERY_USER]),
  ValidationMiddleware.validateQuery(querySchema),
  TrackingController.getLocationHistory
);

// Start tracking (Delivery User)
router.post(
  "/tracking/start",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.DELIVERY_USER]),
  TrackingController.startTracking
);

// Stop tracking (Delivery User)
router.post(
  "/tracking/stop",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.DELIVERY_USER]),
  TrackingController.stopTracking
);

// Create emergency request (Delivery User)
router.post(
  "/emergency",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.DELIVERY_USER]),
  ValidationMiddleware.validateBody(emergencyRequestSchema),
  TrackingController.createEmergencyRequest
);

// ==================== ADMIN ROUTES ====================

// Get all active locations (Admin)
router.get(
  "/locations/active",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  TrackingController.getActiveLocations
);

// Get specific user location (Admin)
router.get(
  "/locations/user/:userId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  TrackingController.getUserLocation
);

// Get specific user location history (Admin)
router.get(
  "/locations/user/:userId/history",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  ValidationMiddleware.validateQuery(querySchema),
  TrackingController.getUserLocationHistory
);

// Get emergency requests (Admin)
router.get(
  "/emergency",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  ValidationMiddleware.validateQuery(querySchema),
  TrackingController.getEmergencyRequests
);

// Acknowledge emergency request (Admin)
router.patch(
  "/emergency/:requestId/acknowledge",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  TrackingController.acknowledgeEmergencyRequest
);

// Resolve emergency request (Admin)
router.patch(
  "/emergency/:requestId/resolve",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  TrackingController.resolveEmergencyRequest
);

// Get tracking statistics (Admin)
router.get(
  "/stats",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  TrackingController.getTrackingStats
);

// ==================== ORGANIZATION ADMIN ROUTES ====================

// Get all active locations (Organization Admin)
router.get(
  "/org/locations/active",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  TrackingController.getActiveLocations
);

// Get specific user location (Organization Admin)
router.get(
  "/org/locations/user/:userId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  TrackingController.getUserLocation
);

// Get specific user location history (Organization Admin)
router.get(
  "/org/locations/user/:userId/history",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  ValidationMiddleware.validateQuery(querySchema),
  TrackingController.getUserLocationHistory
);

// Get emergency requests (Organization Admin)
router.get(
  "/org/emergency",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  ValidationMiddleware.validateQuery(querySchema),
  TrackingController.getEmergencyRequests
);

// Acknowledge emergency request (Organization Admin)
router.patch(
  "/org/emergency/:requestId/acknowledge",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  TrackingController.acknowledgeEmergencyRequest
);

// Resolve emergency request (Organization Admin)
router.patch(
  "/org/emergency/:requestId/resolve",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  TrackingController.resolveEmergencyRequest
);

// Get tracking statistics (Organization Admin)
router.get(
  "/org/stats",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  TrackingController.getTrackingStats
);

export default router;
