import { Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.interface";
import { TrackingService } from "./tracking.service";

export class TrackingController {
  // Update user location
  static async updateLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const locationData = req.body;

      // Validate required fields
      if (!locationData.latitude || !locationData.longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const result = await TrackingService.updateLocation(userId, locationData);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update location";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Get current location of authenticated user
  static async getCurrentLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const result = await TrackingService.getCurrentLocation(userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get current location";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Get current location of a specific user (for admins)
  static async getUserLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await TrackingService.getCurrentLocation(userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get user location";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Get all active locations for organization (for admins)
  static async getActiveLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId!;

      const result = await TrackingService.getActiveLocations(organizationId);

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get active locations";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Get location history for authenticated user
  static async getLocationHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate, page, limit } = req.query;

      const startDateObj = startDate
        ? new Date(startDate as string)
        : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 50;

      const result = await TrackingService.getLocationHistory(
        userId,
        startDateObj,
        endDateObj,
        pageNum,
        limitNum
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get location history";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Get location history for a specific user (for admins)
  static async getUserLocationHistory(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { userId } = req.params;
      const { startDate, endDate, page, limit } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const startDateObj = startDate
        ? new Date(startDate as string)
        : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 50;

      const result = await TrackingService.getLocationHistory(
        userId,
        startDateObj,
        endDateObj,
        pageNum,
        limitNum
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get user location history";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Start tracking for authenticated user
  static async startTracking(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const result = await TrackingService.startTracking(userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start tracking";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Stop tracking for authenticated user
  static async stopTracking(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const result = await TrackingService.stopTracking(userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to stop tracking";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Create emergency request
  static async createEmergencyRequest(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const userId = req.user!.userId;
      const emergencyData = req.body;

      // Validate required fields
      if (!emergencyData.latitude || !emergencyData.longitude) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      const result = await TrackingService.createEmergencyRequest(
        userId,
        emergencyData
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create emergency request";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Get emergency requests for organization
  static async getEmergencyRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId!;
      const { status, priority, page, limit } = req.query;

      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 20;

      const result = await TrackingService.getEmergencyRequests(
        organizationId,
        status as string,
        priority as string,
        pageNum,
        limitNum
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get emergency requests";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Acknowledge emergency request
  static async acknowledgeEmergencyRequest(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { requestId } = req.params;
      const acknowledgedBy = req.user!.userId;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const result = await TrackingService.acknowledgeEmergencyRequest(
        requestId,
        acknowledgedBy
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to acknowledge emergency request";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Resolve emergency request
  static async resolveEmergencyRequest(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { requestId } = req.params;
      const resolvedBy = req.user!.userId;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: "Request ID is required",
        });
      }

      const result = await TrackingService.resolveEmergencyRequest(
        requestId,
        resolvedBy
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to resolve emergency request";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // Get tracking statistics
  static async getTrackingStats(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId!;

      const result = await TrackingService.getTrackingStats(organizationId);

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get tracking statistics";

      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }
}
