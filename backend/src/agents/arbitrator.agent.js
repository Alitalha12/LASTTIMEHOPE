/**
 * Agent 9: AI Autonomic Dispute Arbitrator
 * Uses Groq SDK to autonomously resolve billing disputes between customers and providers
 */
const Groq = require("groq-sdk");
const logger = require("../utils/logger");

// Initialize Groq API client
let groq;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/**
 * Arbitrate a billing dispute dynamically based on evidence
 * @param {object} booking - The full booking document
 * @returns {object} Structured JSON verdict
 */
const execute = async (booking) => {
  logger.agent("AIArbitrator", `Starting dispute arbitration for Booking: ${booking.bookingId}`);

  const prompt = `
You are an advanced autonomic AI Legal Arbitrator for KaamKonnect (an on-demand informal economy service marketplace).
You are tasked with resolving a service billing dispute between a customer and a service provider. The customer's funds are locked inside the SafePay Escrow contract.

Below are the booking and dispute details:
------------------------------------------
Booking ID: ${booking.bookingId}
Service Category: ${booking.serviceCategory}
Service Name: ${booking.serviceName}
Location: ${booking.area}, ${booking.city}
Agreed Price: Rs. ${booking.price}
Dispute Complaint (Customer): "${booking.disputeReason || "No complaint text provided"}"
Created Date: ${booking.createdAt}
------------------------------------------

Task:
1. Act as a fair, objective judge. Weigh the customer's complaint.
2. Determine how the escrow funds should be split fairly between the customer and provider as percentages (must sum to exactly 100).
   - If the provider failed to deliver or did terrible work, refund the customer 80% to 100%.
   - If the service was delivered but had minor issues or provider arrived late, do a split (e.g. 50/50, 40/60, 30/70).
   - If the dispute seems arbitrary or weak, favor the provider (e.g. 20% customer refund, 80% provider release).
3. Write a detailed verdict in **Roman Urdu** (the customer-friendly language, e.g., "Aap ka dispute hal kar diya gaya hai. AC cooling problem ki wajah se hum customer ko 70% refund de rahay hain...").
4. Explain your verdict reasoning in short English bullet points.

Return the result STRICTLY as a valid JSON object without markdown formatting.
JSON format should be exactly:
{
  "verdict_urdu": "Detailed Roman Urdu verdict text explanation to show both users.",
  "customer_refund_percentage": 70, 
  "provider_refund_percentage": 30,
  "reasoning": "Brief English bullet points summarizing the decision."
}
`;

  try {
    if (!groq) {
      throw new Error("GROQ_API_KEY is not defined in environment variables.");
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const responseText = chatCompletion.choices[0].message.content.trim();

    // Extract JSON block safely
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid model response: JSON block missing");
    }

    let jsonString = responseText.substring(jsonStart, jsonEnd + 1);
    // Sanitize unescaped control characters (like raw newlines and tabs) to prevent JSON.parse failures
    jsonString = jsonString.replace(/[\r\n\t]+/g, " ");
    const parsedVerdict = JSON.parse(jsonString);

    // Validate percentages sum up to 100
    const custRef = parseFloat(parsedVerdict.customer_refund_percentage || 0);
    const provRef = parseFloat(parsedVerdict.provider_refund_percentage || 0);
    
    if (custRef + provRef !== 100) {
      parsedVerdict.customer_refund_percentage = 50;
      parsedVerdict.provider_refund_percentage = 50;
      parsedVerdict.reasoning += " (Adjusted to equal 50/50 split due to validation bounds)";
    }

    logger.agent("AIArbitrator", "Arbitration verdict generated successfully", parsedVerdict);
    return parsedVerdict;

  } catch (error) {
    logger.error("AIArbitrator Agent Failed:", error.message);
    
    // Fail-safe graceful fallback so the application never breaks
    const fallbackVerdict = {
      verdict_urdu: "System issue ki wajah se automated arbitration complete nahi ho saki. KaamKonnect safety guidelines ke tehat hum aap ka balance 50% split kar rahay hain.",
      customer_refund_percentage: 50,
      provider_refund_percentage: 50,
      reasoning: "Graceful automated system fallback. 50/50 split due to model processing issue."
    };
    logger.warn("Applied fail-safe dispute arbitration fallback.");
    return fallbackVerdict;
  }
};

module.exports = { execute };
