// types/express/index.d.ts
import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      email: string;
      role: "super_admin" | "admin" | "delivery_user";
      organizationId?: string;
    };
  }
}
