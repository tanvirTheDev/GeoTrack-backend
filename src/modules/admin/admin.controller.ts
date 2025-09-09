import { Response } from "express";
import { AuthenticatedRequest, UserRole } from "../auth/auth.interface";
import { AdminService } from "./admin.service";

export class AdminController {
  // Create User
  static async createUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userData = req.body;
      const requesterRole = req.user!.role;
      const requesterOrganizationId = req.user!.organizationId;

      // Validate required fields
      if (
        !userData.name ||
        !userData.email ||
        !userData.password ||
        !userData.role
      ) {
        res.status(400).json({
          success: false,
          message: "Name, email, password, and role are required",
          error: "MISSING_FIELDS",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
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
          userData.password
        );
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.errors.join(", "),
          error: "WEAK_PASSWORD",
        });
        return;
      }

      // For admin role, use their organization if not specified
      if (requesterRole === "admin" && !userData.organizationId) {
        userData.organizationId = requesterOrganizationId;
      }

      const result = await AdminService.createUser(userData, req.user!.userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "CREATE_USER_FAILED",
      });
    }
  }

  // Get All Users
  static async getAllUsers(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as string;
      const organizationId = req.query.organizationId as string;

      const result = await AdminService.getAllUsers(
        page,
        limit,
        search,
        role,
        status,
        organizationId,
        req.user!.role as UserRole,
        req.user!.organizationId
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get users";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_USERS_FAILED",
      });
    }
  }

  // Get User by ID
  static async getUserById(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
          error: "MISSING_USER_ID",
        });
        return;
      }

      const result = await AdminService.getUserById(
        userId,
        req.user!.role as UserRole,
        req.user!.organizationId
      );

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get user";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_USER_FAILED",
      });
    }
  }

  // Update User
  static async updateUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
          error: "MISSING_USER_ID",
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

      const result = await AdminService.updateUser(
        userId,
        updateData,
        req.user!.role as UserRole,
        req.user!.organizationId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "UPDATE_USER_FAILED",
      });
    }
  }

  // Delete User
  static async deleteUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
          error: "MISSING_USER_ID",
        });
        return;
      }

      const result = await AdminService.deleteUser(
        userId,
        req.user!.role as UserRole,
        req.user!.organizationId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "DELETE_USER_FAILED",
      });
    }
  }

  // Suspend User
  static async suspendUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
          error: "MISSING_USER_ID",
        });
        return;
      }

      const result = await AdminService.suspendUser(
        userId,
        req.user!.role as UserRole,
        req.user!.organizationId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to suspend user";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "SUSPEND_USER_FAILED",
      });
    }
  }

  // Activate User
  static async activateUser(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
          error: "MISSING_USER_ID",
        });
        return;
      }

      const result = await AdminService.activateUser(
        userId,
        req.user!.role as UserRole,
        req.user!.organizationId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to activate user";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "ACTIVATE_USER_FAILED",
      });
    }
  }

  // Reset User Password
  static async resetUserPassword(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
          error: "MISSING_USER_ID",
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

      const result = await AdminService.resetUserPassword(
        userId,
        newPassword,
        req.user!.role as UserRole,
        req.user!.organizationId
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
          : "Failed to reset user password";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "RESET_PASSWORD_FAILED",
      });
    }
  }

  // Get User Statistics
  static async getUserStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const organizationId = req.query.organizationId as string;

      const result = await AdminService.getUserStats(
        organizationId,
        req.user!.role as UserRole,
        req.user!.organizationId
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get user statistics";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_USER_STATS_FAILED",
      });
    }
  }

  // Get Users by Organization
  static async getUsersByOrganization(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { organizationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as string;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result = await AdminService.getUsersByOrganization(
        organizationId,
        page,
        limit,
        search,
        role,
        status
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get organization users";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATION_USERS_FAILED",
      });
    }
  }
}
