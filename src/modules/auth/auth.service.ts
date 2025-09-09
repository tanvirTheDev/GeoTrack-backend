import DeliveryUser from "../deliveryUser/delivery.model";
import OrganizationAdmin from "../organizationAdmin/organizationAdmin.model";
import User from "../user/user.model";
import {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPasswordRequest,
} from "./auth.interface";
import { PasswordResetToken, RefreshToken } from "./auth.model";
import { AuthUtils } from "./auth.utils";

export class AuthService {
  // Login Service
  static async login(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      const { email, password } = loginData;

      // Try to find user in different models
      let user: any = null;
      let userRole: string = "";

      // Check User model first
      user = await User.findOne({ email })
        .populate("organizationId", "name companyName")
        .select("+password");

      if (user) {
        userRole = user.role;
      } else {
        // Check OrganizationAdmin model
        user = await OrganizationAdmin.findOne({ email })
          .populate("organizationId", "name companyName")
          .select("+password");

        if (user) {
          userRole = "organization_admin";
        } else {
          // Check DeliveryUser model
          user = await DeliveryUser.findOne({ email })
            .populate("organizationId", "name companyName")
            .select("+password");

          if (user) {
            userRole = "delivery_user";
          }
        }
      }

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check if user is active
      if (user.status !== "active") {
        throw new Error("Account is not active. Please contact administrator");
      }

      // Verify password
      const isValidPassword = await AuthUtils.comparePassword(
        password,
        user.password
      );

      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }

      // Generate tokens
      const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: userRole as any,
        organizationId:
          typeof user.organizationId === "object"
            ? user.organizationId._id?.toString()
            : user.organizationId?.toString(),
      };

      const tokens = AuthUtils.generateTokens(tokenPayload);

      // Store refresh token in database for security
      await RefreshToken.create({
        userId: user._id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true,
      });

      // Get dashboard URL based on role
      const dashboardUrl = AuthUtils.getDashboardUrl(userRole as any);

      return {
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: userRole,
            organizationId:
              typeof user.organizationId === "object"
                ? user.organizationId._id?.toString()
                : user.organizationId?.toString(),
            organizationName: user.organizationName, // From populated organization
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          },
          dashboardUrl,
        },
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  }

  // Refresh Token Service
  static async refreshToken(
    refreshData: RefreshTokenRequest
  ): Promise<RefreshTokenResponse> {
    try {
      const { refreshToken } = refreshData;

      // Verify refresh token
      const decoded = AuthUtils.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database and is active
      const tokenRecord = await RefreshToken.findOne({
        token: refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });
      const isValidRefreshToken = !!tokenRecord;

      if (!isValidRefreshToken) {
        throw new Error("Invalid refresh token");
      }

      // Generate new access token
      const newAccessToken = AuthUtils.generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        organizationId: decoded.organizationId,
      });

      return {
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccessToken,
          expiresIn: 15 * 60 * 1000, // 15 minutes
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Token refresh failed"
      );
    }
  }

  // Forgot Password Service
  static async forgotPassword(
    forgotData: ForgotPasswordRequest
  ): Promise<void> {
    try {
      const { email } = forgotData;

      // Find user by email
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if email exists or not for security
        return;
      }

      // Generate reset token
      const resetToken = AuthUtils.generateResetToken();
      const resetTokenExpiry = AuthUtils.generateResetTokenExpiry();

      // Store reset token in database
      await PasswordResetToken.create({
        userId: user._id,
        token: resetToken,
        expiresAt: resetTokenExpiry,
        used: false,
      });

      // TODO: Send email with reset token
      await this.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Password reset request failed"
      );
    }
  }

  // Reset Password Service
  static async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    try {
      const { token, newPassword, confirmPassword } = resetData;

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Validate password strength
      const passwordValidation =
        AuthUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(", "));
      }

      // Find and validate reset token
      const resetTokenData = await PasswordResetToken.findOne({
        token: token,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!resetTokenData) {
        throw new Error("Invalid or expired reset token");
      }

      // Hash new password
      const hashedPassword = await AuthUtils.hashPassword(newPassword);

      // Update user password and mark reset token as used
      await User.findByIdAndUpdate(resetTokenData.userId, {
        password: hashedPassword,
      });
      await PasswordResetToken.findByIdAndUpdate(resetTokenData._id, {
        used: true,
      });

      // Invalidate all refresh tokens for security
      await RefreshToken.updateMany(
        { userId: resetTokenData.userId, isActive: true },
        { isActive: false }
      );
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Password reset failed"
      );
    }
  }

  // Change Password Service
  static async changePassword(
    userId: string,
    changeData: ChangePasswordRequest
  ): Promise<void> {
    try {
      const { currentPassword, newPassword, confirmPassword } = changeData;

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }

      // Validate password strength
      const passwordValidation =
        AuthUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(", "));
      }

      // Find user
      const user = await User.findById(userId).select("+password");
      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isValidCurrentPassword = await AuthUtils.comparePassword(
        currentPassword,
        user.password
      );
      if (!isValidCurrentPassword) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await AuthUtils.hashPassword(newPassword);

      // Update password
      await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

      // Invalidate all refresh tokens for security
      await RefreshToken.updateMany(
        { userId: userId, isActive: true },
        { isActive: false }
      );
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Password change failed"
      );
    }
  }

  // Logout Service
  static async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // Invalidate the specific refresh token
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isActive: false }
      );
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Logout failed");
    }
  }

  // Logout All Devices
  static async logoutAllDevices(userId: string): Promise<void> {
    try {
      // Invalidate all refresh tokens for the user
      await RefreshToken.updateMany(
        { userId: userId, isActive: true },
        { isActive: false }
      );
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Logout all devices failed"
      );
    }
  }

  // Helper Methods

  private static async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<void> {
    // TODO: Implement email sending logic (Nodemailer, SendGrid, etc.)
    console.log(
      `Password reset email sent to ${email} with token: ${resetToken}`
    );
  }
}
