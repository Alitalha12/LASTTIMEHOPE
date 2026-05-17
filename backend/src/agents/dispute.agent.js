/**
 * Agent 8: Dispute Agent
 * Handles complaints or issues dynamically.
 */
const logger = require("../utils/logger");

const execute = async (userInput, parsedIntent) => {
  // Simple check: if user implies a problem or complaint, this agent kicks in.
  const complaintKeywords = ["late", "broke", "bad", "complain", "refund", "issue", "problem", "masla", "kharab", "fake"];
  
  const isDispute = complaintKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(userInput);
  });

  if (!isDispute) {
    return { status: "not_triggered" };
  }

  logger.agent("DisputeAgent", "Dispute triggered by user input.");
  const { addDocument } = require("../services/firebase.service");

  try {
    const disputeId = "DISP-" + Math.floor(Math.random() * 100000);
    const action = `Dispute ticket ${disputeId} created. A human agent will contact you within 24 hours.`;

    await addDocument("disputes", disputeId, {
      id: disputeId,
      issueType: "general_complaint",
      description: userInput,
      status: "open",
      createdAt: new Date().toISOString()
    });

    logger.agent("DisputeAgent", action, { disputeId });

    return {
      status: "triggered",
      dispute_id: disputeId,
      action: action
    };

  } catch (error) {
    logger.error("DisputeAgent Failed:", error.message);
    throw new Error(`Dispute Error: ${error.message}`);
  }
};

module.exports = { execute };
