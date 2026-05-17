/**
 * Agent 4: Pricing Agent
 * Generates a dynamic quote based on base rate, distance, urgency, and complexity.
 */
const logger = require("../utils/logger");

const execute = async (topProvider, parsedIntent) => {
  logger.agent("PricingAgent", "Generating quote breakdown", { provider: topProvider.name });

  try {
    // 1. Extract Base Rate from Provider "Rs. 1000-3000"
    let baseRate = 1500; // default
    if (topProvider.price_range) {
      const match = topProvider.price_range.match(/(\d+)-(\d+)/);
      if (match) {
        // Use the lower end as the base rate
        baseRate = parseInt(match[1]);
      }
    }

    // 2. Distance Surcharge (Rs. 50 per km)
    const distanceKm = topProvider.distance_km || 0;
    const distanceSurcharge = Math.round(distanceKm * 50);

    // 3. Urgency Multiplier
    let urgencyMultiplier = 1.0;
    if (parsedIntent.urgency === "high") urgencyMultiplier = 1.2;
    if (parsedIntent.urgency === "emergency") urgencyMultiplier = 1.5;

    // 4. Complexity Cost
    let complexityCost = 0;
    if (parsedIntent.complexity === "intermediate") complexityCost = 500;
    if (parsedIntent.complexity === "complex") complexityCost = 1500;

     // 5. Loyalty Discount (Simulated random discount for hackathon)
    const loyaltyDiscount = 200;

    // 6. Proactive Weather Discount (15% off for weather preventive tuning)
    let weatherDiscount = 0;
    const isProactive = parsedIntent.complexity === "proactive" || 
                        (parsedIntent.service_type && parsedIntent.service_type.toLowerCase().includes("preventive")) ||
                        (parsedIntent.clarification_question && parsedIntent.clarification_question.toLowerCase().includes("preventive"));
    
    // Calculate Final Cost
    const subtotal = (baseRate + distanceSurcharge) * urgencyMultiplier;
    if (isProactive) {
      weatherDiscount = Math.round(subtotal * 0.15);
    }
    const finalCost = Math.round(subtotal + complexityCost - loyaltyDiscount - weatherDiscount);

    const breakdown = {
      base_rate: baseRate,
      distance_surcharge: distanceSurcharge,
      urgency_multiplier: urgencyMultiplier,
      complexity_cost: complexityCost,
      loyalty_discount: loyaltyDiscount,
      weather_preventive_discount: weatherDiscount,
      total_estimated_cost: finalCost
    };

    logger.agent("PricingAgent", `Quote generated: Rs. ${finalCost}`, breakdown);

    return {
      quote_breakdown: breakdown,
      final_cost: finalCost,
      currency: "PKR"
    };

  } catch (error) {
    logger.error("PricingAgent Failed:", error.message);
    throw new Error(`Pricing Error: ${error.message}`);
  }
};

module.exports = { execute };
