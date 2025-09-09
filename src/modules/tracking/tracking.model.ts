import mongoose, { Document, Schema } from "mongoose";

// Location interface
export interface ILocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

// Emergency request interface
export interface IEmergencyRequest {
  userId: string;
  organizationId: string;
  location: ILocation;
  message?: string;
  status: "pending" | "acknowledged" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
}

// Location tracking interface
export interface ILocationTracking extends Document {
  userId: string;
  organizationId: string;
  location: ILocation;
  isActive: boolean;
  batteryLevel?: number;
  networkType?: string;
  deviceInfo?: {
    model?: string;
    os?: string;
    appVersion?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Location history interface
export interface ILocationHistory extends Document {
  userId: string;
  organizationId: string;
  locations: ILocation[];
  date: Date;
  totalDistance?: number;
  totalTime?: number;
  averageSpeed?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Location Tracking Schema
const locationTrackingSchema = new Schema<ILocationTracking>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      ref: "Organization",
      required: true,
      index: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
      accuracy: {
        type: Number,
        min: 0,
      },
      altitude: {
        type: Number,
      },
      speed: {
        type: Number,
        min: 0,
      },
      heading: {
        type: Number,
        min: 0,
        max: 360,
      },
      timestamp: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    networkType: {
      type: String,
      enum: ["wifi", "4g", "5g", "3g", "2g", "unknown"],
    },
    deviceInfo: {
      model: String,
      os: String,
      appVersion: String,
    },
  },
  {
    timestamps: true,
  }
);

// Location History Schema
const locationHistorySchema = new Schema<ILocationHistory>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      ref: "Organization",
      required: true,
      index: true,
    },
    locations: [
      {
        latitude: {
          type: Number,
          required: true,
          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,
          required: true,
          min: -180,
          max: 180,
        },
        accuracy: {
          type: Number,
          min: 0,
        },
        altitude: {
          type: Number,
        },
        speed: {
          type: Number,
          min: 0,
        },
        heading: {
          type: Number,
          min: 0,
          max: 360,
        },
        timestamp: {
          type: Date,
          required: true,
        },
      },
    ],
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalDistance: {
      type: Number,
      min: 0,
    },
    totalTime: {
      type: Number,
      min: 0,
    },
    averageSpeed: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Emergency Request Schema
const emergencyRequestSchema = new Schema<IEmergencyRequest>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      ref: "Organization",
      required: true,
      index: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
      accuracy: {
        type: Number,
        min: 0,
      },
      altitude: {
        type: Number,
      },
      speed: {
        type: Number,
        min: 0,
      },
      heading: {
        type: Number,
        min: 0,
        max: 360,
      },
      timestamp: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    message: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "acknowledged", "resolved"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: String,
      ref: "User",
    },
    resolvedBy: {
      type: String,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
locationTrackingSchema.index({ userId: 1, createdAt: -1 });
locationTrackingSchema.index({ organizationId: 1, isActive: 1 });
locationTrackingSchema.index({ "location.timestamp": -1 });

locationHistorySchema.index({ userId: 1, date: -1 });
locationHistorySchema.index({ organizationId: 1, date: -1 });

emergencyRequestSchema.index({ userId: 1, status: 1 });
emergencyRequestSchema.index({ organizationId: 1, status: 1 });
emergencyRequestSchema.index({ status: 1, priority: 1 });
emergencyRequestSchema.index({ createdAt: -1 });

// Virtual for distance calculation
locationTrackingSchema.virtual("distanceFromPrevious").get(function () {
  // This would be calculated based on previous location
  return 0; // Placeholder
});

// Methods
locationTrackingSchema.methods.calculateDistance = function (
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.toRadians(lat2 - this.location.latitude);
  const dLon = this.toRadians(lon2 - this.location.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRadians(this.location.latitude)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

locationTrackingSchema.methods.toRadians = function (degrees: number): number {
  return degrees * (Math.PI / 180);
};

// Static methods
locationTrackingSchema.statics.findActiveByUser = function (userId: string) {
  return this.findOne({ userId, isActive: true });
};

locationTrackingSchema.statics.findByOrganization = function (
  organizationId: string,
  limit = 100
) {
  return this.find({ organizationId, isActive: true })
    .populate("userId", "name email")
    .sort({ "location.timestamp": -1 })
    .limit(limit);
};

locationHistorySchema.statics.findByUserAndDate = function (
  userId: string,
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.findOne({
    userId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });
};

emergencyRequestSchema.statics.findPendingByOrganization = function (
  organizationId: string
) {
  return this.find({ organizationId, status: "pending" })
    .populate("userId", "name email")
    .sort({ priority: -1, createdAt: -1 });
};

// Transform toJSON
locationTrackingSchema.set("toJSON", {
  transform: function (doc, ret) {
    const { __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

locationHistorySchema.set("toJSON", {
  transform: function (doc, ret) {
    const { __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

emergencyRequestSchema.set("toJSON", {
  transform: function (doc, ret) {
    const { __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

// Models
export const LocationTracking = mongoose.model<ILocationTracking>(
  "LocationTracking",
  locationTrackingSchema
);
export const LocationHistory = mongoose.model<ILocationHistory>(
  "LocationHistory",
  locationHistorySchema
);
export const EmergencyRequest = mongoose.model<IEmergencyRequest>(
  "EmergencyRequest",
  emergencyRequestSchema
);

export default LocationTracking;
