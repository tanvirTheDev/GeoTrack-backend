import { Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.interface";
import { OrganizationAdminService } from "./organizationAdmin.service";

export class OrganizationAdminController {
  // Create Organization Admin
  static async createOrganizationAdmin(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const adminData = req.body;
      const createdBy = req.user!.userId;

      // Validate required fields
      if (
        !adminData.name ||
        !adminData.email ||
        !adminData.password ||
        !adminData.organizationId
      ) {
        res.status(400).json({
          success: false,
          message: "Name, email, password, and organization ID are required",
          error: "MISSING_FIELDS",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminData.email)) {
        res.status(400).json({
          success: false,
          message: "Invalid email format",
          error: "INVALID_EMAIL",
        });
        return;
      }

      // Validate password strength
      const passwordValidation =
        require("../auth/auth.utils").AuthUtils.validatePasswordStrength(
          adminData.password
        );
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.errors.join(", "),
          error: "WEAK_PASSWORD",
        });
        return;
      }

      // Set default permissions to true if not provided
      if (!adminData.permissions) {
        adminData.permissions = {
          canManageUsers: true,
          canViewReports: true,
          canManageSettings: true,
          canViewAnalytics: true,
          canManageDeliveryUsers: true,
          canViewLiveTracking: true,
        };
      } else {
        // Ensure all permissions are set to true by default
        adminData.permissions = {
          canManageUsers: adminData.permissions.canManageUsers ?? true,
          canViewReports: adminData.permissions.canViewReports ?? true,
          canManageSettings: adminData.permissions.canManageSettings ?? true,
          canViewAnalytics: adminData.permissions.canViewAnalytics ?? true,
          canManageDeliveryUsers:
            adminData.permissions.canManageDeliveryUsers ?? true,
          canViewLiveTracking:
            adminData.permissions.canViewLiveTracking ?? true,
        };
      }

      const result = await OrganizationAdminService.createOrganizationAdmin(
        adminData,
        createdBy
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create organization admin";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "CREATE_ORGANIZATION_ADMIN_FAILED",
      });
    }
  }

  // Get All Organization Admins
  static async getAllOrganizationAdmins(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const organizationId = req.query.organizationId as string;

      const result = await OrganizationAdminService.getAllOrganizationAdmins(
        page,
        limit,
        search,
        status,
        organizationId
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get organization admins";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATION_ADMINS_FAILED",
      });
    }
  }

  // Get Organization Admin by ID
  static async getOrganizationAdminById(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { adminId } = req.params;

      if (!adminId) {
        res.status(400).json({
          success: false,
          message: "Admin ID is required",
          error: "MISSING_ADMIN_ID",
        });
        return;
      }

      const result = await OrganizationAdminService.getOrganizationAdminById(
        adminId
      );

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get organization admin";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATION_ADMIN_FAILED",
      });
    }
  }

  // Update Organization Admin
  static async updateOrganizationAdmin(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { adminId } = req.params;
      const updateData = req.body;

      if (!adminId) {
        res.status(400).json({
          success: false,
          message: "Admin ID is required",
          error: "MISSING_ADMIN_ID",
        });
        return;
      }

      // Validate email format if provided
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          res.status(400).json({
            success: false,
            message: "Invalid email format",
            error: "INVALID_EMAIL",
          });
          return;
        }
      }

      // Ensure permissions default to true when updating
      if (updateData.permissions) {
        updateData.permissions = {
          canManageUsers: updateData.permissions.canManageUsers ?? true,
          canViewReports: updateData.permissions.canViewReports ?? true,
          canManageSettings: updateData.permissions.canManageSettings ?? true,
          canViewAnalytics: updateData.permissions.canViewAnalytics ?? true,
          canManageDeliveryUsers:
            updateData.permissions.canManageDeliveryUsers ?? true,
          canViewLiveTracking:
            updateData.permissions.canViewLiveTracking ?? true,
        };
      }

      const result = await OrganizationAdminService.updateOrganizationAdmin(
        adminId,
        updateData
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update organization admin";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "UPDATE_ORGANIZATION_ADMIN_FAILED",
      });
    }
  }

  // Delete Organization Admin
  static async deleteOrganizationAdmin(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { adminId } = req.params;

      if (!adminId) {
        res.status(400).json({
          success: false,
          message: "Admin ID is required",
          error: "MISSING_ADMIN_ID",
        });
        return;
      }

      const result = await OrganizationAdminService.deleteOrganizationAdmin(
        adminId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete organization admin";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "DELETE_ORGANIZATION_ADMIN_FAILED",
      });
    }
  }

  // Suspend Organization Admin
  static async suspendOrganizationAdmin(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { adminId } = req.params;

      if (!adminId) {
        res.status(400).json({
          success: false,
          message: "Admin ID is required",
          error: "MISSING_ADMIN_ID",
        });
        return;
      }

      const result = await OrganizationAdminService.suspendOrganizationAdmin(
        adminId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to suspend organization admin";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "SUSPEND_ORGANIZATION_ADMIN_FAILED",
      });
    }
  }

  // Activate Organization Admin
  static async activateOrganizationAdmin(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { adminId } = req.params;

      if (!adminId) {
        res.status(400).json({
          success: false,
          message: "Admin ID is required",
          error: "MISSING_ADMIN_ID",
        });
        return;
      }

      const result = await OrganizationAdminService.activateOrganizationAdmin(
        adminId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to activate organization admin";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "ACTIVATE_ORGANIZATION_ADMIN_FAILED",
      });
    }
  }

  // Reset Organization Admin Password
  static async resetOrganizationAdminPassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { adminId } = req.params;
      const { newPassword } = req.body;

      if (!adminId) {
        res.status(400).json({
          success: false,
          message: "Admin ID is required",
          error: "MISSING_ADMIN_ID",
        });
        return;
      }

      if (!newPassword) {
        res.status(400).json({
          success: false,
          message: "New password is required",
          error: "MISSING_PASSWORD",
        });
        return;
      }

      const result =
        await OrganizationAdminService.resetOrganizationAdminPassword(
          adminId,
          newPassword
        );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to reset organization admin password";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "RESET_ORGANIZATION_ADMIN_PASSWORD_FAILED",
      });
    }
  }

  // Get Organization Admin Statistics
  static async getOrganizationAdminStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const organizationId = req.query.organizationId as string;

      const result = await OrganizationAdminService.getOrganizationAdminStats(
        organizationId
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get organization admin statistics";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATION_ADMIN_STATS_FAILED",
      });
    }
  }

  // Get Organization Admins by Organization
  static async getOrganizationAdminsByOrganization(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result =
        await OrganizationAdminService.getOrganizationAdminsByOrganization(
          organizationId,
          page,
          limit,
          search,
          status
        );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get organization admins";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATION_ADMINS_BY_ORGANIZATION_FAILED",
      });
    }
  }

  // Update Organization Admin Permissions
  static async updateOrganizationAdminPermissions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { adminId } = req.params;
      const { permissions } = req.body;

      if (!adminId) {
        res.status(400).json({
          success: false,
          message: "Admin ID is required",
          error: "MISSING_ADMIN_ID",
        });
        return;
      }

      if (!permissions) {
        res.status(400).json({
          success: false,
          message: "Permissions are required",
          error: "MISSING_PERMISSIONS",
        });
        return;
      }

      // Ensure all permissions default to true
      const defaultPermissions = {
        canManageUsers: permissions.canManageUsers ?? true,
        canViewReports: permissions.canViewReports ?? true,
        canManageSettings: permissions.canManageSettings ?? true,
        canViewAnalytics: permissions.canViewAnalytics ?? true,
        canManageDeliveryUsers: permissions.canManageDeliveryUsers ?? true,
        canViewLiveTracking: permissions.canViewLiveTracking ?? true,
      };

      const result =
        await OrganizationAdminService.updateOrganizationAdminPermissions(
          adminId,
          defaultPermissions
        );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update organization admin permissions";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "UPDATE_ORGANIZATION_ADMIN_PERMISSIONS_FAILED",
      });
    }
  }
}
