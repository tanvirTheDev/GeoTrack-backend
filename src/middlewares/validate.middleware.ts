import { NextFunction, Request, Response } from "express";
import Joi from "joi";

// Validation schemas
const authValidationSchemas = {
  login: Joi.object({
    email: Joi.string()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ["com", "net", "org", "edu", "gov", "bd"] },
      })
      .required()
      .messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
      }),
    password: Joi.string().min(1).required().messages({
      "string.min": "Password is required",
      "any.required": "Password is required",
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ["com", "net", "org", "edu", "gov", "bd"] },
      })
      .required()
      .messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
      }),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      "any.required": "Reset token is required",
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "any.required": "New password is required",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "Confirm password must match the new password",
        "any.required": "Confirm password is required",
      }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "Current password is required",
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "any.required": "New password is required",
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "Confirm password must match the new password",
        "any.required": "Confirm password is required",
      }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().optional().messages({
      "string.base": "Refresh token must be a string",
    }),
  }),
};

export class ValidationMiddleware {
  // Generic validation function
  private static validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false, // Return all validation errors
        stripUnknown: true, // Remove unknown fields
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors,
          error: "VALIDATION_ERROR",
        });
        return;
      }

      // Replace req.body with validated and sanitized data
      req.body = value;
      next();
    };
  };

  // Auth validation middlewares
  static validateLogin = ValidationMiddleware.validate(
    authValidationSchemas.login
  );
  static validateForgotPassword = ValidationMiddleware.validate(
    authValidationSchemas.forgotPassword
  );
  static validateResetPassword = ValidationMiddleware.validate(
    authValidationSchemas.resetPassword
  );
  static validateChangePassword = ValidationMiddleware.validate(
    authValidationSchemas.changePassword
  );
  static validateRefreshToken = ValidationMiddleware.validate(
    authValidationSchemas.refreshToken
  );

  // Generic validation methods
  static validateBody = (schema: Joi.ObjectSchema) => {
    return ValidationMiddleware.validate(schema);
  };

  static validateQuery = (schema: Joi.ObjectSchema) => {
    return ValidationMiddleware.validate(schema);
  };

  // Custom password strength validator
  static validatePasswordStrength = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const password = req.body.password || req.body.newPassword;

    if (!password) {
      next();
      return;
    }

    const strengthChecks = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };

    const failedChecks = Object.entries(strengthChecks)
      .filter(([, passed]) => !passed)
      .map(([check]) => {
        switch (check) {
          case "minLength":
            return "Password must be at least 8 characters long";
          case "hasUpperCase":
            return "Password must contain at least one uppercase letter";
          case "hasLowerCase":
            return "Password must contain at least one lowercase letter";
          case "hasNumbers":
            return "Password must contain at least one number";
          case "hasSpecialChar":
            return "Password must contain at least one special character (@$!%*?&)";
          default:
            return "Password requirement not met";
        }
      });

    if (failedChecks.length > 0) {
      res.status(400).json({
        success: false,
        message: "Password does not meet strength requirements",
        errors: failedChecks.map((msg) => ({
          field: "password",
          message: msg,
        })),
        error: "WEAK_PASSWORD",
      });
      return;
    }

    next();
  };

  // Rate limiting validation (can be enhanced with Redis)
  static rateLimitAuth = (() => {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    return (req: Request, res: Response, next: NextFunction): void => {
      const ip = req.ip || req.connection.remoteAddress || "unknown";
      const now = Date.now();

      const attemptData = attempts.get(ip);

      if (attemptData && now < attemptData.resetTime) {
        if (attemptData.count >= maxAttempts) {
          res.status(429).json({
            success: false,
            message:
              "Too many authentication attempts. Please try again later.",
            error: "RATE_LIMIT_EXCEEDED",
            retryAfter: Math.ceil((attemptData.resetTime - now) / 1000),
          });
          return;
        }

        attemptData.count++;
      } else {
        attempts.set(ip, { count: 1, resetTime: now + windowMs });
      }

      // Clean up expired entries periodically
      if (Math.random() < 0.1) {
        for (const [key, value] of attempts.entries()) {
          if (now >= value.resetTime) {
            attempts.delete(key);
          }
        }
      }

      next();
    };
  })();

  // Sanitization middleware
  static sanitizeInput = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const sanitizeString = (str: string): string => {
      return str.trim().replace(/[<>]/g, "");
    };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj === "string") {
        return sanitizeString(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj && typeof obj === "object") {
        const sanitized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      }

      return obj;
    };

    req.body = sanitizeObject(req.body);
    next();
  };
}
