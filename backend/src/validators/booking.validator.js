/**
 * Booking Request Validator
 * Joi schema for validating service/booking requests
 */
const Joi = require("joi");

// Main service request schema — user sends a natural language message
const serviceRequestSchema = Joi.object({
  userInput: Joi.string()
    .min(3)
    .max(500)
    .required()
    .messages({
      "string.empty": "Service request message is required",
      "string.min": "Message must be at least 3 characters",
      "string.max": "Message must not exceed 500 characters",
      "any.required": "userInput field is required",
    }),

  userId: Joi.string()
    .default("guest_user")
    .messages({
      "string.empty": "userId cannot be empty",
    }),

  language: Joi.string()
    .valid("en", "ur", "roman_ur")
    .default("auto")
    .messages({
      "any.only": "Language must be one of: en, ur, roman_ur",
    }),

  budgetType: Joi.string().valid("flexible", "fixed").default("flexible"),
  maxBudget: Joi.number().optional(),
  selectionMode: Joi.string().valid("auto", "manual").default("auto"),
  scheduleMode: Joi.string().valid("auto", "manual").default("auto"),
  allowAIMemory: Joi.boolean().default(false),
  historyDepth: Joi.string().valid("last10", "last30days", "last90days", "all").default("last10"),
  emergencyMode: Joi.boolean().default(false),
  redeemCoins: Joi.boolean().default(false),
});

// Booking ID param schema
const bookingIdSchema = Joi.object({
  bookingId: Joi.string().required(),
});

module.exports = { serviceRequestSchema, bookingIdSchema };
