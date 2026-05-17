/**
 * Route Aggregator
 * All routes are registered here and imported into app.js
 */
const router = require("express").Router();

const serviceRoutes  = require('./service.routes');
const bookingRoutes  = require('./booking.routes');
const providerRoutes = require('./provider.routes');
const authRoutes     = require('./auth.routes');
const chatRoutes     = require('./chat.routes');
const memoryRoutes   = require('./memory.routes');
const notificationRoutes = require('./notification.routes');

// Mount route groups
router.use('/service',   serviceRoutes);    // POST /api/service/request
router.use('/booking',   bookingRoutes);    // GET  /api/booking/:id
router.use('/providers', providerRoutes);   // GET  /api/providers
router.use('/auth',      authRoutes);       // Auth routes (login/register)
router.use('/chat',      chatRoutes);       // Chat routes (translation/transcription)
router.use('/memory',    memoryRoutes);     // AI Memory routes
router.use('/notifications', notificationRoutes); // Alerts & Push tokens

module.exports = router;
