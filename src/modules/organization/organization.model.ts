import mongoose, { Document, Schema } from "mongoose";

// Organization Interface
export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  companyName: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  status: "active" | "inactive" | "suspended";
  packageType: "basic" | "premium" | "platinum";
  maxUsers: number;
  currentUsers: number;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  userCount?: number;
  isSubscriptionActive?: boolean;
}

// Organization Schema
const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      minlength: [2, "Organization name must be at least 2 characters"],
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [100, "Company name cannot exceed 100 characters"],
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please provide a valid phone number"],
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, "Street address cannot exceed 200 characters"],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, "City name cannot exceed 50 characters"],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, "State name cannot exceed 50 characters"],
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, "Country name cannot exceed 50 characters"],
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: [20, "Zip code cannot exceed 20 characters"],
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    packageType: {
      type: String,
      enum: ["basic", "premium", "platinum"],
      required: [true, "Package type is required"],
      default: "basic",
    },
    maxUsers: {
      type: Number,
      required: [true, "Maximum users is required"],
      min: [1, "Maximum users must be at least 1"],
      default: 10,
    },
    currentUsers: {
      type: Number,
      default: 0,
      min: [0, "Current users cannot be negative"],
    },
    subscriptionStartDate: {
      type: Date,
      required: [true, "Subscription start date is required"],
      default: Date.now,
    },
    subscriptionEndDate: {
      type: Date,
      required: [true, "Subscription end date is required"],
      validate: {
        validator: function (this: IOrganization, value: Date) {
          return value > this.subscriptionStartDate;
        },
        message: "Subscription end date must be after start date",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for better query performance
organizationSchema.index({ companyName: 1 });
organizationSchema.index({ email: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ packageType: 1 });
organizationSchema.index({ createdAt: -1 });
organizationSchema.index({ subscriptionEndDate: 1 });

// Virtual for user count
organizationSchema.virtual("userCount", {
  ref: "User",
  localField: "_id",
  foreignField: "organizationId",
  count: true,
});

// Virtual for subscription status
organizationSchema.virtual("isSubscriptionActive").get(function () {
  const now = new Date();
  return (
    this.isActive && this.status === "active" && now <= this.subscriptionEndDate
  );
});

// Pre-save middleware to validate subscription dates
organizationSchema.pre("save", function (next) {
  if (this.subscriptionEndDate <= this.subscriptionStartDate) {
    return next(new Error("Subscription end date must be after start date"));
  }
  next();
});

// Pre-save middleware to update current users count
organizationSchema.pre("save", async function (next) {
  if (this.isModified("currentUsers")) {
    if (this.currentUsers > this.maxUsers) {
      return next(new Error("Current users cannot exceed maximum users"));
    }
  }
  next();
});

// Static method to find active organizations
organizationSchema.statics.findActiveOrganizations = function () {
  return this.find({ status: "active", isActive: true }).sort({
    createdAt: -1,
  });
};

// Static method to find organizations by package type
organizationSchema.statics.findByPackageType = function (packageType: string) {
  return this.find({ packageType, status: "active" }).sort({ createdAt: -1 });
};

// Static method to find organizations with expiring subscriptions
organizationSchema.statics.findExpiringSubscriptions = function (
  days: number = 7
) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  return this.find({
    status: "active",
    isActive: true,
    subscriptionEndDate: { $lte: expiryDate },
  }).sort({ subscriptionEndDate: 1 });
};

// Static method to find organizations by status
organizationSchema.statics.findByStatus = function (status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Instance method to check if organization can add more users
organizationSchema.methods.canAddUser = function () {
  return this.currentUsers < this.maxUsers && this.isSubscriptionActive;
};

// Instance method to increment user count
organizationSchema.methods.incrementUserCount = function () {
  if (this.canAddUser()) {
    this.currentUsers += 1;
    return this.save();
  }
  throw new Error(
    "Cannot add more users. Maximum limit reached or subscription expired"
  );
};

// Instance method to decrement user count
organizationSchema.methods.decrementUserCount = function () {
  if (this.currentUsers > 0) {
    this.currentUsers -= 1;
    return this.save();
  }
  throw new Error("Current users count cannot be negative");
};

// Instance method to update subscription
organizationSchema.methods.updateSubscription = function (
  packageType: string,
  maxUsers: number,
  endDate: Date
) {
  this.packageType = packageType;
  this.maxUsers = maxUsers;
  this.subscriptionEndDate = endDate;
  return this.save();
};

// Instance method to suspend organization
organizationSchema.methods.suspend = function () {
  this.status = "suspended";
  this.isActive = false;
  return this.save();
};

// Instance method to activate organization
organizationSchema.methods.activate = function () {
  this.status = "active";
  this.isActive = true;
  return this.save();
};

// Create and export the model
const Organization = mongoose.model<IOrganization>(
  "Organization",
  organizationSchema
);

export default Organization;
