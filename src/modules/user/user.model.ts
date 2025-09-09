import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "../auth/auth.interface";

// User Interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId?: mongoose.Types.ObjectId;
  status: "active" | "inactive" | "suspended";
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  organizationName?: string;
}

// User Schema
const userSchema = new Schema<IUser>(
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
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, "Role is required"],
      default: UserRole.DELIVERY_USER,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: function (this: IUser) {
        // Organization is required for admin and delivery_user roles
        return (
          this.role === UserRole.ADMIN || this.role === UserRole.DELIVERY_USER
        );
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    lastLogin: {
      type: Date,
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
userSchema.index({ email: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for organization name (populated)
userSchema.virtual("organizationName", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});

// Pre-save middleware to validate organization requirement
userSchema.pre("save", function (next) {
  if (
    (this.role === UserRole.ADMIN || this.role === UserRole.DELIVERY_USER) &&
    !this.organizationId
  ) {
    return next(
      new Error("Organization is required for admin and delivery user roles")
    );
  }
  next();
});

// Static method to find user by email with organization populated
userSchema.statics.findByEmailWithOrganization = function (email: string) {
  return this.findOne({ email })
    .populate("organizationId", "name companyName")
    .select("+password");
};

// Static method to find users by organization
userSchema.statics.findByOrganization = function (organizationId: string) {
  return this.find({ organizationId })
    .populate("organizationId", "name companyName")
    .sort({ createdAt: -1 });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ status: "active" })
    .populate("organizationId", "name companyName")
    .sort({ createdAt: -1 });
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Instance method to check if user is active
userSchema.methods.isActive = function () {
  return this.status === "active";
};

// Instance method to check if user belongs to organization
userSchema.methods.belongsToOrganization = function (organizationId: string) {
  return this.organizationId?.toString() === organizationId;
};

// Create and export the model
const User = mongoose.model<IUser>("User", userSchema);

export default User;
