/**
 * Booking Routes
 * GET /api/booking/:bookingId — Get specific booking
 * GET /api/booking/user/:userId — Get all user bookings
 */
const router = require("express").Router();
const controller = require("../controllers/booking.controller");
const { verifyFirebaseToken } = require("../middleware/firebaseAuth");

router.get("/:bookingId", verifyFirebaseToken, controller.getBooking);
router.get("/user/:userId", verifyFirebaseToken, controller.getUserBookings);
router.get("/provider/:providerId", verifyFirebaseToken, controller.getProviderBookings);
router.get("/:bookingId/history", verifyFirebaseToken, controller.getBookingHistory);
router.put("/:bookingId/status", verifyFirebaseToken, controller.updateBookingStatus);
router.post("/:bookingId/escrow-action", verifyFirebaseToken, controller.customerEscrowRelease);
router.post("/:bookingId/arbitrate", verifyFirebaseToken, controller.runDisputeArbitration);
router.post("/:bookingId/verify-proof-of-work", verifyFirebaseToken, controller.verifyProofOfWork);
router.post("/:bookingId/start-visit", verifyFirebaseToken, controller.startVisit);
router.post("/:bookingId/provider-arrived", verifyFirebaseToken, controller.providerArrived);

router.post("/:bookingId/review", verifyFirebaseToken, controller.submitReview);
router.post("/reviews/:reviewId/reply", verifyFirebaseToken, controller.replyToReview);

module.exports = router;
