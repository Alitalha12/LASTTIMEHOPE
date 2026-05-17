/**
 * Booking & Service Routes
 * POST /api/service/request — Process service request through agent pipeline
 * GET  /api/booking/:bookingId — Get specific booking
 * GET  /api/booking/user/:userId — Get all bookings for a user
 */
const router = require("express").Router();
const controller = require("../controllers/booking.controller");
const validate = require("../middleware/validate");
const { serviceRequestSchema } = require("../validators/booking.validator");
const { protect } = require("../middleware/auth.middleware");
const { apiLimiter } = require("../middleware/rateLimiter");

// Service request — Protected, Rate Limited, and Validated
router.post("/request", apiLimiter, validate(serviceRequestSchema), controller.processServiceRequest);
router.post("/confirm-match", apiLimiter, controller.confirmMatch);

module.exports = router;
