/**
 * Booking Controller
 * Handles service request processing and booking queries — REAL Firebase queries
 */
const logger = require("../utils/logger");
const { getDocument, queryDocuments, updateDocument, addDocument, addSubDocument, getSubCollection } = require("../services/firebase.service");
const { sendSystemNotification } = require("./notification.controller");
const { v4: uuidv4 } = require("uuid");

/**
 * Re-calculates completions, rating, and synchronization of Trust Badges in Firestore
 */
const syncProviderStatsAndTier = async (providerId) => {
  try {
    if (!providerId) return;
    
    // 1. Get all completed bookings for this provider
    const completedBookings = await queryDocuments("bookings", [
      { field: "providerId", operator: "==", value: providerId },
      { field: "status", operator: "==", value: "completed" }
    ]);
    const completedJobsCount = completedBookings.length;

    // 2. Get all reviews for this provider
    const reviews = await queryDocuments("reviews", [
      { field: "providerId", operator: "==", value: providerId }
    ]);
    
    let avgRating = 5.0;
    if (reviews.length > 0) {
      const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
      avgRating = parseFloat((sumRatings / reviews.length).toFixed(1));
    }

    // 3. Determine trust badge tier (Silver -> Gold -> Diamond)
    let badgeTier = "Silver";
    if (completedJobsCount >= 10 && avgRating >= 4.7) {
      badgeTier = "Diamond";
    } else if (completedJobsCount >= 5 && avgRating >= 4.2) {
      badgeTier = "Gold";
    }

    logger.info(`[SYNC STATS & TIER] Provider: ${providerId} | Jobs: ${completedJobsCount} | Rating: ${avgRating} | Tier: ${badgeTier}`);

    // Self-healing: make sure provider document exists
    const provider = await getDocument("providers", providerId);
    if (!provider) {
      const user = await getDocument("users", providerId);
      const placeholder = {
        id: providerId,
        fullName: user?.fullName || "Expert Provider",
        service_type: "ac_technician",
        rating: avgRating,
        completedJobs: completedJobsCount,
        badgeTier: badgeTier,
        city: "Islamabad",
        location: "G-13",
        radiusKm: 15,
        available: true,
        distances: { "G-13": 1.0 }
      };
      await addDocument("providers", providerId, placeholder);
    } else {
      await updateDocument("providers", providerId, {
        completedJobs: completedJobsCount,
        rating: avgRating,
        badgeTier: badgeTier
      });
    }
  } catch (err) {
    logger.error(`Error in syncProviderStatsAndTier: ${err.message}`);
  }
};
/**
 * POST /api/service/request
 * Process a natural language service request through the agent pipeline
 */
const processServiceRequest = async (req, res, next) => {
  try {
    const { 
      userInput, 
      userId, 
      budgetType, 
      maxBudget, 
      selectionMode, 
      scheduleMode, 
      allowAIMemory, 
      historyDepth, 
      emergencyMode,
      redeemCoins 
    } = req.body;

    logger.info(`Orchestration requested by User: ${userId}. Input: "${userInput}"`);

    const orchestrator = require("../agents/orchestrator");
    
    // Run the pipeline
    const result = await orchestrator.run(userInput, userId, {
      budgetType,
      maxBudget,
      selectionMode,
      scheduleMode,
      allowAIMemory,
      historyDepth,
      emergencyMode,
      redeemCoins
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/booking/:bookingId
 * Fetch a specific booking by ID from Firestore
 */
const getBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    logger.info(`Fetching booking: ${bookingId}`);

    const booking = await getDocument("bookings", bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { message: "Booking not found" },
        statusCode: 404,
      });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/booking/user/:userId
 * Fetch all bookings for a user from Firestore
 */
const getUserBookings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    logger.info(`Fetching bookings for user: ${userId}`);

    const bookings = await queryDocuments("bookings", [
      { field: "userId", operator: "==", value: userId },
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/booking/:bookingId/status
 * Updates status of a booking — saves EVERY change to history subcollection
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { status, providerId, latitude, longitude } = req.body;
    logger.info(`Updating booking ${bookingId} status to: ${status}`);

    const booking = await getDocument("bookings", bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: { message: "Booking not found" } });
    }

    const now = new Date().toISOString();
    const updates = { status, statusUpdatedAt: now };
    if (providerId) updates.providerId = providerId;
    // Track timestamp per status
    const statusTimestampMap = {
      "accepted": "acceptedAt", "en-route": "visitStartedAt",
      "arrived": "arrivedAt", "in-progress": "workStartedAt",
      "completed": "completedAt", "rejected": "rejectedAt"
    };
    if (statusTimestampMap[status]) updates[statusTimestampMap[status]] = now;

    await updateDocument("bookings", bookingId, updates);

    // Write to history subcollection
    await addSubDocument("bookings", bookingId, "history", {
      event: status, triggeredBy: providerId ? "provider" : "customer",
      lat: latitude || null, lng: longitude || null,
    });

    // Send dynamic system alerts on status transitions!
    try {
      const pId = providerId || booking.providerId;
      const providerDoc = pId ? await getDocument("providers", pId) : null;
      const providerName = providerDoc?.fullName || "Your Service Specialist";
      
      const alerts = {
        "accepted": {
          userId: booking.userId,
          title: "💼 Booking Accepted!",
          body: `Expert ${providerName} has accepted your service request.`
        },
        "en-route": {
          userId: booking.userId,
          title: "🚗 Expert En Route!",
          body: `${providerName} is driving to your location now.`
        },
        "arrived": {
          userId: booking.userId,
          title: "📍 Expert Arrived!",
          body: `${providerName} has arrived at your location.`
        },
        "in-progress": {
          userId: booking.userId,
          title: "🔧 Work Started!",
          body: `Your service is now in progress. SafePay escrow is locked safely.`
        },
        "completed": {
          userId: booking.userId,
          title: "✅ Job Completed!",
          body: `Expert ${providerName} has completed the service. Release funds to approve.`
        },
        "disputed": {
          userId: booking.providerId,
          title: "⚖️ Dispute Filed",
          body: `Customer filed a dispute for booking #${bookingId}. AI Arbitrator will investigate.`
        }
      };

      const matchedAlert = alerts[status];
      if (matchedAlert && matchedAlert.userId) {
        await sendSystemNotification(matchedAlert.userId, matchedAlert.title, matchedAlert.body, bookingId, { status });
      }
    } catch (alertErr) {
      logger.error("Failed to trigger status notification alert:", alertErr.message);
    }

    const updatedBooking = await getDocument("bookings", bookingId);
    res.status(200).json({ success: true, data: updatedBooking });
  } catch (error) { next(error); }
};

/**
 * POST /api/booking/:bookingId/escrow-action
 * Customer releases escrow funds (Approve) or disputes the service (Dispute)
 */
const customerEscrowRelease = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { action, disputeReason } = req.body; // action: "release" | "dispute"
    logger.info(`Escrow action for ${bookingId}: ${action}`);

    const booking = await getDocument("bookings", bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: { message: "Booking not found" } });
    }

    const cost = parseFloat(booking.price || booking.cost || 2500);
    const userId = booking.userId;
    const providerId = booking.providerId;

    if (action === "release") {
      // Calculate 10% platform fee and 90% provider portion
      const platformFee = Math.round(cost * 0.10 * 100) / 100;
      const providerPortion = cost - platformFee;

      // 1. Release funds: Deduct from customer escrow & credit 10% KaamCoins cashback!
      const customer = await getDocument("users", userId);
      let coinsEarned = Math.round(cost * 0.10);
      if (customer) {
        const currentEscrow = parseFloat(customer.escrowLockedBalance || 0);
        const newEscrow = Math.max(0, currentEscrow - cost);
        const currentCoins = parseInt(customer.kaamCoins || 0);
        const newCoins = currentCoins + coinsEarned;
        
        await updateDocument("users", userId, { 
          escrowLockedBalance: newEscrow,
          kaamCoins: newCoins
        });

        // Log coin transaction inside sub-collection
        const { v4: uuidv4 } = require("uuid");
        await addSubDocument("users", userId, "coinHistory", {
          id: uuidv4(),
          amount: coinsEarned,
          type: "credit",
          description: `Earned 10% cash-back on completed service booking #${bookingId}`,
          createdAt: new Date().toISOString()
        });

        // Send real-time notification alert!
        await sendSystemNotification(
          userId,
          "🪙 KaamCoins Earned!",
          `Congratulations! You earned ${coinsEarned} KaamCoins (Rs. ${coinsEarned} Value) on your completed service!`,
          bookingId,
          { type: "loyalty_credit", coinsEarned }
        );
      }

      if (providerId) {
        const provider = await getDocument("users", providerId);
        if (provider) {
          const currentWallet = parseFloat(provider.walletBalance || 0);
          const newWallet = currentWallet + providerPortion;
          await updateDocument("users", providerId, { walletBalance: newWallet });
        }
      }

      // Update global platform treasury commission earnings
      try {
        let treasury = await getDocument("admin_treasury", "kaamkonnect");
        if (!treasury) {
          await addDocument("admin_treasury", "kaamkonnect", {
            totalEarnedCommission: platformFee,
            updatedAt: new Date().toISOString()
          });
        } else {
          const currentTreasury = parseFloat(treasury.totalEarnedCommission || 0);
          await updateDocument("admin_treasury", "kaamkonnect", {
            totalEarnedCommission: currentTreasury + platformFee
          });
        }
        logger.info(`Platform commission of Rs. ${platformFee} credited to Admin Treasury.`);
      } catch (err) {
        logger.error(`Failed to update admin treasury commission: ${err.message}`);
      }

      // Update booking status and write split details
      const updatedBooking = await updateDocument("bookings", bookingId, {
        status: "completed",
        escrowStatus: "released",
        platformFee,
        providerEarnings: providerPortion
      });

      res.status(200).json({ success: true, message: "Funds released successfully", data: updatedBooking });

    } else if (action === "dispute") {
      // 2. Dispute: Mark status as disputed, log dispute reason
      const updatedBooking = await updateDocument("bookings", bookingId, {
        status: "disputed",
        escrowStatus: "locked",
        disputeReason: disputeReason || "Disputed by customer"
      });

      // Deduct provider ratings dynamically in Firestore (e.g. deduct rating by 0.5)
      if (providerId) {
        const providerRef = await getDocument("providers", providerId);
        if (providerRef) {
          const currentRating = parseFloat(providerRef.rating || 5.0);
          const newRating = Math.max(1.0, currentRating - 0.5);
          await updateDocument("providers", providerId, { rating: newRating });
          logger.info(`Deducted provider rating for ${providerId} to ${newRating}`);
        }
      }

      res.status(200).json({ success: true, message: "Booking disputed successfully", data: updatedBooking });
    } else {
      res.status(400).json({ success: false, message: "Invalid action" });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/booking/provider/:providerId
 * Fetch all bookings assigned to a provider
 */
const getProviderBookings = async (req, res, next) => {
  try {
    const { providerId } = req.params;
    logger.info(`Fetching bookings for provider: ${providerId}`);

    const bookings = await queryDocuments("bookings", [
      { field: "providerId", operator: "==", value: providerId },
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/booking/:bookingId/arbitrate
 * Triggers autonomous AI Dispute Arbitrator agent
 */
const runDisputeArbitration = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    logger.info(`AI Arbitration triggered for booking: ${bookingId}`);

    const booking = await getDocument("bookings", bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: { message: "Booking not found" } });
    }

    if (booking.status !== "disputed") {
      return res.status(400).json({ success: false, message: "Booking is not in disputed state" });
    }

    // Require and execute AI Arbitrator Agent
    const arbitratorAgent = require("../agents/arbitrator.agent");
    const verdict = await arbitratorAgent.execute(booking);

    const cost = parseFloat(booking.price || 2500);
    const custRefund = Math.round(cost * (verdict.customer_refund_percentage / 100) * 100) / 100;
    const provReleaseTotal = cost - custRefund;

    // Platform Commission Split (10% platform, 90% provider earnings)
    const platformFee = Math.round(provReleaseTotal * 0.10 * 100) / 100;
    const providerEarnings = provReleaseTotal - platformFee;

    // Update Customer Escrow & Wallet
    const customer = await getDocument("users", booking.userId);
    if (customer) {
      const currentEscrow = parseFloat(customer.escrowLockedBalance || 0);
      const newEscrow = Math.max(0, currentEscrow - cost);
      const currentWallet = parseFloat(customer.walletBalance || 0);
      const newWallet = currentWallet + custRefund;
      await updateDocument("users", booking.userId, { 
        escrowLockedBalance: newEscrow,
        walletBalance: newWallet
      });
    }

    // Update Provider Wallet
    if (booking.providerId) {
      const provider = await getDocument("users", booking.providerId);
      if (provider) {
        const currentWallet = parseFloat(provider.walletBalance || 0);
        const newWallet = currentWallet + providerEarnings;
        await updateDocument("users", booking.providerId, { walletBalance: newWallet });
      }
    }

    // Update Global Platform Treasury Commission
    try {
      let treasury = await getDocument("admin_treasury", "kaamkonnect");
      if (!treasury) {
        await addDocument("admin_treasury", "kaamkonnect", {
          totalEarnedCommission: platformFee,
          updatedAt: new Date().toISOString()
        });
      } else {
        const currentTreasury = parseFloat(treasury.totalEarnedCommission || 0);
        await updateDocument("admin_treasury", "kaamkonnect", {
          totalEarnedCommission: currentTreasury + platformFee
        });
      }
    } catch (err) {
      logger.error(`Failed to update treasury in arbitration: ${err.message}`);
    }

    // Update Booking status to reflect arbitration completion
    const updatedBooking = await updateDocument("bookings", bookingId, {
      status: "completed",
      escrowStatus: "arbitrated",
      platformFee,
      providerEarnings,
      customerRefund: custRefund,
      arbitrationVerdict: verdict
    });

    // Synchronize Trust Badges & metrics in Firestore (Feature 12)
    await syncProviderStatsAndTier(booking.providerId);

    // Write system audit logs
    const { addDocument: addDoc } = require("../services/firebase.service");
    const { v4: uuidv4 } = require("uuid");
    await addDoc("system_events", uuidv4(), {
      bookingId,
      action: "AI_ARBITRATION_VERDICT",
      verdict,
      timestamp: new Date().toISOString()
    });

    // Dispatch real-time alerts to both customer and provider!
    try {
      await sendSystemNotification(
        booking.userId,
        "⚖️ Arbitration Verdict Resolved!",
        `AI Court has resolved your dispute. Split: Customer Refund ${verdict.customer_refund_percentage}%.`,
        bookingId,
        { type: "arbitration_complete", verdict }
      );
      if (booking.providerId) {
        await sendSystemNotification(
          booking.providerId,
          "⚖️ Arbitration Verdict Resolved!",
          `AI Court has resolved the dispute. Split: Customer Refund ${verdict.customer_refund_percentage}%.`,
          bookingId,
          { type: "arbitration_complete", verdict }
        );
      }
    } catch (alertErr) {
      logger.error("Failed to send dispute arbitration alerts:", alertErr.message);
    }

    res.status(200).json({
      success: true,
      message: "AI Arbitration completed successfully",
      verdict,
      data: updatedBooking
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/booking/:bookingId/verify-proof-of-work
 * Technician uploads base64 proof-of-work photo to release escrow
 */
const verifyProofOfWork = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { proofImage } = req.body;
    logger.info(`AI Proof of Work Photo Verification triggered for booking: ${bookingId}`);

    const booking = await getDocument("bookings", bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: { message: "Booking not found" } });
    }

    // Require and execute Vision Verifier Agent
    const visionVerifier = require("../agents/visionVerifier.agent");
    const verification = await visionVerifier.verify(booking, proofImage);

    if (verification.success) {
      const cost = parseFloat(booking.price || booking.cost || 2500);
      const userId = booking.userId;
      const providerId = booking.providerId;

      // Platform commission split
      const platformFee = Math.round(cost * 0.10 * 100) / 100;
      const providerPortion = cost - platformFee;

      // 1. Release funds: Deduct from customer escrow
      const customer = await getDocument("users", userId);
      if (customer) {
        const currentEscrow = parseFloat(customer.escrowLockedBalance || 0);
        const newEscrow = Math.max(0, currentEscrow - cost);
        await updateDocument("users", userId, { escrowLockedBalance: newEscrow });
      }

      // 2. Add earnings to provider wallet
      if (providerId) {
        const provider = await getDocument("users", providerId);
        if (provider) {
          const currentWallet = parseFloat(provider.walletBalance || 0);
          const newWallet = currentWallet + providerPortion;
          await updateDocument("users", providerId, { walletBalance: newWallet });
        }
      }

      // 3. Update global platform treasury commission
      try {
        let treasury = await getDocument("admin_treasury", "kaamkonnect");
        if (!treasury) {
          const { addDocument } = require("../services/firebase.service");
          await addDocument("admin_treasury", "kaamkonnect", {
            totalEarnedCommission: platformFee,
            updatedAt: new Date().toISOString()
          });
        } else {
          const currentTreasury = parseFloat(treasury.totalEarnedCommission || 0);
          await updateDocument("admin_treasury", "kaamkonnect", {
            totalEarnedCommission: currentTreasury + platformFee
          });
        }
      } catch (err) {
        logger.error(`Failed to update admin treasury in vision release: ${err.message}`);
      }

      // Update booking status
      const updatedBooking = await updateDocument("bookings", bookingId, {
        status: "completed",
        escrowStatus: "released",
        platformFee,
        providerEarnings: providerPortion,
        proofOfWorkPhotoVerified: true,
        proofOfWorkVerificationResult: verification
      });

      // Synchronize Trust Badges & metrics in Firestore (Feature 12)
      await syncProviderStatsAndTier(booking.providerId);

      // Dispatch alert
      try {
        await sendSystemNotification(
          booking.userId,
          "🎉 Job Successfully Verified!",
          `Proof of Work verified by AI vision! SafePay Escrow released. Please leave a review!`,
          bookingId,
          { status: "completed" }
        );
      } catch (err) {
        logger.error("Failed to send verifyProofOfWork notification:", err.message);
      }

      return res.status(200).json({
        success: true,
        message: "AI Proof-of-Work successfully verified and escrow released! 🎉",
        verification,
        data: updatedBooking
      });
    } else {
      // Validation failed: Mark booking status as disputed/locked, write verification audit logs
      const updatedBooking = await updateDocument("bookings", bookingId, {
        status: "disputed",
        escrowStatus: "locked",
        disputeReason: "AI Proof-of-Work Verification Failed: " + (verification.message || "Invalid image match."),
        proofOfWorkPhotoVerified: false,
        proofOfWorkVerificationResult: verification
      });

      // Deduct provider rating dynamically
      if (booking.providerId) {
        const providerRef = await getDocument("providers", booking.providerId);
        if (providerRef) {
          const currentRating = parseFloat(providerRef.rating || 5.0);
          const newRating = Math.max(1.0, currentRating - 0.5);
          await updateDocument("providers", booking.providerId, { rating: newRating });
        }
      }

      // Dispatch alert
      try {
        await sendSystemNotification(
          booking.userId,
          "🚨 Proof of Work Rejected!",
          `AI vision found issues with submitted Proof of Work. SafePay Escrow locked for dispute.`,
          bookingId,
          { status: "disputed" }
        );
      } catch (err) {
        logger.error("Failed to send verifyProofOfWork failure notification:", err.message);
      }

      return res.status(400).json({
        success: false,
        message: "AI Proof-of-Work Verification Failed! SafePay Escrow locked for manual arbitration.",
        verification,
        data: updatedBooking
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/service/confirm-match
 * Resumes manual pipeline matching Phase 2 for selected provider
 */
const confirmMatch = async (req, res, next) => {
  try {
    const { workflowSessionId, selectedProviderId, scheduleMode } = req.body;
    logger.info(`Resuming manual matching for session ${workflowSessionId} with provider ${selectedProviderId}`);

    const orchestrator = require("../agents/orchestrator");
    const result = await orchestrator.resume(workflowSessionId, selectedProviderId, { scheduleMode });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/booking/:bookingId/start-visit
 * Provider starts journey to customer — sets status en-route, begins GPS history
 */
const startVisit = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { providerId, latitude, longitude, providerName, providerAvatar } = req.body;
    const now = new Date().toISOString();

    const booking = await getDocument("bookings", bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Update booking status to en-route
    await updateDocument("bookings", bookingId, {
      status: "en-route",
      visitStartedAt: now,
      providerLat: latitude || null,
      providerLng: longitude || null,
      providerName: providerName || booking.providerName || "Provider",
      providerAvatar: providerAvatar || booking.providerAvatar || null,
    });

    // History entry
    await addSubDocument("bookings", bookingId, "history", {
      event: "en-route",
      triggeredBy: "provider",
      providerId,
      lat: latitude, lng: longitude,
      message: "Provider started journey to customer location",
    });

    logger.success(`[StartVisit] Booking ${bookingId} is now EN-ROUTE`);

    // Dispatch real-time customer alert!
    try {
      const pId = providerId || booking.providerId;
      const providerDoc = pId ? await getDocument("providers", pId) : null;
      const pName = providerDoc?.fullName || providerName || booking.providerName || "Your Service Specialist";
      await sendSystemNotification(
        booking.userId,
        "🚗 Expert En Route!",
        `${pName} is driving to your location now.`,
        bookingId,
        { status: "en-route" }
      );
    } catch (err) {
      logger.error("Failed to send startVisit notification:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Visit started! Customer will see your live location.",
      bookingId,
      status: "en-route",
      startedAt: now,
    });
  } catch (error) { next(error); }
};

/**
 * POST /api/booking/:bookingId/provider-arrived
 * Provider has arrived at customer location — sets status arrived
 */
const providerArrived = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { providerId, latitude, longitude } = req.body;
    const now = new Date().toISOString();

    const booking = await getDocument("bookings", bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    await updateDocument("bookings", bookingId, {
      status: "arrived",
      arrivedAt: now,
      providerLat: latitude || null,
      providerLng: longitude || null,
    });

    await addSubDocument("bookings", bookingId, "history", {
      event: "arrived",
      triggeredBy: "provider",
      providerId,
      lat: latitude, lng: longitude,
      message: "Provider has arrived at customer home",
    });

    logger.success(`[ProviderArrived] Booking ${bookingId} — Provider ARRIVED`);

    // Dispatch real-time arrival alert!
    try {
      const pId = providerId || booking.providerId;
      const providerDoc = pId ? await getDocument("providers", pId) : null;
      const pName = providerDoc?.fullName || "Your Service Specialist";
      await sendSystemNotification(
        booking.userId,
        "📍 Expert Arrived!",
        `${pName} has arrived at your location.`,
        bookingId,
        { status: "arrived" }
      );
    } catch (err) {
      logger.error("Failed to send providerArrived notification:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Arrived! Customer has been notified.",
      bookingId,
      status: "arrived",
      arrivedAt: now,
    });
  } catch (error) { next(error); }
};

/**
 * GET /api/booking/:bookingId/history
 * Get full event history for a booking from subcollection
 */
const getBookingHistory = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const history = await getSubCollection("bookings", bookingId, "history");
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) { next(error); }
};

/**
 * POST /api/booking/:bookingId/review
 * Customer reviews a completed service order, dynamically recalculating provider stats
 */
const submitReview = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Please provide a valid rating between 1 and 5 stars." });
    }

    const booking = await getDocument("bookings", bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.status !== "completed") {
      return res.status(400).json({ success: false, message: "Reviews can only be submitted for completed orders." });
    }

    if (booking.reviewed) {
      return res.status(400).json({ success: false, message: "You have already submitted a review for this booking." });
    }

    const reviewId = `REV-${uuidv4().substring(0, 8).toUpperCase()}`;
    const userDoc = await getDocument("users", userId);
    const customerName = userDoc?.fullName || "Valued Client";

    const reviewDoc = {
      id: reviewId,
      bookingId,
      providerId: booking.providerId,
      userId,
      customerName,
      rating: parseFloat(rating),
      comment: comment || "",
      createdAt: new Date().toISOString()
    };

    // Save to reviews collection
    await addDocument("reviews", reviewId, reviewDoc);

    // Mark booking reviewed
    await updateDocument("bookings", bookingId, { reviewed: true, reviewId });

    // Recalculate provider ratings dynamically & sync Trust Badges (Feature 12)
    if (booking.providerId) {
      await syncProviderStatsAndTier(booking.providerId);

      // Notify the provider
      try {
        await sendSystemNotification(
          booking.providerId,
          "⭐ New Review Received!",
          `Client rated you ${rating} stars: "${comment ? comment.substring(0, 30) + '...' : 'No comment'}"`,
          bookingId,
          { status: "completed" }
        );
      } catch (err) {
        logger.error("Failed to send review alert:", err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Review submitted successfully! Thank you for your feedback.",
      data: reviewDoc
    });
  } catch (error) { next(error); }
};

/**
 * POST /api/booking/reviews/:reviewId/reply
 * Provider replies publicly to a customer review
 */
const replyToReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { replyText } = req.body;
    const providerId = req.user.id;

    if (!replyText || replyText.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Reply text cannot be empty." });
    }

    const review = await getDocument("reviews", reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    if (review.providerId !== providerId) {
      return res.status(403).json({ success: false, message: "Unauthorized. You can only reply to reviews written for you." });
    }

    await updateDocument("reviews", reviewId, {
      replyText: replyText.trim(),
      repliedAt: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: "Reply saved successfully.",
      data: {
        ...review,
        replyText: replyText.trim(),
        repliedAt: new Date().toISOString()
      }
    });
  } catch (error) { next(error); }
};

module.exports = { 
  processServiceRequest, 
  getBooking, 
  getUserBookings,
  updateBookingStatus,
  customerEscrowRelease,
  getProviderBookings,
  runDisputeArbitration,
  verifyProofOfWork,
  confirmMatch,
  startVisit,
  providerArrived,
  getBookingHistory,
  submitReview,
  replyToReview
};
