import { AuthUtils } from "../auth/auth.utils";
import Organization from "../organization/organization.model";
import OrganizationAdmin, {
  IOrganizationAdmin,
} from "./organizationAdmin.model";

// Organization Admin Service Interface
export interface CreateOrganizationAdminData {
  name: string;
  email: string;
  password: string;
  organizationId: string;
  status?: "active" | "inactive" | "suspended";
  permissions?: {
    canManageUsers?: boolean;
    canViewReports?: boolean;
    canManageSettings?: boolean;
    canViewAnalytics?: boolean;
    canManageDeliveryUsers?: boolean;
    canViewLiveTracking?: boolean;
  };
}

export interface UpdateOrganizationAdminData {
  name?: string;
  email?: string;
  status?: "active" | "inactive" | "suspended";
  permissions?: {
    canManageUsers?: boolean;
    canViewReports?: boolean;
    canManageSettings?: boolean;
    canViewAnalytics?: boolean;
    canManageDeliveryUsers?: boolean;
    canViewLiveTracking?: boolean;
  };
}

export interface OrganizationAdminResponse {
  success: boolean;
  message: string;
  data?: IOrganizationAdmin | IOrganizationAdmin[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class OrganizationAdminService {
  // Create Organization Admin
  static async createOrganizationAdmin(
    data: CreateOrganizationAdminData,
    createdBy: string
  ): Promise<OrganizationAdminResponse> {
    try {
      // Check if email already exists
      const existingAdmin = await OrganizationAdmin.findOne({
        email: data.email,
      });
      if (existingAdmin) {
        return {
          success: false,
          message: "Organization admin with this email already exists",
        };
      }

      // Validate organization exists
      const organization = await Organization.findById(data.organizationId);
      if (!organization) {
        return {
          success: false,
          message: "Organization not found",
        };
      }

      // Check if organization is active
      if (organization.status !== "active" || !organization.isActive) {
        return {
          success: false,
          message: "Cannot create admin for inactive organization",
        };
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(data.password);

      // Create organization admin
      const organizationAdmin = new OrganizationAdmin({
        ...data,
        password: hashedPassword,
        createdBy: createdBy,
      });

      await organizationAdmin.save();

      // Populate the response
      await organizationAdmin.populate([
        { path: "organizationId", select: "name companyName" },
        { path: "createdBy", select: "name email" },
      ]);

      return {
        success: true,
        message: "Organization admin created successfully",
        data: organizationAdmin,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create organization admin"
      );
    }
  }

  // Get All Organization Admins
  static async getAllOrganizationAdmins(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    organizationId?: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const query: any = {};

      // Add search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Add status filter
      if (status) {
        query.status = status;
      }

      // Add organization filter
      if (organizationId) {
        query.organizationId = organizationId;
      }

      const skip = (page - 1) * limit;

      const [admins, total] = await Promise.all([
        OrganizationAdmin.find(query)
          .populate("organizationId", "name companyName")
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OrganizationAdmin.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: "Organization admins retrieved successfully",
        data: admins,
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
          : "Failed to get organization admins"
      );
    }
  }

  // Get Organization Admin by ID
  static async getOrganizationAdminById(
    adminId: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const admin = await OrganizationAdmin.findById(adminId)
        .populate("organizationId", "name companyName")
        .populate("createdBy", "name email");

      if (!admin) {
        return {
          success: false,
          message: "Organization admin not found",
        };
      }

      return {
        success: true,
        message: "Organization admin retrieved successfully",
        data: admin,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get organization admin"
      );
    }
  }

  // Update Organization Admin
  static async updateOrganizationAdmin(
    adminId: string,
    data: UpdateOrganizationAdminData
  ): Promise<OrganizationAdminResponse> {
    try {
      const admin = await OrganizationAdmin.findById(adminId);

      if (!admin) {
        return {
          success: false,
          message: "Organization admin not found",
        };
      }

      // Check if email is being changed and if it already exists
      if (data.email && data.email !== admin.email) {
        const existingAdmin = await OrganizationAdmin.findOne({
          email: data.email,
          _id: { $ne: adminId },
        });

        if (existingAdmin) {
          return {
            success: false,
            message: "Organization admin with this email already exists",
          };
        }
      }

      // Update admin
      const updatedAdmin = await OrganizationAdmin.findByIdAndUpdate(
        adminId,
        data,
        { new: true, runValidators: true }
      )
        .populate("organizationId", "name companyName")
        .populate("createdBy", "name email");

      if (!updatedAdmin) {
        return {
          success: false,
          message: "Failed to update organization admin",
        };
      }

      return {
        success: true,
        message: "Organization admin updated successfully",
        data: updatedAdmin,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update organization admin"
      );
    }
  }

  // Delete Organization Admin
  static async deleteOrganizationAdmin(
    adminId: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const admin = await OrganizationAdmin.findById(adminId);

      if (!admin) {
        return {
          success: false,
          message: "Organization admin not found",
        };
      }

      await OrganizationAdmin.findByIdAndDelete(adminId);

      return {
        success: true,
        message: "Organization admin deleted successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to delete organization admin"
      );
    }
  }

  // Suspend Organization Admin
  static async suspendOrganizationAdmin(
    adminId: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const admin = await OrganizationAdmin.findById(adminId);

      if (!admin) {
        return {
          success: false,
          message: "Organization admin not found",
        };
      }

      admin.status = "suspended";
      await admin.save();

      return {
        success: true,
        message: "Organization admin suspended successfully",
        data: admin,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to suspend organization admin"
      );
    }
  }

  // Activate Organization Admin
  static async activateOrganizationAdmin(
    adminId: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const admin = await OrganizationAdmin.findById(adminId);

      if (!admin) {
        return {
          success: false,
          message: "Organization admin not found",
        };
      }

      admin.status = "active";
      await admin.save();

      return {
        success: true,
        message: "Organization admin activated successfully",
        data: admin,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to activate organization admin"
      );
    }
  }

  // Reset Organization Admin Password
  static async resetOrganizationAdminPassword(
    adminId: string,
    newPassword: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const admin = await OrganizationAdmin.findById(adminId);

      if (!admin) {
        return {
          success: false,
          message: "Organization admin not found",
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
      await OrganizationAdmin.findByIdAndUpdate(adminId, {
        password: hashedPassword,
      });

      return {
        success: true,
        message: "Organization admin password reset successfully",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to reset organization admin password"
      );
    }
  }

  // Get Organization Admins by Organization
  static async getOrganizationAdminsByOrganization(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const query: any = { organizationId };

      // Add search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Add status filter
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [admins, total] = await Promise.all([
        OrganizationAdmin.find(query)
          .populate("organizationId", "name companyName")
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OrganizationAdmin.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: "Organization admins retrieved successfully",
        data: admins,
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
          : "Failed to get organization admins"
      );
    }
  }

  // Get Organization Admin Statistics
  static async getOrganizationAdminStats(
    organizationId?: string
  ): Promise<OrganizationAdminResponse> {
    try {
      const query: any = {};

      // Add organization filter
      if (organizationId) {
        query.organizationId = organizationId;
      }

      const [totalAdmins, activeAdmins, inactiveAdmins, suspendedAdmins] =
        await Promise.all([
          OrganizationAdmin.countDocuments(query),
          OrganizationAdmin.countDocuments({ ...query, status: "active" }),
          OrganizationAdmin.countDocuments({ ...query, status: "inactive" }),
          OrganizationAdmin.countDocuments({ ...query, status: "suspended" }),
        ]);

      const stats = {
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        suspendedAdmins,
      };

      return {
        success: true,
        message: "Organization admin statistics retrieved successfully",
        data: stats as any,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to get organization admin statistics"
      );
    }
  }

  // Update Organization Admin Permissions
  static async updateOrganizationAdminPermissions(
    adminId: string,
    permissions: Partial<IOrganizationAdmin["permissions"]>
  ): Promise<OrganizationAdminResponse> {
    try {
      const admin = await OrganizationAdmin.findById(adminId);

      if (!admin) {
        return {
          success: false,
          message: "Organization admin not found",
        };
      }

      // Update permissions
      admin.permissions = { ...admin.permissions, ...permissions };
      await admin.save();

      return {
        success: true,
        message: "Organization admin permissions updated successfully",
        data: admin,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update organization admin permissions"
      );
    }
  }
}
