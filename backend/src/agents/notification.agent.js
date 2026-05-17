/**
 * Agent 6: Notification Agent
 * Simulates sending an SMS or WhatsApp confirmation to the user.
 */
const logger = require("../utils/logger");

const execute = async (bookingData, pricingData) => {
  logger.agent("NotificationAgent", "Simulating Multi-Channel Notifications (WhatsApp, Email, Call)");

  try {
    // 1. WhatsApp Payload
    const whatsappPayload = `
WhatsApp:
✅ Booking Confirmed!
Service: ${bookingData.service_type}
Provider: ${bookingData.providerName}
Time: ${bookingData.scheduled_time}
Total Cost: Rs. ${pricingData.final_cost}
Provider Contact: ${bookingData.contact}
Reference: ${bookingData.booking_reference}
    `.trim();

    // 2. Email Payload
    const emailPayload = `
Email Subject: Your Service Booking Confirmation (${bookingData.booking_reference})
Body:
Dear Customer,
Your booking for a ${bookingData.service_type} has been successfully secured.
Provider: ${bookingData.providerName}
Cost Breakdown:
- Base: Rs. ${pricingData.quote_breakdown.base_rate}
- Surcharge: Rs. ${pricingData.quote_breakdown.distance_surcharge}
- Complexity: Rs. ${pricingData.quote_breakdown.complexity_cost}
Final Total: Rs. ${pricingData.final_cost}
Please be available at ${bookingData.scheduled_time}.
    `.trim();

    // 3. Automated Call (IVR) Transcript
    const callPayload = `
IVR Call Transcript:
"Hello! This is an automated call from AI Service Orchestrator. 
Your booking for a ${bookingData.service_type} with ${bookingData.providerName} is confirmed for ${bookingData.scheduled_time}. 
The total estimated cost is ${pricingData.final_cost} Rupees. 
Press 1 to repeat, or hang up to acknowledge."
    `.trim();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    logger.agent("NotificationAgent", "Multi-Channel Notifications Dispatched Successfully");

    return {
      status: "dispatched",
      channels: ["WhatsApp", "Email", "IVR_Call"],
      payloads: {
        whatsapp: whatsappPayload,
        email: emailPayload,
        ivr_call: callPayload
      }
    };

  } catch (error) {
    logger.error("NotificationAgent Failed:", error.message);
    throw new Error(`Notification Error: ${error.message}`);
  }
};

module.exports = { execute };
