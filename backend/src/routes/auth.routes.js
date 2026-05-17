const router = require("express").Router();
const controller = require("../controllers/auth.controller");
const { verifyFirebaseToken } = require("../middleware/firebaseAuth");

// Protected Auth Routes (Require valid Firebase ID token)
router.post("/sync", verifyFirebaseToken, controller.syncProfile);
router.get("/profile", verifyFirebaseToken, controller.getProfile);
router.put("/profile", verifyFirebaseToken, controller.updateProfile);

// Settings & Wallet Routes
router.put("/settings", verifyFirebaseToken, controller.updateSettings);
router.post("/wallet/top-up", verifyFirebaseToken, controller.topUpWallet);
router.post("/wallet/top-up-gateway-initiate", verifyFirebaseToken, controller.initiateGatewayTopUp);
router.post("/wallet/top-up-gateway-verify", verifyFirebaseToken, controller.verifyGatewayTopUp);
router.post("/upload-avatar", verifyFirebaseToken, controller.uploadAvatar);

module.exports = router;
