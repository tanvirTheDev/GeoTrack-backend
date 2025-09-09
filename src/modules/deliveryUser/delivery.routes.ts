import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import deliveryUserController from "./delivery.controller";

const router = Router();

// Routes for Organization Admin to manage delivery users
// All routes require authentication and organization admin role

// Create a new delivery user
router.post("/", authenticateToken, deliveryUserController.createDeliveryUser);

// Get all delivery users for the organization (with filtering and pagination)
router.get("/", deliveryUserController.getDeliveryUsers);

// Get delivery user statistics for the organization
router.get(
  "/stats",
  authenticateToken,
  deliveryUserController.getDeliveryUserStats
);

// Get delivery user by ID
router.get(
  "/:id",
  authenticateToken,
  deliveryUserController.getDeliveryUserById
);

// Update delivery user
router.put(
  "/:id",
  authenticateToken,
  deliveryUserController.updateDeliveryUser
);

// Delete delivery user
router.delete(
  "/:id",
  authenticateToken,
  deliveryUserController.deleteDeliveryUser
);

// Update delivery user status
router.patch(
  "/:id/status",
  authenticateToken,
  deliveryUserController.updateDeliveryUserStatus
);

// Reset delivery user password
router.patch(
  "/:id/reset-password",
  authenticateToken,
  deliveryUserController.resetDeliveryUserPassword
);

// Get delivery user by email (for authentication purposes)
router.get(
  "/email/:email",
  authenticateToken,
  deliveryUserController.getDeliveryUserByEmail
);

export default router;
