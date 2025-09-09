import User from "../user/user.model";
import {
  default as EmergencyRequest,
  ILocation,
  default as LocationHistory,
  default as LocationTracking,
} from "./tracking.model";

// Tracking Service Response Interface
export interface TrackingResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Location update data interface
export interface LocationUpdateData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  networkType?: string;
  deviceInfo?: {
    model?: string;
    os?: string;
    appVersion?: string;
  };
}

// Emergency request data interface
export interface EmergencyRequestData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  message?: string;
  priority?: "low" | "medium" | "high" | "critical";
}

// Location history query interface
export interface LocationHistoryQuery {
  userId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class TrackingService {
  // Update user location
  static async updateLocation(
    userId: string,
    locationData: LocationUpdateData
  ): Promise<TrackingResponse> {
    try {
      // Verify user exists and is active
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      if (user.status !== "active") {
        return {
          success: false,
          message: "User account is not active",
        };
      }

      // Validate location data
      if (!locationData.latitude || !locationData.longitude) {
        return {
          success: false,
          message: "Latitude and longitude are required",
        };
      }

      if (locationData.latitude < -90 || locationData.latitude > 90) {
        return {
          success: false,
          message: "Invalid latitude value",
        };
      }

      if (locationData.longitude < -180 || locationData.longitude > 180) {
        return {
          success: false,
          message: "Invalid longitude value",
        };
      }

      // Create location object
      const location: ILocation = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        altitude: locationData.altitude,
        speed: locationData.speed,
        heading: locationData.heading,
        timestamp: new Date(),
      };

      // Update or create location tracking
      const existingTracking = await LocationTracking.findOne({
        userId,
        isActive: true,
      });

      if (existingTracking) {
        // Update existing tracking
        existingTracking.location = location;
        existingTracking.batteryLevel = locationData.batteryLevel;
        existingTracking.networkType = locationData.networkType;
        existingTracking.deviceInfo = locationData.deviceInfo;
        existingTracking.updatedAt = new Date();

        await existingTracking.save();
      } else {
        // Create new tracking record
        const newTracking = new LocationTracking({
          userId,
          organizationId: user.organizationId,
          location,
          isActive: true,
          batteryLevel: locationData.batteryLevel,
          networkType: locationData.networkType,
          deviceInfo: locationData.deviceInfo,
        });

        await newTracking.save();
      }

      // Add to daily history
      await this.addToDailyHistory(
        userId,
        user.organizationId!.toString(),
        location
      );

      return {
        success: true,
        message: "Location updated successfully",
        data: { location },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update location"
      );
    }
  }

  // Get current location of a user
  static async getCurrentLocation(userId: string): Promise<TrackingResponse> {
    try {
      const tracking = await LocationTracking.findOne({
        userId,
        isActive: true,
      })
        .populate("userId", "name email")
        .populate("organizationId", "name companyName");

      if (!tracking) {
        return {
          success: false,
          message: "No active location tracking found",
        };
      }

      return {
        success: true,
        message: "Current location retrieved successfully",
        data: tracking,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get current location"
      );
    }
  }

  // Get all active locations for an organization
  static async getActiveLocations(
    organizationId: string
  ): Promise<TrackingResponse> {
    try {
      const locations = await LocationTracking.find({
        organizationId,
        isActive: true,
      })
        .populate("userId", "name email role")
        .populate("organizationId", "name companyName")
        .sort({ "location.timestamp": -1 });

      return {
        success: true,
        message: "Active locations retrieved successfully",
        data: locations,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get active locations"
      );
    }
  }

  // Get location history for a user
  static async getLocationHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    page = 1,
    limit = 50
  ): Promise<TrackingResponse> {
    try {
      const query: any = { userId };

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const skip = (page - 1) * limit;

      const history = await LocationHistory.find(query)
        .populate("userId", "name email")
        .populate("organizationId", "name companyName")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);

      const total = await LocationHistory.countDocuments(query);

      return {
        success: true,
        message: "Location history retrieved successfully",
        data: {
          history,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get location history"
      );
    }
  }

  // Start tracking for a user
  static async startTracking(userId: string): Promise<TrackingResponse> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check if already tracking
      const existingTracking = await LocationTracking.findOne({
        userId,
        isActive: true,
      });
      if (existingTracking) {
        return {
          success: false,
          message: "User is already being tracked",
        };
      }

      // Create new tracking record
      const newTracking = new LocationTracking({
        userId,
        organizationId: user.organizationId,
        location: {
          latitude: 0,
          longitude: 0,
          timestamp: new Date(),
        },
        isActive: true,
      });

      await newTracking.save();

      return {
        success: true,
        message: "Tracking started successfully",
        data: newTracking,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to start tracking"
      );
    }
  }

  // Stop tracking for a user
  static async stopTracking(userId: string): Promise<TrackingResponse> {
    try {
      const tracking = await LocationTracking.findOne({
        userId,
        isActive: true,
      });

      if (!tracking) {
        return {
          success: false,
          message: "No active tracking found",
        };
      }

      tracking.isActive = false;
      await tracking.save();

      return {
        success: true,
        message: "Tracking stopped successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to stop tracking"
      );
    }
  }

  // Create emergency request
  static async createEmergencyRequest(
    userId: string,
    emergencyData: EmergencyRequestData
  ): Promise<TrackingResponse> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      if (user.status !== "active") {
        return {
          success: false,
          message: "User account is not active",
        };
      }

      // Validate location data
      if (!emergencyData.latitude || !emergencyData.longitude) {
        return {
          success: false,
          message: "Latitude and longitude are required",
        };
      }

      const emergencyRequest = new EmergencyRequest({
        userId,
        organizationId: user.organizationId!.toString(),
        location: {
          latitude: emergencyData.latitude,
          longitude: emergencyData.longitude,
          accuracy: emergencyData.accuracy,
          timestamp: new Date(),
        },
        message: emergencyData.message,
        priority: emergencyData.priority || "medium",
        status: "pending",
      });

      await emergencyRequest.save();

      return {
        success: true,
        message: "Emergency request created successfully",
        data: emergencyRequest,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create emergency request"
      );
    }
  }

  // Get emergency requests for an organization
  static async getEmergencyRequests(
    organizationId: string,
    status?: string,
    priority?: string,
    page = 1,
    limit = 20
  ): Promise<TrackingResponse> {
    try {
      const query: any = { organizationId };

      if (status) query.status = status;
      if (priority) query.priority = priority;

      const skip = (page - 1) * limit;

      const requests = await EmergencyRequest.find(query)
        .populate("userId", "name email phone")
        .populate("acknowledgedBy", "name email")
        .populate("resolvedBy", "name email")
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await EmergencyRequest.countDocuments(query);

      return {
        success: true,
        message: "Emergency requests retrieved successfully",
        data: {
          requests,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get emergency requests"
      );
    }
  }

  // Acknowledge emergency request
  static async acknowledgeEmergencyRequest(
    requestId: string,
    acknowledgedBy: string
  ): Promise<TrackingResponse> {
    try {
      const request = (await EmergencyRequest.findById(requestId)) as any;

      if (!request) {
        return {
          success: false,
          message: "Emergency request not found",
        };
      }

      if (request.status !== "pending") {
        return {
          success: false,
          message: "Emergency request is not pending",
        };
      }

      request.status = "acknowledged";
      request.acknowledgedBy = acknowledgedBy;
      request.acknowledgedAt = new Date();

      await request.save();

      return {
        success: true,
        message: "Emergency request acknowledged successfully",
        data: request,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to acknowledge emergency request"
      );
    }
  }

  // Resolve emergency request
  static async resolveEmergencyRequest(
    requestId: string,
    resolvedBy: string
  ): Promise<TrackingResponse> {
    try {
      const request = (await EmergencyRequest.findById(requestId)) as any;

      if (!request) {
        return {
          success: false,
          message: "Emergency request not found",
        };
      }

      if (request.status === "resolved") {
        return {
          success: false,
          message: "Emergency request is already resolved",
        };
      }

      request.status = "resolved";
      request.resolvedBy = resolvedBy;
      request.resolvedAt = new Date();

      await request.save();

      return {
        success: true,
        message: "Emergency request resolved successfully",
        data: request,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to resolve emergency request"
      );
    }
  }

  // Get tracking statistics
  static async getTrackingStats(
    organizationId: string
  ): Promise<TrackingResponse> {
    try {
      const [
        totalUsers,
        activeTracking,
        totalEmergencyRequests,
        pendingEmergencyRequests,
        resolvedEmergencyRequests,
      ] = await Promise.all([
        User.countDocuments({ organizationId, status: "active" }),
        LocationTracking.countDocuments({ organizationId, isActive: true }),
        EmergencyRequest.countDocuments({ organizationId }),
        EmergencyRequest.countDocuments({ organizationId, status: "pending" }),
        EmergencyRequest.countDocuments({ organizationId, status: "resolved" }),
      ]);

      const stats = {
        totalUsers,
        activeTracking,
        totalEmergencyRequests,
        pendingEmergencyRequests,
        resolvedEmergencyRequests,
        trackingPercentage:
          totalUsers > 0 ? (activeTracking / totalUsers) * 100 : 0,
        emergencyResolutionRate:
          totalEmergencyRequests > 0
            ? (resolvedEmergencyRequests / totalEmergencyRequests) * 100
            : 0,
      };

      return {
        success: true,
        message: "Tracking statistics retrieved successfully",
        data: stats,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get tracking statistics"
      );
    }
  }

  // Helper method to add location to daily history
  private static async addToDailyHistory(
    userId: string,
    organizationId: string,
    location: ILocation
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let history = (await LocationHistory.findOne({
        userId,
        organizationId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      })) as any;

      if (!history) {
        history = new LocationHistory({
          userId,
          organizationId,
          locations: [location],
          date: today,
        });
      } else {
        history.locations.push(location);
      }

      // Calculate total distance and time
      if (history.locations.length > 1) {
        let totalDistance = 0;
        for (let i = 1; i < history.locations.length; i++) {
          const prev = history.locations[i - 1];
          const curr = history.locations[i];
          totalDistance += this.calculateDistance(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );
        }

        const totalTime =
          (history.locations[history.locations.length - 1].timestamp.getTime() -
            history.locations[0].timestamp.getTime()) /
          1000; // in seconds

        history.totalDistance = totalDistance;
        history.totalTime = totalTime;
        history.averageSpeed =
          totalTime > 0 ? (totalDistance / totalTime) * 3600 : 0; // km/h
      }

      await history.save();
    } catch (error) {
      // Don't throw error for history logging
      console.error("Failed to add to daily history:", error);
    }
  }

  // Helper method to calculate distance between two points
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
