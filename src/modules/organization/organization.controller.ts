import { Request, Response } from "express";
import { OrganizationService } from "./organization.service";

export class OrganizationController {
  // Create Organization
  static async createOrganization(req: Request, res: Response): Promise<void> {
    try {
      const organizationData = req.body;

      // Validate required fields
      if (
        !organizationData.name ||
        !organizationData.companyName ||
        !organizationData.email ||
        !organizationData.packageType
      ) {
        res.status(400).json({
          success: false,
          message: "Name, company name, email, and package type are required",
          error: "MISSING_FIELDS",
        });
        return;
      }

      const result = await OrganizationService.createOrganization(
        organizationData
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
          : "Failed to create organization";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "CREATE_ORGANIZATION_FAILED",
      });
    }
  }

  // Get All Organizations
  static async getAllOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const packageType = req.query.packageType as string;

      const result = await OrganizationService.getAllOrganizations(
        page,
        limit,
        search,
        status,
        packageType
      );

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get organizations";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATIONS_FAILED",
      });
    }
  }

  // Get Organization by ID
  static async getOrganizationById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result = await OrganizationService.getOrganizationById(
        organizationId
      );

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get organization";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATION_FAILED",
      });
    }
  }

  // Update Organization
  static async updateOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const updateData = req.body;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result = await OrganizationService.updateOrganization(
        organizationId,
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
          : "Failed to update organization";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "UPDATE_ORGANIZATION_FAILED",
      });
    }
  }

  // Delete Organization
  static async deleteOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result = await OrganizationService.deleteOrganization(
        organizationId
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
          : "Failed to delete organization";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "DELETE_ORGANIZATION_FAILED",
      });
    }
  }

  // Suspend Organization
  static async suspendOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result = await OrganizationService.suspendOrganization(
        organizationId
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
          : "Failed to suspend organization";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "SUSPEND_ORGANIZATION_FAILED",
      });
    }
  }

  // Activate Organization
  static async activateOrganization(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result = await OrganizationService.activateOrganization(
        organizationId
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
          : "Failed to activate organization";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "ACTIVATE_ORGANIZATION_FAILED",
      });
    }
  }

  // Get Organization Statistics
  static async getOrganizationStats(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      const result = await OrganizationService.getOrganizationStats(
        organizationId
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
          : "Failed to get organization statistics";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_ORGANIZATION_STATS_FAILED",
      });
    }
  }

  // Get Expiring Organizations
  static async getExpiringOrganizations(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;

      const result = await OrganizationService.getExpiringOrganizations(days);

      res.status(200).json(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get expiring organizations";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "GET_EXPIRING_ORGANIZATIONS_FAILED",
      });
    }
  }

  // Update Organization Subscription
  static async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { packageType, maxUsers, endDate } = req.body;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          error: "MISSING_ORGANIZATION_ID",
        });
        return;
      }

      if (!packageType || !maxUsers || !endDate) {
        res.status(400).json({
          success: false,
          message: "Package type, max users, and end date are required",
          error: "MISSING_FIELDS",
        });
        return;
      }

      const result = await OrganizationService.updateSubscription(
        organizationId,
        packageType,
        maxUsers,
        new Date(endDate)
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
          : "Failed to update organization subscription";

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: "UPDATE_SUBSCRIPTION_FAILED",
      });
    }
  }
}
