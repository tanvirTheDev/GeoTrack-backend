import mongoose, { Document, Schema } from "mongoose";

// Refresh Token Interface
export interface IRefreshToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Password Reset Token Interface
export interface IPasswordResetToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Refresh Token Schema
const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    token: {
      type: String,
      required: [true, "Token is required"],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deviceInfo: {
      userAgent: {
        type: String,
        maxlength: [500, "User agent cannot exceed 500 characters"],
      },
      ipAddress: {
        type: String,
        maxlength: [45, "IP address cannot exceed 45 characters"],
      },
      deviceType: {
        type: String,
        enum: ["web", "mobile", "desktop", "unknown"],
        default: "unknown",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Password Reset Token Schema
const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    token: {
      type: String,
      required: [true, "Token is required"],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
  }
);

// Indexes for better query performance
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ isActive: 1 });
refreshTokenSchema.index({ expiresAt: 1 });

passwordResetTokenSchema.index({ userId: 1 });
passwordResetTokenSchema.index({ token: 1 });
passwordResetTokenSchema.index({ used: 1 });
passwordResetTokenSchema.index({ expiresAt: 1 });

// Static method to create refresh token
refreshTokenSchema.statics.createToken = function (
  userId: string,
  token: string,
  expiresAt: Date,
  deviceInfo?: any
) {
  return this.create({
    userId,
    token,
    expiresAt,
    deviceInfo,
  });
};

// Static method to find active token
refreshTokenSchema.statics.findActiveToken = function (token: string) {
  return this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to invalidate token
refreshTokenSchema.statics.invalidateToken = function (token: string) {
  return this.findOneAndUpdate({ token }, { isActive: false }, { new: true });
};

// Static method to invalidate all user tokens
refreshTokenSchema.statics.invalidateAllUserTokens = function (userId: string) {
  return this.updateMany({ userId, isActive: true }, { isActive: false });
};

// Static method to clean expired tokens
refreshTokenSchema.statics.cleanExpiredTokens = function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

// Static method to create password reset token
passwordResetTokenSchema.statics.createResetToken = function (
  userId: string,
  token: string,
  expiresAt: Date
) {
  return this.create({
    userId,
    token,
    expiresAt,
  });
};

// Static method to find valid reset token
passwordResetTokenSchema.statics.findValidToken = function (token: string) {
  return this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to mark token as used
passwordResetTokenSchema.statics.markAsUsed = function (token: string) {
  return this.findOneAndUpdate({ token }, { used: true }, { new: true });
};

// Static method to clean expired reset tokens
passwordResetTokenSchema.statics.cleanExpiredTokens = function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

// Create and export the models
const RefreshToken = mongoose.model<IRefreshToken>(
  "RefreshToken",
  refreshTokenSchema
);
const PasswordResetToken = mongoose.model<IPasswordResetToken>(
  "PasswordResetToken",
  passwordResetTokenSchema
);

export { PasswordResetToken, RefreshToken };
export default RefreshToken;
