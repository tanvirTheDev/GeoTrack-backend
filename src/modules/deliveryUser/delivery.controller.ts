import { Request, Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.interface";
import deliveryUserService from "./delivery.service";

class DeliveryUserController {
  // Create a new delivery user
  async createDeliveryUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, password, phone, vehicleType, licenseNumber } =
        req.body;

      // Get organization ID from authenticated user
      const organizationId = req.user?.organizationId;
      const createdBy = req.user?.userId;

      if (!organizationId || !createdBy) {
        return res.status(400).json({
          success: false,
          message: "Organization ID and creator ID are required",
        });
      }

      const deliveryUserData = {
        name,
        email,
        password,
        organizationId,
        phone,
        vehicleType,
        licenseNumber,
        createdBy,
      };

      const deliveryUser = await deliveryUserService.createDeliveryUser(
        deliveryUserData
      );

      res.status(201).json({
        success: true,
        message: "Delivery user created successfully",
        data: deliveryUser,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create delivery user",
      });
    }
  }

  // Get all delivery users for the organization
  async getDeliveryUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      console.log(organizationId);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const { status, vehicleType, search, page = 1, limit = 10 } = req.query;

      const filters = {
        status: status as string,
        vehicleType: vehicleType as string,
        search: search as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
      };

      const result = await deliveryUserService.getDeliveryUsersByOrganization(
        organizationId,
        filters
      );

      res.status(200).json({
        success: true,
        message: "Delivery users retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve delivery users",
      });
    }
  }

  // Get delivery user by ID
  async getDeliveryUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const deliveryUser = await deliveryUserService.getDeliveryUserById(
        id,
        organizationId
      );

      if (!deliveryUser) {
        return res.status(404).json({
          success: false,
          message: "Delivery user not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Delivery user retrieved successfully",
        data: deliveryUser,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve delivery user",
      });
    }
  }

  // Update delivery user
  async updateDeliveryUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const updateData = req.body;

      const deliveryUser = await deliveryUserService.updateDeliveryUser(
        id,
        organizationId,
        updateData
      );

      if (!deliveryUser) {
        return res.status(404).json({
          success: false,
          message: "Delivery user not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Delivery user updated successfully",
        data: deliveryUser,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update delivery user",
      });
    }
  }

  // Delete delivery user
  async deleteDeliveryUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const deleted = await deliveryUserService.deleteDeliveryUser(
        id,
        organizationId
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Delivery user not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Delivery user deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete delivery user",
      });
    }
  }

  // Update delivery user status
  async updateDeliveryUserStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      if (!["active", "inactive", "suspended"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be active, inactive, or suspended",
        });
      }

      const deliveryUser = await deliveryUserService.updateDeliveryUserStatus(
        id,
        organizationId,
        status
      );

      if (!deliveryUser) {
        return res.status(404).json({
          success: false,
          message: "Delivery user not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Delivery user status updated successfully",
        data: deliveryUser,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update delivery user status",
      });
    }
  }

  // Reset delivery user password
  async resetDeliveryUserPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password is required",
        });
      }

      const deliveryUser = await deliveryUserService.resetDeliveryUserPassword(
        id,
        organizationId,
        newPassword
      );

      if (!deliveryUser) {
        return res.status(404).json({
          success: false,
          message: "Delivery user not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Delivery user password reset successfully",
        data: {
          id: deliveryUser._id,
          name: deliveryUser.name,
          email: deliveryUser.email,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to reset delivery user password",
      });
    }
  }

  // Get delivery user statistics
  async getDeliveryUserStats(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const stats = await deliveryUserService.getDeliveryUserStats(
        organizationId
      );

      res.status(200).json({
        success: true,
        message: "Delivery user statistics retrieved successfully",
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve delivery user statistics",
      });
    }
  }

  // Get delivery user by email (for authentication)
  async getDeliveryUserByEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;

      const deliveryUser = await deliveryUserService.getDeliveryUserByEmail(
        email
      );

      if (!deliveryUser) {
        return res.status(404).json({
          success: false,
          message: "Delivery user not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Delivery user retrieved successfully",
        data: deliveryUser,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve delivery user",
      });
    }
  }
}

export default new DeliveryUserController();
