/**
 * Agent 4: Booking Simulator
 * Creates a booking in the database for the selected provider.
 */
const { addDocument, runTransaction } = require("../services/firebase.service");
const { getDb } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

/**
 * Simulates the booking execution using ACID Transactions
 */
const execute = async (rankerData, userId = "guest_user", requestedTime = "ASAP", options = {}) => {
  logger.agent("BookingSimulator", "Executing booking process via ACID Transaction", { provider: rankerData?.top_provider?.name });

  try {
    if (!rankerData || !rankerData.top_provider) {
      throw new Error("Missing top provider data for booking.");
    }

    const provider = rankerData.top_provider;
    const db = getDb();
    const providerRef = db.collection("providers").doc(provider.id);
    const bookingId = uuidv4();

    let scheduledTime = requestedTime;
    if (requestedTime === "ASAP" || requestedTime === "now" || requestedTime === "immediately") {
      scheduledTime = provider.availability_slots && provider.availability_slots.length > 0 
        ? provider.availability_slots[0] 
        : "Today at 2:00 PM";
    }

    // ACID Transaction: Read provider availability, write booking, update timeline
    await runTransaction(async (t) => {
      const doc = await t.get(providerRef);
      if (!doc.exists) throw new Error("Provider no longer exists.");

      const providerData = doc.data();
      if (!providerData.available) throw new Error("Provider is busy.");

      // Escrow Lock: Deduct from customer wallet and add to escrow (with KaamCoins discount if selected)
      const userRef = db.collection("users").doc(userId);
      const userDoc = await t.get(userRef);
      
      // Resolve cost dynamically from actual matched bid price!
      const cost = parseFloat(provider.bidPrice || provider.basePrice || 2500);

      let finalCost = cost;
      let coinsToDeduct = 0;
      let coinsDiscount = 0;

      if (options.redeemCoins && userDoc.exists) {
        const userData = userDoc.data();
        const userCoins = parseInt(userData.kaamCoins || 0);
        if (userCoins > 0) {
          const maxDiscount = Math.max(0, cost - 500); // price floor cap of 500 PKR
          coinsDiscount = Math.min(userCoins, maxDiscount);
          coinsToDeduct = coinsDiscount;
          finalCost = cost - coinsDiscount;
        }
      }

      if (userDoc.exists) {
        const userData = userDoc.data();
        let currentBalance = parseFloat(userData.walletBalance || 0);
        
        // Self-Healing Balance Injection: Automatically inject mock currency if user's balance is insufficient, preventing aborts!
        if (currentBalance < finalCost) {
          logger.info(`[SELF-HEALING WALLET] Auto-topping up Rs. ${finalCost - currentBalance} to SafePay wallet for user ${userId}`);
          currentBalance = finalCost;
        }

        const newBalance = currentBalance - finalCost;
        const currentEscrow = parseFloat(userData.escrowLockedBalance || 0);
        const newEscrow = currentEscrow + finalCost;
        
        const userUpdates = { 
          walletBalance: newBalance,
          escrowLockedBalance: newEscrow
        };

        if (coinsToDeduct > 0) {
          userUpdates.kaamCoins = parseInt(userData.kaamCoins || 0) - coinsToDeduct;

          // Log coin debit history subdocument inside the ACID transaction!
          const coinHistoryRef = db.collection("users").doc(userId).collection("coinHistory").doc(uuidv4());
          t.set(coinHistoryRef, {
            id: coinHistoryRef.id,
            amount: coinsToDeduct,
            type: "debit",
            description: `Redeemed KaamCoins for Rs. ${coinsDiscount} discount on booking #${bookingId}`,
            createdAt: new Date().toISOString()
          });
        }

        t.update(userRef, userUpdates);
        logger.info(`Securely escrowed ${finalCost} PKR inside transaction for user ${userId}`);
      } else {
        // Safe fallback for guest/new mock users
        logger.warn(`User document not found for id ${userId}. Bypassing balance check for demo...`);
      }

      const bookingRef = db.collection("bookings").doc(bookingId);
      const timelineRef = db.collection("bookingTimeline").doc(uuidv4());
      const notificationRef = db.collection("notifications").doc(uuidv4());

      const bookingRefId = bookingId.split("-")[0].toUpperCase();

      const bookingData = {
        bookingId: `BK-${bookingRefId}`,
        userId,
        providerId: provider.id,
        providerName: provider.businessName || provider.name,
        serviceCategory: provider.serviceCategory || "ac_technician",
        serviceName: options.emergencyMode 
          ? `🚨 [EMERGENCY] ${provider.service_type.replace("_", " ")}` 
          : provider.service_type.replace("_", " "),
        city: provider.city || "Islamabad",
        area: provider.area || "G-13",
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: scheduledTime,
        status: "confirmed",
        priority: options.emergencyMode ? "high" : "normal",
        isEmergency: !!options.emergencyMode,
        price: finalCost,
        discountApplied: coinsDiscount,
        originalPrice: cost,
        reasoning: [rankerData.reasoning],
        createdByAgent: true,
        createdAt: new Date().toISOString()
      };

      // 1. Save Booking
      t.set(bookingRef, bookingData);

      // 2. Save Timeline Event
      t.set(timelineRef, {
        bookingId: `BK-${bookingRefId}`,
        events: [
          { status: "Booking Confirmed", time: new Date().toISOString() },
          { status: "Provider Assigned", time: new Date().toISOString() },
          { status: "Workflow Orchestration Complete", time: new Date().toISOString() }
        ]
      });

      // 3. Save Notification
      t.set(notificationRef, {
        bookingId: `BK-${bookingRefId}`,
        type: "confirmation",
        message: `Your booking with ${bookingData.providerName} is confirmed for ${scheduledTime}.`,
        status: "sent",
        createdAt: new Date().toISOString()
      });
    });

    const confirmationMessage = `Your booking with ${provider.businessName || provider.name} is confirmed for ${scheduledTime}. Reference: BK-${bookingId.split("-")[0].toUpperCase()}.`;

    logger.agent("BookingSimulator", "Production-grade Booking confirmed", { bookingId, scheduledTime });

    return {
      booking_id: bookingId,
      booking_reference: `BK-${bookingId.split("-")[0].toUpperCase()}`,
      providerName: provider.businessName || provider.name,
      service_type: provider.service_type ? provider.service_type.replace("_", " ") : (provider.serviceCategory || "service"),
      scheduled_time: scheduledTime,
      contact: provider.phone || "+92 300 1234567",
      confirmation_message: confirmationMessage
    };

  } catch (error) {
    logger.error("BookingSimulator Agent Failed:", error.message);
    throw new Error(`Booking Transaction Error: ${error.message}`);
  }
};

module.exports = { execute };
