import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import { UserRole } from "../auth/auth.interface";
import User from "../user/user.model";
import { GoogleMapsService } from "./google-maps.service";
import { RealtimeTrackingService } from "./realtime-tracking.service";

const router = Router();

// Get active tracking users for organization (Organization Admin only)
router.get(
  "/active-users",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  async (req, res) => {
    try {
      const organizationId = req.user!.organizationId!;
      const activeUsers = await RealtimeTrackingService.getActiveTrackingUsers(
        organizationId
      );

      res.json({
        success: true,
        data: activeUsers,
        message: "Active tracking users retrieved successfully",
      });
    } catch (error) {
      console.error("Get active users error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get active tracking users",
      });
    }
  }
);

// Get ALL active tracking users (Super Admin only)
router.get(
  "/all-active-users",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const activeUsers =
        await RealtimeTrackingService.getAllActiveTrackingUsers();

      res.json({
        success: true,
        data: activeUsers,
        message: "All active tracking users retrieved successfully",
      });
    } catch (error) {
      console.error("Get all active users error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get all active tracking users",
      });
    }
  }
);

// Get real-time location of specific user (Organization Admin only - their users)
router.get(
  "/user/:userId/location",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const organizationId = req.user!.organizationId!;

      // Verify user belongs to the same organization
      const user = await User.findById(userId);
      if (!user || user.organizationId?.toString() !== organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. User does not belong to your organization",
        });
      }

      const activeConnections =
        RealtimeTrackingService.getActiveConnections(organizationId);
      const userConnection = activeConnections.find(
        (conn) => conn.userId === userId
      );

      if (!userConnection || !userConnection.isTracking) {
        return res.status(404).json({
          success: false,
          message: "User is not currently tracking",
        });
      }

      res.json({
        success: true,
        data: {
          userId: userConnection.userId,
          isTracking: userConnection.isTracking,
          lastUpdate: userConnection.lastUpdate,
        },
        message: "User location retrieved successfully",
      });
    } catch (error) {
      console.error("Get user location error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user location",
      });
    }
  }
);

// Get real-time location of ANY user (Super Admin only)
router.get(
  "/super-admin/user/:userId/location",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const { userId } = req.params;

      const allConnections = Array.from(
        RealtimeTrackingService.activeConnections.values()
      );
      const userConnection = allConnections.find(
        (conn) => conn.userId === userId
      );

      if (!userConnection || !userConnection.isTracking) {
        return res.status(404).json({
          success: false,
          message: "User is not currently tracking",
        });
      }

      res.json({
        success: true,
        data: {
          userId: userConnection.userId,
          organizationId: userConnection.organizationId,
          isTracking: userConnection.isTracking,
          lastUpdate: userConnection.lastUpdate,
        },
        message: "User location retrieved successfully",
      });
    } catch (error) {
      console.error("Get user location error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user location",
      });
    }
  }
);

// Get location history for organization users (Organization Admin only)
router.get(
  "/location-history",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ORGANIZATION_ADMIN]),
  async (req, res) => {
    try {
      const organizationId = req.user!.organizationId!;
      const { userId, startDate, endDate, page = 1, limit = 50 } = req.query;

      if (userId) {
        // Get history for specific user (verify they belong to organization)
        const user = await User.findById(userId);
        if (!user || user.organizationId?.toString() !== organizationId) {
          return res.status(403).json({
            success: false,
            message: "Access denied. User does not belong to your organization",
          });
        }
      }

      // Use existing tracking service for history
      const { TrackingService } = await import("./tracking.service");

      if (userId) {
        const result = await TrackingService.getLocationHistory(
          userId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
          parseInt(page as string),
          parseInt(limit as string)
        );
        res.json(result);
      } else {
        // Get all users' history for organization
        const users = await User.find({
          organizationId,
          role: "delivery_user",
        });
        const allHistory = [];

        for (const user of users) {
          const userHistory = await TrackingService.getLocationHistory(
            user._id.toString(),
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined,
            1,
            1000 // Get more records per user
          );
          if (userHistory.success && userHistory.data?.history) {
            allHistory.push({
              userId: user._id,
              userName: user.name,
              history: userHistory.data.history,
            });
          }
        }

        res.json({
          success: true,
          data: allHistory,
          message: "Location history retrieved successfully",
        });
      }
    } catch (error) {
      console.error("Get location history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get location history",
      });
    }
  }
);

// Get ALL location history (Super Admin only)
router.get(
  "/super-admin/location-history",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const {
        userId,
        organizationId,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const { TrackingService } = await import("./tracking.service");

      if (userId) {
        // Get history for specific user
        const result = await TrackingService.getLocationHistory(
          userId as string,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
          parseInt(page as string),
          parseInt(limit as string)
        );
        res.json(result);
      } else if (organizationId) {
        // Get all users' history for specific organization
        const users = await User.find({
          organizationId,
          role: "delivery_user",
        });
        const allHistory = [];

        for (const user of users) {
          const userHistory = await TrackingService.getLocationHistory(
            user._id.toString(),
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined,
            1,
            1000
          );
          if (userHistory.success && userHistory.data?.history) {
            allHistory.push({
              userId: user._id,
              userName: user.name,
              organizationId: user.organizationId,
              history: userHistory.data.history,
            });
          }
        }

        res.json({
          success: true,
          data: allHistory,
          message: "Organization location history retrieved successfully",
        });
      } else {
        // Get all users' history from all organizations
        const users = await User.find({ role: "delivery_user" }).populate(
          "organizationId",
          "name companyName"
        );
        const allHistory = [];

        for (const user of users) {
          const userHistory = await TrackingService.getLocationHistory(
            user._id.toString(),
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined,
            1,
            1000
          );
          if (userHistory.success && userHistory.data?.history) {
            allHistory.push({
              userId: user._id,
              userName: user.name,
              organization: user.organizationId,
              history: userHistory.data.history,
            });
          }
        }

        res.json({
          success: true,
          data: allHistory,
          message: "All location history retrieved successfully",
        });
      }
    } catch (error) {
      console.error("Get location history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get location history",
      });
    }
  }
);

// Send message to specific user (Admin/Organization Admin only)
router.post(
  "/user/:userId/message",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { message, type = "info" } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      RealtimeTrackingService.sendToUser(userId, "admin_message", {
        message,
        type,
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: "Message sent successfully",
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send message",
      });
    }
  }
);

// Broadcast message to organization (Admin/Organization Admin only)
router.post(
  "/broadcast",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  async (req, res) => {
    try {
      const { message, type = "info" } = req.body;
      const organizationId = req.user!.organizationId!;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      RealtimeTrackingService.sendToOrganization(
        organizationId,
        "admin_broadcast",
        {
          message,
          type,
          timestamp: new Date(),
        }
      );

      res.json({
        success: true,
        message: "Broadcast sent successfully",
      });
    } catch (error) {
      console.error("Broadcast error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send broadcast",
      });
    }
  }
);

// Geocode address to coordinates
router.post("/geocode", AuthMiddleware.verifyToken, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    const result = await GoogleMapsService.geocodeAddress(address);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({
      success: true,
      data: {
        address: result.formatted_address,
        location: result.geometry.location,
        placeId: result.place_id,
      },
      message: "Address geocoded successfully",
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to geocode address",
    });
  }
});

// Reverse geocode coordinates to address
router.post(
  "/reverse-geocode",
  AuthMiddleware.verifyToken,
  async (req, res) => {
    try {
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      if (!GoogleMapsService.isValidCoordinate(latitude, longitude)) {
        return res.status(400).json({
          success: false,
          message: "Invalid coordinates",
        });
      }

      const result = await GoogleMapsService.reverseGeocode(
        latitude,
        longitude
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Address not found for coordinates",
        });
      }

      res.json({
        success: true,
        data: {
          address: result.formatted_address,
          location: result.geometry.location,
          placeId: result.place_id,
        },
        message: "Coordinates reverse geocoded successfully",
      });
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reverse geocode coordinates",
      });
    }
  }
);

// Calculate distance between two points
router.post("/distance", AuthMiddleware.verifyToken, async (req, res) => {
  try {
    const { origin, destination, mode = "driving" } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required",
      });
    }

    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates format",
      });
    }

    const result = await GoogleMapsService.calculateDistance(
      origin,
      destination,
      mode
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Could not calculate distance",
      });
    }

    res.json({
      success: true,
      data: {
        distance: {
          text: result.distance.text,
          value: result.distance.value,
          formatted: GoogleMapsService.formatDistance(result.distance.value),
        },
        duration: {
          text: result.duration.text,
          value: result.duration.value,
          formatted: GoogleMapsService.formatDuration(result.duration.value),
        },
        status: result.status,
      },
      message: "Distance calculated successfully",
    });
  } catch (error) {
    console.error("Distance calculation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate distance",
    });
  }
});

// Get directions between two points
router.post("/directions", AuthMiddleware.verifyToken, async (req, res) => {
  try {
    const { origin, destination, mode = "driving" } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required",
      });
    }

    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates format",
      });
    }

    const result = await GoogleMapsService.getDirections(
      origin,
      destination,
      mode
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Could not get directions",
      });
    }

    res.json({
      success: true,
      data: {
        distance: {
          value: result.distance,
          formatted: GoogleMapsService.formatDistance(result.distance),
        },
        duration: {
          value: result.duration,
          formatted: GoogleMapsService.formatDuration(result.duration),
        },
        polyline: result.polyline,
        steps: result.steps,
      },
      message: "Directions retrieved successfully",
    });
  } catch (error) {
    console.error("Directions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get directions",
    });
  }
});

// Get nearby places
router.post("/nearby-places", AuthMiddleware.verifyToken, async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000, type } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    if (!GoogleMapsService.isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    const places = await GoogleMapsService.getNearbyPlaces(
      { lat: latitude, lng: longitude },
      radius,
      type
    );

    res.json({
      success: true,
      data: places,
      message: "Nearby places retrieved successfully",
    });
  } catch (error) {
    console.error("Nearby places error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get nearby places",
    });
  }
});

// ==================== CUSTOMER ROUTES ====================

// Customer joins delivery tracking room
router.post("/customer/track-delivery/:deliveryUserId", async (req, res) => {
  try {
    const { deliveryUserId } = req.params;

    // Verify delivery user exists and is active
    const deliveryUser = await User.findById(deliveryUserId);
    if (!deliveryUser || deliveryUser.role !== "delivery_user") {
      return res.status(404).json({
        success: false,
        message: "Delivery user not found",
      });
    }

    // Check if delivery user is currently tracking
    const { TrackingService } = await import("./tracking.service");
    const tracking = await TrackingService.getCurrentLocation(deliveryUserId);

    if (!tracking.success) {
      return res.status(404).json({
        success: false,
        message: "Delivery user is not currently tracking",
      });
    }

    res.json({
      success: true,
      data: {
        deliveryUserId,
        deliveryUserName: deliveryUser.name,
        isTracking: true,
        currentLocation: tracking.data?.location,
        lastUpdate: tracking.data?.updatedAt,
      },
      message: "Delivery tracking information retrieved successfully",
    });
  } catch (error) {
    console.error("Customer track delivery error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get delivery tracking information",
    });
  }
});

// Get delivery user's current location (for customers)
router.get("/customer/delivery/:deliveryUserId/location", async (req, res) => {
  try {
    const { deliveryUserId } = req.params;

    const { TrackingService } = await import("./tracking.service");
    const tracking = await TrackingService.getCurrentLocation(deliveryUserId);

    if (!tracking.success) {
      return res.status(404).json({
        success: false,
        message: "Delivery user is not currently tracking",
      });
    }

    res.json({
      success: true,
      data: tracking.data,
      message: "Delivery location retrieved successfully",
    });
  } catch (error) {
    console.error("Get delivery location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get delivery location",
    });
  }
});

export default router;
