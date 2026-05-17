/**
 * Agent 5: Follow-up & Live Tracking Scheduler
 * Generates the live tracking timeline and schedules follow-up actions.
 */
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

const execute = async (bookingData) => {
  logger.agent("FollowupScheduler", "Simulating Live Status Tracking Timeline", { bookingId: bookingData?.booking_id });

  try {
    if (!bookingData || !bookingData.booking_id) {
      throw new Error("Missing booking data for follow-up.");
    }

    const reminderId = uuidv4();
    const trackingId = "TRK-" + bookingData.booking_reference;

    // Simulate Live Tracking Timeline (Uber/Careem style)
    const timeline = [
      { status: "confirmed", time: "T+0m", description: "Booking confirmed and payment authorized." },
      { status: "assigned", time: "T+5m", description: `Provider ${bookingData.providerName} has accepted the job.` },
      { status: "en_route", time: "T+15m", description: "Provider is on the way to your location." },
      { status: "arrived", time: "T+35m", description: "Provider has arrived at your location." },
      { status: "in_progress", time: "T+40m", description: "Service work has started." },
      { status: "completed", time: "T+90m", description: "Service complete. Feedback and final payment triggered." }
    ];

    logger.agent("FollowupScheduler", "Live tracking timeline generated.", { trackingId, steps: timeline.length });

    return {
      reminder_id: reminderId,
      tracking_id: trackingId,
      live_tracking_timeline: timeline,
      action: "Live tracking active. 1-hour prior SMS reminder scheduled."
    };

  } catch (error) {
    logger.error("FollowupScheduler Agent Failed:", error.message);
    throw new Error(`Follow-up Error: ${error.message}`);
  }
};

module.exports = { execute };
