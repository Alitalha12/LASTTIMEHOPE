const { addDocument, queryDocuments, updateDocument, getDocument } = require("../services/firebase.service");
const { logSystemEvent } = require("../middleware/securityLogger");
const logger = require("../utils/logger");

/**
 * Sync Profile Controller
 * Called by frontend after successful Firebase Auth signup to store extra data.
 * Requires `verifyFirebaseToken` middleware to have run first.
 */
exports.syncProfile = async (req, res) => {
  const userId = req.user.id;
  const email = req.user.email;

  try {
    const { fullName, phone, city, address, latitude, longitude, role, referralCode } = req.body;
    
    logger.info(`Syncing normalized profile for: ${email} (${userId})`);

    // ─── Zero-Trust Backend Validation Rules ──────────
    
    // 1. FullName validation (Only alphabets, spaces, dots, hyphens, and quotes, 3 to 50 characters)
    const nameRegex = /^[A-Za-z\s.'-]{3,50}$/;
    if (!fullName || !nameRegex.test(fullName)) {
      await logSystemEvent("syncProfile", "AuthController", "FAILURE", { userId, email, reason: "Invalid Name Format", fullName });
      return res.status(400).json({ 
        success: false, 
        message: "Full Name must only contain letters, spaces, dots, hyphens, or quotes (3 to 50 characters)." 
      });
    }

    // 2. Phone validation
    if (!phone || phone.length < 10) {
      await logSystemEvent("syncProfile", "AuthController", "FAILURE", { userId, email, reason: "Invalid Phone Format", phone });
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid phone number." 
      });
    }

    // 3. Address validation
    if (!address || address.trim().length === 0) {
      await logSystemEvent("syncProfile", "AuthController", "FAILURE", { userId, email, reason: "Missing Address" });
      return res.status(400).json({ 
        success: false, 
        message: "Address field cannot be empty. Please pick a location from the map." 
      });
    }

    // 4. Coordinates validation
    if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
      await logSystemEvent("syncProfile", "AuthController", "FAILURE", { userId, email, reason: "Invalid Coordinates", latitude, longitude });
      return res.status(400).json({ 
        success: false, 
        message: "Invalid GPS coordinates. Please drop a valid pin on the map." 
      });
    }

    const assignedRole = role === "provider" ? "provider" : "customer";

    // Feature 11: Referral Welcome Coins Logic
    const selfReferralCode = "REF-" + userId.substring(0, 6).toUpperCase();
    let bonusAwarded = false;
    let referrerId = null;

    if (referralCode && referralCode.trim().length > 0) {
      logger.info(`Evaluating signup referral code: ${referralCode}`);
      const referrers = await queryDocuments("users", [
        { field: "referralCode", operator: "==", value: referralCode.trim().toUpperCase() }
      ]);
      if (referrers && referrers.length > 0) {
        const referrer = referrers[0];
        referrerId = referrer.uid || referrer.id;
        
        // Reward referrer with 200 KaamCoins
        const referrerCoins = referrer.kaamCoins || 0;
        await updateDocument("users", referrerId, {
          kaamCoins: referrerCoins + 200
        });

        // Log referral event
        const { v4: uuidv4 } = require("uuid");
        await addDocument("referrals", uuidv4(), {
          referrerId,
          refereeId: userId,
          referralCode: referralCode.trim().toUpperCase(),
          coinsAwarded: 200,
          createdAt: new Date().toISOString()
        });

        bonusAwarded = true;
        logger.info(`Referral match! Referrer ${referrerId} & Referee ${userId} rewarded 200 KaamCoins.`);
      } else {
        logger.warn(`Referral code ${referralCode} did not match any active user.`);
      }
    }

    // 1. users Collection (Identity Layer)
    const userDoc = {
      uid: userId,
      fullName: fullName.trim(),
      username: email.split('@')[0],
      phoneNumber: phone.trim(),
      role: assignedRole,
      profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563EB&color=fff`,
      isPhoneVerified: true,
      status: "active",
      walletBalance: 5000.0, // Default virtual balance for Hackathon
      escrowLockedBalance: 0.0,
      kaamCoins: bonusAwarded ? 700 : 500, // Welcoming Coins Bonus! (+200 if referred)
      referralCode: selfReferralCode, // Shareable invite code
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    // 2. user_profiles Collection (Location & GPS Layer)
    const profileDoc = {
      userId,
      currentLocation: {
        city: city || "Islamabad",
        area: address.split(',')[0]?.trim() || "G-13",
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        source: "gps",
        updatedAt: new Date().toISOString()
      },
      addresses: [
        {
          label: "Home",
          city: city || "Islamabad",
          area: address.trim(),
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
          isDefault: true
        }
      ],
      gpsHistory: [
        {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
          timestamp: new Date().toISOString()
        }
      ]
    };

    // 3. user_settings Collection (AI Behavior Layer)
    const settingsDoc = {
      userId,
      preferredLanguage: "roman_urdu", // default
      communicationPreference: {
        push: true,
        whatsapp: true,
        sms: false
      },
      notifications: {
        enabled: true,
        bookingReminders: true,
        promotions: false
      },
      updatedAt: new Date().toISOString()
    };

    // 4. user_activity_logs Collection (AI Recommendation Layer)
    const activityDoc = {
      userId,
      bookingHistory: [],
      frequentlyUsedServices: {},
      serviceRatings: [],
      preferredLocations: [],
      aiRecommendationProfile: {
        userCategory: "New Register",
        predictedNextService: "None",
        predictedNextBookingTime: "",
        lastUpdated: new Date().toISOString()
      },
      orchestrationHistory: []
    };

    // Save to Firestore collections individually
    await addDocument("users", userId, userDoc);
    await addDocument("user_profiles", userId, profileDoc);
    await addDocument("user_settings", userId, settingsDoc);
    await addDocument("user_activity_logs", userId, activityDoc);

    if (assignedRole === "provider") {
      const providerDoc = {
        id: userId,
        fullName: fullName.trim(),
        service_type: "ac_technician", // Default category
        rating: 5.0,
        completedJobs: 0,
        city: city || "Islamabad",
        location: address.split(',')[0]?.trim() || "G-13",
        radiusKm: 15.0, // Default area radius limit
        available: true,
        badgeTier: "Silver",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await addDocument("providers", userId, providerDoc);
      logger.info(`Automatically created providers record for provider: ${userId}`);
    }

    await logSystemEvent("syncProfile", "AuthController", "SUCCESS", { userId, email, action: "Normalized 4-Collections Created", role: assignedRole });

    const combinedUser = {
      ...userDoc,
      id: userId,
      phone: phone.trim(),
      city: city || "Islamabad",
      address: address.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      profileDetails: profileDoc,
      settingsDetails: settingsDoc
    };

    res.status(201).json({ success: true, data: combinedUser });
  } catch (error) {
    logger.error(`Sync Profile Error: ${error.message}`);
    await logSystemEvent("syncProfile", "AuthController", "ERROR", { userId, email: req.user.email, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Profile Controller
 * Called by frontend on login or app start to fetch user details.
 */
exports.getProfile = async (req, res) => {
  const userId = req.user.id;
  const email = req.user.email || "";
  try {
    let user = await getDocument("users", userId);
    let profile = await getDocument("user_profiles", userId);
    let settings = await getDocument("user_settings", userId);
    
    if (!user) {
      // Self-healing fallback if profile got skipped
      logger.info(`Profile not found for ${email}. Auto-creating fallback normalized documents.`);
      
      const fullName = email ? email.split('@')[0] : "KaamKonnect User";
      
      user = await addDocument("users", userId, {
        uid: userId,
        fullName,
        username: email ? email.split('@')[0] : "user",
        phoneNumber: "+923000000000",
        role: "customer",
        profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563EB&color=fff`,
        isPhoneVerified: true,
        status: "active",
        walletBalance: 5000.0,
        escrowLockedBalance: 0.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      });

      profile = await addDocument("user_profiles", userId, {
        userId,
        currentLocation: {
          city: "Islamabad",
          area: "G-13",
          lat: 33.6844,
          lng: 73.0479,
          source: "gps",
          updatedAt: new Date().toISOString()
        },
        addresses: [
          {
            label: "Home",
            city: "Islamabad",
            area: "G-13",
            lat: 33.6844,
            lng: 73.0479,
            isDefault: true
          }
        ],
        gpsHistory: [
          {
            lat: 33.6844,
            lng: 73.0479,
            timestamp: new Date().toISOString()
          }
        ]
      });

      settings = await addDocument("user_settings", userId, {
        userId,
        preferredLanguage: "roman_urdu",
        communicationPreference: {
          push: true,
          whatsapp: true,
          sms: false
        },
        notifications: {
          enabled: true,
          bookingReminders: true,
          promotions: false
        },
        updatedAt: new Date().toISOString()
      });

      await logSystemEvent("getProfile", "AuthController", "SUCCESS", { userId, action: "Self-Healed Missing Normalized Profile" });
    }

    if (user && user.role === "provider") {
      const existingProvider = await getDocument("providers", userId);
      if (!existingProvider) {
        logger.info(`Provider record missing in providers collection for active provider: ${userId}. Self-healing...`);
        const providerDoc = {
          id: userId,
          fullName: user.fullName || "Specialist Expert",
          service_type: "ac_technician", // Default category
          rating: 5.0,
          completedJobs: 0,
          city: profile?.currentLocation?.city || "Islamabad",
          location: profile?.addresses?.[0]?.area?.split(',')[0]?.trim() || "G-13",
          radiusKm: 15.0,
          available: true,
          badgeTier: "Silver",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await addDocument("providers", userId, providerDoc);
        logger.info(`Successfully self-healed providers record for: ${userId}`);
      }
    }
    
    // BACKWARD COMPATIBLE COMBINED OBJ:
    const combinedUser = {
      ...user,
      id: userId,
      phone: user.phoneNumber || "+923000000000",
      avatar: user.avatar || user.profileImage || null,  // unified avatar field
      city: profile?.currentLocation?.city || "Islamabad",
      address: profile?.addresses?.[0]?.area || "G-13",
      latitude: profile?.currentLocation?.lat || 33.6844,
      longitude: profile?.currentLocation?.lng || 73.0479,
      profileDetails: profile,
      settingsDetails: settings
    };

    res.status(200).json({ success: true, data: combinedUser });
  } catch (error) {
    await logSystemEvent("getProfile", "AuthController", "ERROR", { userId, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Profile
 */
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const updates = req.body;
    
    delete updates.email;
    delete updates.role;

    if (updates.fullName) {
      const nameRegex = /^[A-Za-z\s]{3,50}$/;
      if (!nameRegex.test(updates.fullName)) {
        return res.status(400).json({ 
          success: false, 
          message: "Full Name must only contain letters and spaces (3 to 50 characters)." 
        });
      }
      updates.fullName = updates.fullName.trim();
    }

    if (updates.phone) {
      if (updates.phone.length < 10) {
        return res.status(400).json({ 
          success: false, 
          message: "Please enter a valid phone number." 
        });
      }
      updates.phoneNumber = updates.phone;
    }

    // Update users identity collection
    const userUpdates = { ...updates };
    delete userUpdates.address;
    delete userUpdates.latitude;
    delete userUpdates.longitude;
    delete userUpdates.city;

    // If avatar is explicitly sent, save it as both `avatar` and `profileImage` for compatibility
    if (userUpdates.avatar) {
      userUpdates.profileImage = userUpdates.avatar;
    }

    const updatedUser = await updateDocument("users", userId, userUpdates);

    // Update user_profiles collection
    if (updates.address || updates.latitude || updates.longitude) {
      const existingProfile = await getDocument("user_profiles", userId);
      if (existingProfile) {
        const profileUpdates = {
          currentLocation: {
            city: updates.city || existingProfile.currentLocation?.city || "Islamabad",
            area: updates.address?.split(',')[0]?.trim() || "G-13",
            lat: updates.latitude !== undefined ? parseFloat(updates.latitude) : (existingProfile.currentLocation?.lat || 33.6844),
            lng: updates.longitude !== undefined ? parseFloat(updates.longitude) : (existingProfile.currentLocation?.lng || 73.0479),
            source: "gps",
            updatedAt: new Date().toISOString()
          },
          addresses: [
            {
              label: "Home",
              city: updates.city || existingProfile.currentLocation?.city || "Islamabad",
              area: updates.address || "G-13",
              lat: updates.latitude !== undefined ? parseFloat(updates.latitude) : (existingProfile.currentLocation?.lat || 33.6844),
              lng: updates.longitude !== undefined ? parseFloat(updates.longitude) : (existingProfile.currentLocation?.lng || 73.0479),
              isDefault: true
            }
          ]
        };
        await updateDocument("user_profiles", userId, profileUpdates);
      }
    }

    const mergedUser = await getDocument("users", userId);
    const mergedProfile = await getDocument("user_profiles", userId);
    
    const combinedUser = {
      ...mergedUser,
      id: userId,
      phone: mergedUser.phoneNumber || "+923000000000",
      avatar: mergedUser.avatar || mergedUser.profileImage || null,
      city: mergedProfile?.currentLocation?.city || "Islamabad",
      address: mergedProfile?.addresses?.[0]?.area || "G-13",
      latitude: mergedProfile?.currentLocation?.lat || 33.6844,
      longitude: mergedProfile?.currentLocation?.lng || 73.0479,
    };

    await logSystemEvent("updateProfile", "AuthController", "SUCCESS", { userId, updates });
    res.status(200).json({ success: true, data: combinedUser });
  } catch (error) {
    await logSystemEvent("updateProfile", "AuthController", "ERROR", { userId, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update User Settings
 * PUT /api/auth/settings
 */
exports.updateSettings = async (req, res) => {
  const userId = req.user.id;
  try {
    const { preferredLanguage, communicationPreference, notifications } = req.body;
    
    const settingsUpdates = {};
    if (preferredLanguage) settingsUpdates.preferredLanguage = preferredLanguage;
    if (communicationPreference) settingsUpdates.communicationPreference = communicationPreference;
    if (notifications) settingsUpdates.notifications = notifications;
    
    settingsUpdates.updatedAt = new Date().toISOString();

    const updatedSettings = await updateDocument("user_settings", userId, settingsUpdates);
    
    await logSystemEvent("updateSettings", "AuthController", "SUCCESS", { userId, settingsUpdates });
    res.status(200).json({ success: true, data: updatedSettings });
  } catch (error) {
    await logSystemEvent("updateSettings", "AuthController", "ERROR", { userId, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Top Up Wallet Balance
 * POST /api/auth/wallet/top-up
 */
exports.topUpWallet = async (req, res) => {
  const userId = req.user.id;
  try {
    const { amount, cardDetails } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid top-up amount." });
    }

    const user = await getDocument("users", userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const currentBalance = parseFloat(user.walletBalance || 0);
    const newBalance = currentBalance + parseFloat(amount);

    await updateDocument("users", userId, {
      walletBalance: newBalance,
      updatedAt: new Date().toISOString()
    });

    await logSystemEvent("topUpWallet", "AuthController", "SUCCESS", { userId, topUpAmount: amount, newBalance });
    res.status(200).json({ success: true, walletBalance: newBalance, message: `Successfully added ${amount} PKR to your wallet!` });
  } catch (error) {
    await logSystemEvent("topUpWallet", "AuthController", "ERROR", { userId, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Upload Avatar (Simulated Avatar Update)
 * POST /api/auth/upload-avatar
 */
exports.uploadAvatar = async (req, res) => {
  const userId = req.user.id;
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "No avatar image URL provided." });
    }

    // Save as both `avatar` and `profileImage` for unified cross-screen access
    await updateDocument("users", userId, {
      avatar: imageUrl,
      profileImage: imageUrl,
      updatedAt: new Date().toISOString()
    });

    const updatedUser = await getDocument("users", userId);

    await logSystemEvent("uploadAvatar", "AuthController", "SUCCESS", { userId, imageUrl });
    res.status(200).json({ success: true, imageUrl, user: { ...updatedUser, id: userId, avatar: imageUrl }, message: "Avatar image updated successfully!" });
  } catch (error) {
    await logSystemEvent("uploadAvatar", "AuthController", "ERROR", { userId, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Initiate checkout top up gateway
 * POST /api/auth/wallet/top-up-gateway-initiate
 */
exports.initiateGatewayTopUp = async (req, res) => {
  const userId = req.user.id;
  try {
    const { amount, phone, gateway } = req.body;
    if (!amount || !phone || !gateway) {
      return res.status(400).json({ success: false, message: "Amount, phone, and gateway are required." });
    }

    const { v4: uuidv4 } = require("uuid");
    const sessionId = uuidv4();
    // Simulate dynamic OTP code
    const otpCode = String(Math.floor(1000 + Math.random() * 9000));

    // Save session in Firestore mock_otp_sessions
    await addDocument("mock_otp_sessions", sessionId, {
      sessionId,
      userId,
      amount: parseFloat(amount),
      phone,
      gateway,
      otpCode,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    logger.info(`[GATEWAY INIT] ${gateway} checkout initiated for ${phone} | Amount: Rs. ${amount} | OTP: ${otpCode}`);

    await logSystemEvent("initiateGatewayTopUp", "AuthController", "SUCCESS", { userId, phone, gateway, amount });
    res.status(200).json({ 
      success: true, 
      sessionId, 
      otpSimulated: otpCode, // Send the simulated OTP so the frontend can display it in high-end notification style!
      message: `Simulated OTP sent to ${phone} via ${gateway}` 
    });
  } catch (error) {
    logger.error("Initiate Gateway Topup Failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify checkout top up gateway OTP
 * POST /api/auth/wallet/top-up-gateway-verify
 */
exports.verifyGatewayTopUp = async (req, res) => {
  const userId = req.user.id;
  try {
    const { sessionId, otpCode } = req.body;
    if (!sessionId || !otpCode) {
      return res.status(400).json({ success: false, message: "Session ID and OTP Code are required." });
    }

    const session = await getDocument("mock_otp_sessions", sessionId);
    if (!session || session.status !== "pending") {
      return res.status(400).json({ success: false, message: "Invalid or expired payment checkout session." });
    }

    if (session.otpCode !== otpCode) {
      return res.status(400).json({ success: false, message: "Incorrect OTP code. Please try again." });
    }

    // Mark session verified
    await updateDocument("mock_otp_sessions", sessionId, {
      status: "verified",
      verifiedAt: new Date().toISOString()
    });

    // Credit user's wallet balance
    const userDoc = await getDocument("users", userId);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const currentBalance = parseFloat(userDoc.walletBalance || 0);
    const topUpAmount = parseFloat(session.amount);
    const newBalance = currentBalance + topUpAmount;

    await updateDocument("users", userId, {
      walletBalance: newBalance,
      updatedAt: new Date().toISOString()
    });

    // Write wallet transactions log for auditing
    const { v4: uuidv4 } = require("uuid");
    await addDocument("wallet_transactions", uuidv4(), {
      userId,
      amount: topUpAmount,
      type: "credit",
      gateway: session.gateway,
      phone: session.phone,
      description: `Wallet top-up via ${session.gateway} mock gateway`,
      timestamp: new Date().toISOString()
    });

    logger.success(`[GATEWAY VERIFY] Verified successfully! Credited Rs. ${topUpAmount} to ${userId}. New Balance: Rs. ${newBalance}`);

    await logSystemEvent("verifyGatewayTopUp", "AuthController", "SUCCESS", { userId, amount: topUpAmount, newBalance });
    res.status(200).json({ 
      success: true, 
      walletBalance: newBalance, 
      message: `Payment successful! Rs. ${topUpAmount} has been credited via ${session.gateway}.` 
    });
  } catch (error) {
    logger.error("Verify Gateway Topup Failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

