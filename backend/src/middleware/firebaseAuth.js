const { getAuth } = require("firebase-admin/auth");
const { getDb } = require("../config/firebase");
const logger = require("../utils/logger");

/**
 * Middleware to verify Firebase ID Token
 * Ensures that the requester is a valid, authenticated user via Google Firebase
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    
    // Verify token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Attach the uid to the request for controllers to use
    req.user = { id: decodedToken.uid, email: decodedToken.email };
    
    next();
  } catch (error) {
    logger.error(`Firebase Auth Error: ${error.message}`);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = { verifyFirebaseToken };
