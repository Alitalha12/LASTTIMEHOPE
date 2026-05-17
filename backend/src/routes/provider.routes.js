/**
 * Provider Routes
 * GET /api/providers — List/search providers
 * GET /api/providers/:providerId — Get provider by ID
 */
const router = require("express").Router();
const controller = require("../controllers/provider.controller");
const { verifyFirebaseToken } = require("../middleware/firebaseAuth");

router.get("/", controller.getProviders);
router.get("/earnings", verifyFirebaseToken, controller.getEarningsAnalytics);
router.get("/favorites", verifyFirebaseToken, controller.getFavorites);
router.get("/:providerId/availability", controller.getAvailability);
router.get("/:providerId/reviews", controller.getProviderReviews);
router.put("/availability", verifyFirebaseToken, controller.updateAvailability);
router.put("/radius", verifyFirebaseToken, controller.updateRadius);
router.get("/:providerId", controller.getProviderById);
router.post("/:providerId/favorite", verifyFirebaseToken, controller.toggleFavorite);

module.exports = router;
