/**
 * Server Entry Point
 * Loads environment, initializes Firebase, starts HTTP server
 */
require("dotenv").config();

const http = require("http");
const app = require("./app");
const logger = require("./utils/logger");
const { initializeFirebase } = require("./config/firebase");

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io Server
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io Events mapping
io.on("connection", (socket) => {
  logger.info(`Socket Connected: ${socket.id}`);

  // Join a specific booking room (both provider and customer join same room)
  socket.on("join_booking_room", ({ bookingId }) => {
    socket.join(bookingId);
    logger.info(`Socket ${socket.id} joined room: ${bookingId}`);
  });

  // Provider streams live GPS coordinates → broadcast to customer in same room
  socket.on("provider_location_update", ({ bookingId, latitude, longitude }) => {
    io.to(bookingId).emit("provider_location_update", { latitude, longitude, timestamp: Date.now() });
    logger.debug(`GPS broadcast for ${bookingId}: [${latitude}, ${longitude}]`);
  });

  // Provider clicked "Start Visit" → notify customer
  socket.on("en_route_started", ({ bookingId, providerName, providerAvatar }) => {
    io.to(bookingId).emit("en_route_started", { bookingId, providerName, providerAvatar, timestamp: Date.now() });
    logger.info(`[SOCKET] EN ROUTE started for booking: ${bookingId}`);
  });

  // Provider clicked "I Have Arrived" → notify customer with celebration
  socket.on("provider_arrived", ({ bookingId, latitude, longitude }) => {
    io.to(bookingId).emit("provider_arrived", { bookingId, latitude, longitude, timestamp: Date.now() });
    logger.info(`[SOCKET] PROVIDER ARRIVED for booking: ${bookingId}`);
  });

  // Generic booking status change broadcast (accept, reject, complete, etc.)
  socket.on("booking_status_change", ({ bookingId, status, updatedBy }) => {
    io.to(bookingId).emit("booking_status_change", { bookingId, status, updatedBy, timestamp: Date.now() });
    logger.info(`[SOCKET] Status change for ${bookingId}: ${status}`);
  });

  // Emergency request broadcast (flashing alerts for all nearby providers)
  socket.on("emergency_request_broadcast", (data) => {
    io.emit("emergency_request_broadcast", { ...data, timestamp: Date.now() });
    logger.info(`[SOCKET] 🚨 Broadcasted SYSTEM EMERGENCY REQUEST: ${data.serviceName} in ${data.area}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Socket Disconnected: ${socket.id}`);
  });
});

// Initialize services
const bootstrap = async () => {
  try {
    // Initialize Firebase (gracefully handles missing config)
    initializeFirebase();

    // Handle server errors (like port in use)
    server.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use. Please kill the existing process and try again.`);
        process.exit(1);
      } else {
        logger.error("Server error:", e);
      }
    });

    // Start listening on all interfaces
    server.listen(PORT, "0.0.0.0", () => {
      logger.success("═══════════════════════════════════════");
      logger.success("  AI Service Orchestrator Backend");
      logger.success(`  Environment: ${process.env.NODE_ENV || "development"}`);
      logger.success(`  Server:      http://localhost:${PORT}`);
      logger.success(`  Health:      http://localhost:${PORT}/health`);
      logger.success(`  API Base:    http://localhost:${PORT}/api`);
      logger.success("═══════════════════════════════════════");
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
  process.exit(1);
});

// Start the server
bootstrap();

module.exports = {
  getIoInstance: () => io
};
