import { Server as SocketIOServer } from "socket.io";
import { AuthUtils } from "../auth/auth.utils";
import User from "../user/user.model";
import LocationTracking from "./tracking.model";

// Real-time tracking data interface
export interface RealtimeLocationData {
  userId: string;
  organizationId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    timestamp: Date;
  };
  deviceInfo?: {
    model?: string;
    os?: string;
    appVersion?: string;
  };
  batteryLevel?: number;
  networkType?: string;
  isActive: boolean;
}

// Socket room management
export interface SocketRoom {
  userId: string;
  organizationId: string;
  socketId: string;
  isTracking: boolean;
  lastUpdate: Date;
}

export class RealtimeTrackingService {
  private static io: SocketIOServer;
  public static activeConnections: Map<string, SocketRoom> = new Map();
  private static organizationRooms: Map<string, Set<string>> = new Map();

  // Initialize Socket.io server
  static initialize(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  // Setup Socket.io event handlers
  private static setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log("🔌 New client connected:", socket.id);

      // Handle authentication
      socket.on("authenticate", async (data: { token: string }) => {
        try {
          const decoded = AuthUtils.verifyAccessToken(data.token);
          if (!decoded) {
            socket.emit("auth_error", { message: "Invalid token" });
            return;
          }

          // Join user-specific room
          const userRoom = `user_${decoded.userId}`;
          const orgRoom = `org_${decoded.organizationId}`;

          await socket.join(userRoom);
          await socket.join(orgRoom);

          // Store connection info
          this.activeConnections.set(socket.id, {
            userId: decoded.userId,
            organizationId: decoded.organizationId!,
            socketId: socket.id,
            isTracking: false,
            lastUpdate: new Date(),
          });

          // Add to organization room
          if (!this.organizationRooms.has(decoded.organizationId!)) {
            this.organizationRooms.set(decoded.organizationId!, new Set());
          }
          this.organizationRooms.get(decoded.organizationId!)!.add(socket.id);

          socket.emit("authenticated", {
            success: true,
            userId: decoded.userId,
            organizationId: decoded.organizationId,
          });

          console.log(
            `✅ User ${decoded.userId} authenticated and joined rooms`
          );
        } catch (error) {
          socket.emit("auth_error", { message: "Authentication failed" });
        }
      });

      // Handle location updates from delivery users
      socket.on("location_update", async (data: RealtimeLocationData) => {
        try {
          const connection = this.activeConnections.get(socket.id);
          if (!connection) {
            socket.emit("error", { message: "Not authenticated" });
            return;
          }

          // Update location in database
          await this.updateLocationInDatabase(data);

          // Broadcast to organization admins
          const orgRoom = `org_${connection.organizationId}`;
          this.io.to(orgRoom).emit("location_updated", {
            ...data,
            socketId: socket.id,
            timestamp: new Date(),
          });

          // Share location with customers
          const customerRoom = `customer_${data.userId}`;
          this.io.to(customerRoom).emit("delivery_location_update", {
            userId: data.userId,
            location: data.location,
            timestamp: new Date(),
            isActive: data.isActive,
          });

          // Update connection info
          connection.isTracking = data.isActive;
          connection.lastUpdate = new Date();

          console.log(
            `📍 Location updated for user ${data.userId} - Shared with customers`
          );
        } catch (error) {
          socket.emit("error", { message: "Failed to update location" });
          console.error("Location update error:", error);
        }
      });

      // Handle start tracking
      socket.on("start_tracking", async (data: { userId: string }) => {
        try {
          const connection = this.activeConnections.get(socket.id);
          if (!connection) {
            socket.emit("error", { message: "Not authenticated" });
            return;
          }

          // Start tracking in database
          await this.startTrackingInDatabase(
            data.userId,
            connection.organizationId
          );

          // Update connection
          connection.isTracking = true;

          // Notify organization admins
          const orgRoom = `org_${connection.organizationId}`;
          this.io.to(orgRoom).emit("tracking_started", {
            userId: data.userId,
            timestamp: new Date(),
          });

          // Create customer room for sharing location with customers
          const customerRoom = `customer_${data.userId}`;
          await socket.join(customerRoom);

          // Notify customers that tracking has started
          this.io.to(customerRoom).emit("delivery_tracking_started", {
            userId: data.userId,
            message: "Delivery tracking has started",
            timestamp: new Date(),
          });

          socket.emit("tracking_started", { success: true });
          console.log(
            `🚀 Tracking started for user ${data.userId} - Location shared with customers`
          );
        } catch (error) {
          socket.emit("error", { message: "Failed to start tracking" });
        }
      });

      // Handle stop tracking
      socket.on("stop_tracking", async (data: { userId: string }) => {
        try {
          const connection = this.activeConnections.get(socket.id);
          if (!connection) {
            socket.emit("error", { message: "Not authenticated" });
            return;
          }

          // Stop tracking in database
          await this.stopTrackingInDatabase(data.userId);

          // Update connection
          connection.isTracking = false;

          // Notify organization admins
          const orgRoom = `org_${connection.organizationId}`;
          this.io.to(orgRoom).emit("tracking_stopped", {
            userId: data.userId,
            timestamp: new Date(),
          });

          socket.emit("tracking_stopped", { success: true });
          console.log(`⏹️ Tracking stopped for user ${data.userId}`);
        } catch (error) {
          socket.emit("error", { message: "Failed to stop tracking" });
        }
      });

      // Handle emergency request
      socket.on(
        "emergency_request",
        async (data: {
          userId: string;
          location: {
            latitude: number;
            longitude: number;
            accuracy?: number;
          };
          message?: string;
          priority?: string;
        }) => {
          try {
            const connection = this.activeConnections.get(socket.id);
            if (!connection) {
              socket.emit("error", { message: "Not authenticated" });
              return;
            }

            // Create emergency request in database
            const emergencyData = await this.createEmergencyRequest({
              userId: data.userId,
              organizationId: connection.organizationId,
              location: data.location,
              message: data.message,
              priority: data.priority || "medium",
            });

            // Broadcast to organization admins
            const orgRoom = `org_${connection.organizationId}`;
            this.io.to(orgRoom).emit("emergency_alert", {
              ...emergencyData,
              timestamp: new Date(),
            });

            socket.emit("emergency_sent", { success: true });
            console.log(`🚨 Emergency request from user ${data.userId}`);
          } catch (error) {
            socket.emit("error", {
              message: "Failed to send emergency request",
            });
          }
        }
      );

      // Handle disconnect
      socket.on("disconnect", () => {
        const connection = this.activeConnections.get(socket.id);
        if (connection) {
          // Remove from organization room
          const orgRoom = this.organizationRooms.get(connection.organizationId);
          if (orgRoom) {
            orgRoom.delete(socket.id);
            if (orgRoom.size === 0) {
              this.organizationRooms.delete(connection.organizationId);
            }
          }

          // Notify organization admins about disconnection
          if (connection.isTracking) {
            const orgRoom = `org_${connection.organizationId}`;
            this.io.to(orgRoom).emit("user_disconnected", {
              userId: connection.userId,
              timestamp: new Date(),
            });
          }

          this.activeConnections.delete(socket.id);
          console.log(`❌ User ${connection.userId} disconnected`);
        }
      });
    });
  }

  // Update location in database
  private static async updateLocationInDatabase(data: RealtimeLocationData) {
    const existingTracking = await LocationTracking.findOne({
      userId: data.userId,
      isActive: true,
    });

    if (existingTracking) {
      existingTracking.location = data.location;
      existingTracking.batteryLevel = data.batteryLevel;
      existingTracking.networkType = data.networkType;
      existingTracking.deviceInfo = data.deviceInfo;
      existingTracking.isActive = data.isActive;
      existingTracking.updatedAt = new Date();
      await existingTracking.save();
    } else {
      const newTracking = new LocationTracking({
        userId: data.userId,
        organizationId: data.organizationId,
        location: data.location,
        isActive: data.isActive,
        batteryLevel: data.batteryLevel,
        networkType: data.networkType,
        deviceInfo: data.deviceInfo,
      });
      await newTracking.save();
    }
  }

  // Start tracking in database
  private static async startTrackingInDatabase(
    userId: string,
    organizationId: string
  ) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const existingTracking = await LocationTracking.findOne({
      userId,
      isActive: true,
    });
    if (existingTracking) {
      existingTracking.isActive = true;
      await existingTracking.save();
    } else {
      const newTracking = new LocationTracking({
        userId,
        organizationId,
        location: {
          latitude: 0,
          longitude: 0,
          timestamp: new Date(),
        },
        isActive: true,
      });
      await newTracking.save();
    }
  }

  // Stop tracking in database
  private static async stopTrackingInDatabase(userId: string) {
    const tracking = await LocationTracking.findOne({ userId, isActive: true });
    if (tracking) {
      tracking.isActive = false;
      await tracking.save();
    }
  }

  // Create emergency request
  private static async createEmergencyRequest(data: {
    userId: string;
    organizationId: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    message?: string;
    priority?: string;
  }) {
    // This would integrate with your existing emergency request system
    // For now, we'll just return the data
    return {
      userId: data.userId,
      organizationId: data.organizationId,
      location: data.location,
      message: data.message,
      priority: data.priority,
      status: "pending",
      timestamp: new Date(),
    };
  }

  // Get active connections for an organization
  static getActiveConnections(organizationId: string): SocketRoom[] {
    const orgConnections = this.organizationRooms.get(organizationId);
    if (!orgConnections) return [];

    return Array.from(orgConnections)
      .map((socketId) => this.activeConnections.get(socketId))
      .filter((connection) => connection !== undefined) as SocketRoom[];
  }

  // Get all active tracking users for organization (Organization Admin)
  static async getActiveTrackingUsers(organizationId: string) {
    const activeConnections = this.getActiveConnections(organizationId);
    const trackingUsers = [];

    for (const connection of activeConnections) {
      if (connection.isTracking) {
        const user = await User.findById(connection.userId).select(
          "name email role"
        );
        const tracking = await LocationTracking.findOne({
          userId: connection.userId,
          isActive: true,
        });

        if (user && tracking) {
          trackingUsers.push({
            user,
            location: tracking.location,
            deviceInfo: tracking.deviceInfo,
            batteryLevel: tracking.batteryLevel,
            networkType: tracking.networkType,
            lastUpdate: connection.lastUpdate,
          });
        }
      }
    }

    return trackingUsers;
  }

  // Get ALL active tracking users (Super Admin only)
  static async getAllActiveTrackingUsers() {
    const allConnections = Array.from(this.activeConnections.values());
    const trackingUsers = [];

    for (const connection of allConnections) {
      if (connection.isTracking) {
        const user = await User.findById(connection.userId)
          .select("name email role organizationId")
          .populate("organizationId", "name companyName");
        const tracking = await LocationTracking.findOne({
          userId: connection.userId,
          isActive: true,
        });

        if (user && tracking) {
          trackingUsers.push({
            user,
            location: tracking.location,
            deviceInfo: tracking.deviceInfo,
            batteryLevel: tracking.batteryLevel,
            networkType: tracking.networkType,
            lastUpdate: connection.lastUpdate,
            organization: user.organizationId,
          });
        }
      }
    }

    return trackingUsers;
  }

  // Send message to specific user
  static sendToUser(userId: string, event: string, data: any) {
    const userRoom = `user_${userId}`;
    this.io.to(userRoom).emit(event, data);
  }

  // Send message to organization
  static sendToOrganization(organizationId: string, event: string, data: any) {
    const orgRoom = `org_${organizationId}`;
    this.io.to(orgRoom).emit(event, data);
  }

  // Broadcast to all connected clients
  static broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
}
