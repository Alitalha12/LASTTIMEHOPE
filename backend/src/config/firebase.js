/**
 * Firebase Configuration
 * Initializes Firebase Admin SDK and exports Firestore instance
 */
const admin = require("firebase-admin");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");

let db = null;

const initializeFirebase = () => {
  if (db) return db;

  try {
    const serviceAccountPath = path.join(__dirname, "../../serviceAccountKey.json");

    // Check if service account file exists
    if (!fs.existsSync(serviceAccountPath)) {
      logger.warn(
        "serviceAccountKey.json not found. Firebase will not be initialized.",
        "Download it from Firebase Console → Project Settings → Service Accounts"
      );
      return null;
    }

    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    logger.success("Firebase Firestore initialized successfully");
    return db;
  } catch (error) {
    logger.error("Failed to initialize Firebase", error.message);
    return null;
  }
};

const getDb = () => {
  if (!db) {
    db = initializeFirebase();
  }
  return db;
};

module.exports = { initializeFirebase, getDb };
