import mongoose, { Document, Schema } from "mongoose";

// Organization Admin Interface
export interface IOrganizationAdmin extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  organizationId: mongoose.Types.ObjectId;
  status: "active" | "inactive" | "suspended";
  permissions: {
    canManageUsers: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
    canViewAnalytics: boolean;
    canManageDeliveryUsers: boolean;
    canViewLiveTracking: boolean;
  };
  lastLogin?: Date;
  createdBy: mongoose.Types.ObjectId; // Super Admin who created this admin
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  organizationName?: string;
  createdByName?: string;
}

// Organization Admin Schema
const organizationAdminSchema = new Schema<IOrganizationAdmin>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
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
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password in queries by default
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    permissions: {
      canManageUsers: {
        type: Boolean,
        default: true,
      },
      canViewReports: {
        type: Boolean,
        default: true,
      },
      canManageSettings: {
        type: Boolean,
        default: true,
      },
      canViewAnalytics: {
        type: Boolean,
        default: true,
      },
      canManageDeliveryUsers: {
        type: Boolean,
        default: true,
      },
      canViewLiveTracking: {
        type: Boolean,
        default: true,
      },
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        const { password, __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for better query performance
organizationAdminSchema.index({ email: 1 });
organizationAdminSchema.index({ organizationId: 1 });
organizationAdminSchema.index({ status: 1 });
organizationAdminSchema.index({ createdBy: 1 });
organizationAdminSchema.index({ createdAt: -1 });

// Virtual for organization name (populated)
organizationAdminSchema.virtual("organizationName", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for created by name (populated)
organizationAdminSchema.virtual("createdByName", {
  ref: "User",
  localField: "createdBy",
  foreignField: "_id",
  justOne: true,
});

// Pre-save middleware to validate organization exists
organizationAdminSchema.pre("save", async function (next) {
  try {
    const Organization = mongoose.model("Organization");
    const organization = await Organization.findById(this.organizationId);

    if (!organization) {
      return next(new Error("Organization not found"));
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Static method to find admin by email with organization populated
organizationAdminSchema.statics.findByEmailWithOrganization = function (
  email: string
) {
  return this.findOne({ email })
    .populate("organizationId", "name companyName")
    .populate("createdBy", "name email")
    .select("+password");
};

// Static method to find admins by organization
organizationAdminSchema.statics.findByOrganization = function (
  organizationId: string
) {
  return this.find({ organizationId })
    .populate("organizationId", "name companyName")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });
};

// Static method to find active admins
organizationAdminSchema.statics.findActiveAdmins = function () {
  return this.find({ status: "active" })
    .populate("organizationId", "name companyName")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });
};

// Instance method to update last login
organizationAdminSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Instance method to check if admin is active
organizationAdminSchema.methods.isActive = function () {
  return this.status === "active";
};

// Instance method to check if admin belongs to organization
organizationAdminSchema.methods.belongsToOrganization = function (
  organizationId: string
) {
  return this.organizationId?.toString() === organizationId;
};

// Instance method to check specific permission
organizationAdminSchema.methods.hasPermission = function (
  permission: keyof IOrganizationAdmin["permissions"]
) {
  return this.permissions[permission] === true;
};

// Instance method to update permissions
organizationAdminSchema.methods.updatePermissions = function (
  newPermissions: Partial<IOrganizationAdmin["permissions"]>
) {
  this.permissions = { ...this.permissions, ...newPermissions };
  return this.save();
};

// Create and export the model
const OrganizationAdmin = mongoose.model<IOrganizationAdmin>(
  "OrganizationAdmin",
  organizationAdminSchema
);

export default OrganizationAdmin;
