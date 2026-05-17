/**
 * Express Application
 * Middleware stack + route mounting
 *
 * Request Flow:
 *   Incoming Request
 *     → helmet (security headers)
 *     → cors (cross-origin)
 *     → express.json (parse body)
 *     → morgan (request logging)
 *     → routes (business logic)
 *     → errorHandler (catch-all errors)
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { globalLimiter } = require("./middleware/rateLimiter");

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ─── Security ───────────────────────────────────────
app.use(helmet());
app.use(globalLimiter);

// ─── CORS ───────────────────────────────────────────
app.use(cors({
  origin: "*",   // Allow all origins for dev; restrict in production
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Body Parsing ───────────────────────────────────
app.use(express.json({ limit: "10kb" }));  // Limit body size for security
app.use(express.urlencoded({ extended: true }));

const { securityLogger } = require("./middleware/securityLogger");
app.use(securityLogger);

// ─── Request Logging ────────────────────────────────
app.use(morgan("dev"));

// ─── Health Check ───────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Service Orchestrator Backend Running 🚀",
    version: "1.0.0",
    endpoints: {
      service: "POST /api/service/request",
      booking: "GET  /api/booking/:bookingId",
      providers: "GET  /api/providers",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

// ─── API Routes ─────────────────────────────────────
app.use("/api", routes);

// ─── 404 Handler ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.originalUrl} not found` },
    statusCode: 404,
  });
});

// ─── Global Error Handler ───────────────────────────
app.use(errorHandler);

module.exports = app;
