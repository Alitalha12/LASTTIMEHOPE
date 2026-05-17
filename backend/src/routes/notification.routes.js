/**
 * Notification Routes
 * Exposes API endpoints for alerts and push token registrations
 */
const router = require("express").Router();
const controller = require("../controllers/notification.controller");
const { protect } = require("../middleware/auth.middleware");

// GET /api/notifications/:userId - Get all notifications for a user (Protected)
router.get("/:userId", protect, controller.getNotifications);

// PUT /api/notifications/:notificationId/read - Mark notification as read (Protected)
router.put("/:notificationId/read", protect, controller.markAsRead);

// POST /api/notifications/register-token - Register Expo Push Token (Protected)
router.post("/register-token", protect, controller.registerPushToken);

module.exports = router;
