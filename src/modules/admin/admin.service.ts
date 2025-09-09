import { UserRole } from "../auth/auth.interface";
import { AuthUtils } from "../auth/auth.utils";
import Organization from "../organization/organization.model";
import User, { IUser } from "../user/user.model";

// Admin Service Interface
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId?: string;
  status?: "active" | "inactive" | "suspended";
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: "active" | "inactive" | "suspended";
}

export interface UserResponse {
  success: boolean;
  message: string;
  data?: IUser | IUser[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class AdminService {
  // Create User
  static async createUser(
    userData: CreateUserData,
    createdBy: string
  ): Promise<UserResponse> {
    try {
      // Check if email already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        return {
          success: false,
          message: "User with this email already exists",
        };
      }

      // Validate organization for admin and delivery_user roles
      if (
        (userData.role === UserRole.ADMIN ||
          userData.role === UserRole.DELIVERY_USER) &&
        !userData.organizationId
      ) {
        return {
          success: false,
          message: "Organization is required for admin and delivery user roles",
        };
      }

      // Check if organization exists and can add users
      if (userData.organizationId) {
        const organization = await Organization.findById(
          userData.organizationId
        );
        if (!organization) {
          return {
            success: false,
            message: "Organization not found",
          };
        }

        if (
          organization.currentUsers >= organization.maxUsers ||
          !organization.isSubscriptionActive
        ) {
          return {
            success: false,
            message:
              "Organization has reached maximum user limit or subscription expired",
          };
        }
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(userData.password);

      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword,
      });

      await user.save();

      // Increment organization user count
      if (userData.organizationId) {
        await Organization.findByIdAndUpdate(userData.organizationId, {
          $inc: { currentUsers: 1 },
        });
      }

      return {
        success: true,
        message: "User created successfully",
        data: user,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    }
  }

  // Get All Users
  static async getAllUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    status?: string,
    organizationId?: string,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const query: any = {};

      // Add search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Add role filter
      if (role) {
        query.role = role;
      }

      // Add status filter
      if (status) {
        query.status = status;
      }

      // Add organization filter
      if (organizationId) {
        query.organizationId = organizationId;
      }

      // Restrict access based on requester role
      if (requesterRole === UserRole.ADMIN && requesterOrganizationId) {
        // Admin can only see users from their organization
        query.organizationId = requesterOrganizationId;
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .populate("organizationId", "name companyName")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: "Users retrieved successfully",
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get users"
      );
    }
  }

  // Get User by ID
  static async getUserById(
    userId: string,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const user = await User.findById(userId).populate(
        "organizationId",
        "name companyName"
      );

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check access permissions
      if (
        requesterRole === UserRole.ADMIN &&
        requesterOrganizationId &&
        user.organizationId?.toString() !== requesterOrganizationId
      ) {
        return {
          success: false,
          message:
            "Access denied. You can only access users from your organization",
        };
      }

      return {
        success: true,
        message: "User retrieved successfully",
        data: user,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get user"
      );
    }
  }

  // Update User
  static async updateUser(
    userId: string,
    updateData: UpdateUserData,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check access permissions
      if (
        requesterRole === UserRole.ADMIN &&
        requesterOrganizationId &&
        user.organizationId?.toString() !== requesterOrganizationId
      ) {
        return {
          success: false,
          message:
            "Access denied. You can only update users from your organization",
        };
      }

      // Check if email is being changed and if it already exists
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
          email: updateData.email,
          _id: { $ne: userId },
        });

        if (existingUser) {
          return {
            success: false,
            message: "User with this email already exists",
          };
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).populate("organizationId", "name companyName");

      if (!updatedUser) {
        return {
          success: false,
          message: "Failed to update user",
        };
      }

      return {
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update user"
      );
    }
  }

  // Delete User
  static async deleteUser(
    userId: string,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check access permissions
      if (
        requesterRole === UserRole.ADMIN &&
        requesterOrganizationId &&
        user.organizationId?.toString() !== requesterOrganizationId
      ) {
        return {
          success: false,
          message:
            "Access denied. You can only delete users from your organization",
        };
      }

      // Prevent deletion of super admin
      if (user.role === UserRole.SUPER_ADMIN) {
        return {
          success: false,
          message: "Cannot delete super admin user",
        };
      }

      await User.findByIdAndDelete(userId);

      // Decrement organization user count
      if (user.organizationId) {
        await Organization.findByIdAndUpdate(user.organizationId, {
          $inc: { currentUsers: -1 },
        });
      }

      return {
        success: true,
        message: "User deleted successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete user"
      );
    }
  }

  // Suspend User
  static async suspendUser(
    userId: string,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check access permissions
      if (
        requesterRole === UserRole.ADMIN &&
        requesterOrganizationId &&
        user.organizationId?.toString() !== requesterOrganizationId
      ) {
        return {
          success: false,
          message:
            "Access denied. You can only suspend users from your organization",
        };
      }

      // Prevent suspension of super admin
      if (user.role === UserRole.SUPER_ADMIN) {
        return {
          success: false,
          message: "Cannot suspend super admin user",
        };
      }

      user.status = "suspended";
      await user.save();

      return {
        success: true,
        message: "User suspended successfully",
        data: user,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to suspend user"
      );
    }
  }

  // Activate User
  static async activateUser(
    userId: string,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check access permissions
      if (
        requesterRole === UserRole.ADMIN &&
        requesterOrganizationId &&
        user.organizationId?.toString() !== requesterOrganizationId
      ) {
        return {
          success: false,
          message:
            "Access denied. You can only activate users from your organization",
        };
      }

      user.status = "active";
      await user.save();

      return {
        success: true,
        message: "User activated successfully",
        data: user,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to activate user"
      );
    }
  }

  // Reset User Password
  static async resetUserPassword(
    userId: string,
    newPassword: string,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check access permissions
      if (
        requesterRole === UserRole.ADMIN &&
        requesterOrganizationId &&
        user.organizationId?.toString() !== requesterOrganizationId
      ) {
        return {
          success: false,
          message:
            "Access denied. You can only reset passwords for users from your organization",
        };
      }

      // Validate password strength
      const passwordValidation =
        AuthUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(", "),
        };
      }

      // Hash new password
      const hashedPassword = await AuthUtils.hashPassword(newPassword);

      // Update password
      await User.findByIdAndUpdate(userId, { password: hashedPassword });

      return {
        success: true,
        message: "User password reset successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to reset user password"
      );
    }
  }

  // Get User Statistics
  static async getUserStats(
    organizationId?: string,
    requesterRole: UserRole = UserRole.SUPER_ADMIN,
    requesterOrganizationId?: string
  ): Promise<UserResponse> {
    try {
      const query: any = {};

      // Add organization filter
      if (organizationId) {
        query.organizationId = organizationId;
      }

      // Restrict access based on requester role
      if (requesterRole === UserRole.ADMIN && requesterOrganizationId) {
        query.organizationId = requesterOrganizationId;
      }

      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        adminUsers,
        deliveryUsers,
        superAdminUsers,
      ] = await Promise.all([
        User.countDocuments(query),
        User.countDocuments({ ...query, status: "active" }),
        User.countDocuments({ ...query, status: "inactive" }),
        User.countDocuments({ ...query, status: "suspended" }),
        User.countDocuments({ ...query, role: UserRole.ADMIN }),
        User.countDocuments({ ...query, role: UserRole.DELIVERY_USER }),
        User.countDocuments({ ...query, role: UserRole.SUPER_ADMIN }),
      ]);

      const stats = {
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        adminUsers,
        deliveryUsers,
        superAdminUsers,
      };

      return {
        success: true,
        message: "User statistics retrieved successfully",
        data: stats as any,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get user statistics"
      );
    }
  }

  // Get Users by Organization
  static async getUsersByOrganization(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    status?: string
  ): Promise<UserResponse> {
    try {
      const query: any = { organizationId };

      // Add search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Add role filter
      if (role) {
        query.role = role;
      }

      // Add status filter
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .populate("organizationId", "name companyName")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: "Organization users retrieved successfully",
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get organization users"
      );
    }
  }
}
