import cors from "cors";
import dotenv from "dotenv";
import express, { Application } from "express";

dotenv.config();

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check route
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "OK", message: "GeoTrack Backend is running 🚀" });
});

export default app;
