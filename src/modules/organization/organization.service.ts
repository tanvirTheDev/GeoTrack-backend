import { UserRole } from "../auth/auth.interface";
import User from "../user/user.model";
import Organization, { IOrganization } from "./organization.model";

// Organization Service Interface
export interface CreateOrganizationData {
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
  packageType: "basic" | "premium" | "platinum";
  maxUsers: number;
  subscriptionEndDate: Date;
}

export interface UpdateOrganizationData {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  status?: "active" | "inactive" | "suspended";
  packageType?: "basic" | "premium" | "platinum";
  maxUsers?: number;
  subscriptionEndDate?: Date;
}

export interface OrganizationResponse {
  success: boolean;
  message: string;
  data?: IOrganization | IOrganization[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class OrganizationService {
  // Create Organization
  static async createOrganization(
    data: CreateOrganizationData
  ): Promise<OrganizationResponse> {
    try {
      // Check if company name already exists
      const existingOrg = await Organization.findOne({
        companyName: data.companyName,
      });

      if (existingOrg) {
        return {
          success: false,
          message: "Organization with this company name already exists",
        };
      }

      // Check if email already exists
      const existingEmail = await Organization.findOne({ email: data.email });
      if (existingEmail) {
        return {
          success: false,
          message: "Organization with this email already exists",
        };
      }

      // Create organization
      const organization = new Organization(data);
      await organization.save();

      return {
        success: true,
        message: "Organization created successfully",
        data: organization,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create organization"
      );
    }
  }

  // Get All Organizations
  static async getAllOrganizations(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    packageType?: string
  ): Promise<OrganizationResponse> {
    try {
      const query: any = {};

      // Add search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { companyName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Add status filter
      if (status) {
        query.status = status;
      }

      // Add package type filter
      if (packageType) {
        query.packageType = packageType;
      }

      const skip = (page - 1) * limit;

      const [organizations, total] = await Promise.all([
        Organization.find(query)
          .populate("userCount")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Organization.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: "Organizations retrieved successfully",
        data: organizations,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get organizations"
      );
    }
  }

  // Get Organization by ID
  static async getOrganizationById(
    organizationId: string
  ): Promise<OrganizationResponse> {
    try {
      const organization = await Organization.findById(organizationId).populate(
        "userCount"
      );

      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      return {
        success: true,
        message: "Organization retrieved successfully",
        data: organization,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get organization"
      );
    }
  }

  // Update Organization
  static async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationData
  ): Promise<OrganizationResponse> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Check if company name is being changed and if it already exists
      if (data.companyName && data.companyName !== organization.companyName) {
        const existingOrg = await Organization.findOne({
          companyName: data.companyName,
          _id: { $ne: organizationId },
        });

        if (existingOrg) {
          return {
            success: false,
            message: "Organization with this company name already exists",
          };
        }
      }

      // Check if email is being changed and if it already exists
      if (data.email && data.email !== organization.email) {
        const existingEmail = await Organization.findOne({
          email: data.email,
          _id: { $ne: organizationId },
        });

        if (existingEmail) {
          return {
            success: false,
            message: "Organization with this email already exists",
          };
        }
      }

      // Update organization
      const updatedOrganization = await Organization.findByIdAndUpdate(
        organizationId,
        data,
        { new: true, runValidators: true }
      ).populate("userCount");

      if (!updatedOrganization) {
        return {
          success: false,
          message: "Failed to update organization",
        };
      }

      return {
        success: true,
        message: "Organization updated successfully",
        data: updatedOrganization,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update organization"
      );
    }
  }

  // Delete Organization
  static async deleteOrganization(
    organizationId: string
  ): Promise<OrganizationResponse> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Check if organization has users
      const userCount = await User.countDocuments({
        organizationId: organizationId,
      });

      if (userCount > 0) {
        return {
          success: false,
          message: "Cannot delete organization with existing users",
        };
      }

      await Organization.findByIdAndDelete(organizationId);

      return {
        success: true,
        message: "Organization deleted successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete organization"
      );
    }
  }

  // Suspend Organization
  static async suspendOrganization(
    organizationId: string
  ): Promise<OrganizationResponse> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Suspend organization
      organization.status = "suspended";
      organization.isActive = false;
      await organization.save();

      // Suspend all users in the organization
      await User.updateMany(
        { organizationId: organizationId },
        { status: "suspended" }
      );

      return {
        success: true,
        message: "Organization suspended successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to suspend organization"
      );
    }
  }

  // Activate Organization
  static async activateOrganization(
    organizationId: string
  ): Promise<OrganizationResponse> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Activate organization
      organization.status = "active";
      organization.isActive = true;
      await organization.save();

      // Activate all users in the organization
      await User.updateMany(
        { organizationId: organizationId },
        { status: "active" }
      );

      return {
        success: true,
        message: "Organization activated successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to activate organization"
      );
    }
  }

  // Get Organization Statistics
  static async getOrganizationStats(
    organizationId: string
  ): Promise<OrganizationResponse> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Get user statistics
      const [totalUsers, activeUsers, adminUsers, deliveryUsers] =
        await Promise.all([
          User.countDocuments({ organizationId }),
          User.countDocuments({ organizationId, status: "active" }),
          User.countDocuments({
            organizationId,
            role: UserRole.ADMIN,
          }),
          User.countDocuments({
            organizationId,
            role: UserRole.DELIVERY_USER,
          }),
        ]);

      const stats = {
        ...organization.toObject(),
        userStats: {
          totalUsers,
          activeUsers,
          adminUsers,
          deliveryUsers,
        },
      };

      return {
        success: true,
        message: "Organization statistics retrieved successfully",
        data: stats as any,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get organization statistics"
      );
    }
  }

  // Get Organizations with Expiring Subscriptions
  static async getExpiringOrganizations(
    days: number = 7
  ): Promise<OrganizationResponse> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      const organizations = await Organization.find({
        status: "active",
        isActive: true,
        subscriptionEndDate: { $lte: expiryDate },
      }).sort({ subscriptionEndDate: 1 });

      return {
        success: true,
        message: "Expiring organizations retrieved successfully",
        data: organizations,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get expiring organizations"
      );
    }
  }

  // Update Organization Subscription
  static async updateSubscription(
    organizationId: string,
    packageType: "basic" | "premium" | "platinum",
    maxUsers: number,
    endDate: Date
  ): Promise<OrganizationResponse> {
    try {
      const organization = await Organization.findById(organizationId);

      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Update subscription
      organization.packageType = packageType;
      organization.maxUsers = maxUsers;
      organization.subscriptionEndDate = endDate;
      await organization.save();

      return {
        success: true,
        message: "Organization subscription updated successfully",
        data: organization,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update organization subscription"
      );
    }
  }
}
