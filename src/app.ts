import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Application } from "express";
import adminRoutes from "./modules/admin/admin.routes";
import authRoutes from "./modules/auth/auth.routes";
import deliveryUserRoutes from "./modules/deliveryUser/delivery.routes";
import organizationRoutes from "./modules/organization/organization.routes";
import organizationAdminRoutes from "./modules/organizationAdmin/organizationAdmin.routes";
import realtimeTrackingRoutes from "./modules/tracking/realtime-tracking.routes";
import trackingRoutes from "./modules/tracking/tracking.routes";
dotenv.config();

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/organization-admins", organizationAdminRoutes);
app.use("/api/delivery-users", deliveryUserRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/realtime", realtimeTrackingRoutes);

// Health check route
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "OK", message: "GeoTrack Backend is running 🚀" });
});

export default app;
