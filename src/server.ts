import http from "http";
import mongoose from "mongoose";
import app from "./app";

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/geotrack";

// HTTP Server
const server = http.createServer(app);

// Socket.io setup
// const io = new Server(server, {
//   cors: {
//     origin: "*", // in production, restrict this
//     methods: ["GET", "POST"],
//   },
// });

// Initialize real-time tracking service
// RealtimeTrackingService.initialize(io);

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB Connection Error:", err));
