import { NextFunction, Request, Response } from "express";
import { UserRole } from "../modules/auth/auth.interface";
import { AuthUtils, JWTPayload } from "../modules/auth/auth.utils";
import DeliveryUser from "../modules/deliveryUser/delivery.model";

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export class AuthMiddleware {
  // Verify JWT Token Middleware
  static verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        res.status(401).json({
          success: false,
          message: "Access token required",
          error: "UNAUTHORIZED",
        });
        return;
      }

      // Verify the token
      const decoded = AuthUtils.verifyAccessToken(token);

      // Attach user info to request
      req.user = decoded;

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: "UNAUTHORIZED",
      });
    }
  };

  // Role-based Access Control
  static requireRole = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: "Authentication required",
            error: "UNAUTHORIZED",
          });
          return;
        }

        console.log(req.user.role);

        if (!allowedRoles.includes(req.user.role as UserRole)) {
          res.status(403).json({
            success: false,
            message: "Access denied. Insufficient permissions",
            error: "FORBIDDEN",
          });
          return;
        }

        next();
      } catch (error) {
        res.status(403).json({
          success: false,
          message: "Access denied",
          error: "FORBIDDEN",
        });
      }
    };
  };

  // Super Admin Only Access
  static requireSuperAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    AuthMiddleware.requireRole([UserRole.SUPER_ADMIN])(req, res, next);
  };

  // Admin and Super Admin Access
  static requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    AuthMiddleware.requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN])(
      req,
      res,
      next
    );
  };

  // Organization Admin Access (Organization Admin can only access their own organization)
  static requireOrganizationAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          error: "UNAUTHORIZED",
        });
        return;
      }

      // Super admin has access to all organizations
      if (req.user.role === UserRole.SUPER_ADMIN) {
        next();
        return;
      }

      // Only organization admins can access these routes
      if (req.user.role !== UserRole.ORGANIZATION_ADMIN) {
        console.log(req.user.role);
        res.status(403).json({
          success: false,
          message: "Access denied. Organization admin access required",
          error: "FORBIDDEN",
        });
        return;
      }

      // Organization Admin must have an organization
      if (!req.user.organizationId) {
        res.status(403).json({
          success: false,
          message: "Organization Admin must be associated with an organization",
          error: "FORBIDDEN",
        });
        return;
      }

      // Organization admins can access their own organization's data
      // The service layer will handle filtering by organization
      next();
    } catch (error) {
      res.status(403).json({
        success: false,
        message: "Access denied",
        error: "FORBIDDEN",
      });
    }
  };

  // Delivery User Access
  static requireDeliveryUser = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    AuthMiddleware.requireRole([UserRole.DELIVERY_USER])(req, res, next);
  };

  // Optional Authentication (for routes that work with or without auth)
  static optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      if (token) {
        try {
          const decoded = AuthUtils.verifyAccessToken(token);
          req.user = decoded;
        } catch (error) {
          // Token is invalid, but we continue without user info
          req.user = undefined;
        }
      }

      next();
    } catch (error) {
      next();
    }
  };

  // ✅ Ensure Org Admin can only access their org
  static requireOrgResourceMatch(req: any, res: Response, next: NextFunction) {
    if (req.user?.role === UserRole.ORGANIZATION_ADMIN) {
      const resourceOrgId =
        req.params.organizationId ||
        req.body.organizationId ||
        req.query.organizationId;

      if (resourceOrgId && resourceOrgId !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only manage your own organization.",
          error: "FORBIDDEN",
        });
      }
    }
    next();
  }

  // Check if user can access specific user data
  static requireUserAccess = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          error: "UNAUTHORIZED",
        });
        return;
      }

      const targetUserId = req.params.userId || req.body.userId;

      // Super admin can access any user
      if (req.user.role === UserRole.SUPER_ADMIN) {
        next();
        return;
      }

      // Users can access their own data
      if (req.user.userId === targetUserId) {
        next();
        return;
      }

      // Organization Admin can access users in their organization
      if (
        req.user.role === UserRole.ORGANIZATION_ADMIN &&
        req.user.organizationId
      ) {
        // Check if the target delivery user belongs to the same organization
        if (targetUserId) {
          try {
            const deliveryUser = await DeliveryUser.findById(targetUserId);
            if (!deliveryUser) {
              res.status(404).json({
                success: false,
                message: "Delivery user not found",
                error: "NOT_FOUND",
              });
              return;
            }

            if (
              deliveryUser.organizationId.toString() !== req.user.organizationId
            ) {
              res.status(403).json({
                success: false,
                message:
                  "Access denied. You can only access delivery users from your organization",
                error: "FORBIDDEN",
              });
              return;
            }
          } catch (error) {
            res.status(500).json({
              success: false,
              message: "Error checking delivery user access",
              error: "INTERNAL_ERROR",
            });
            return;
          }
        }

        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own data",
        error: "FORBIDDEN",
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        message: "Access denied",
        error: "FORBIDDEN",
      });
    }
  };
}

// Simple authentication middleware for routes
export const authenticateToken = AuthMiddleware.verifyToken;
