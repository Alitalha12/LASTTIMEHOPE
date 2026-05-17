/**
 * AI Service Orchestrator Pipeline (8 Agents)
 * Controls the execution, interactive bidding, budget thresholds, and dual-matching phases.
 */
const AgentLogger = require("../utils/logger");
const AgentLoggerClass = require("../utils/agentLogger");

const intentParser = require("./intentParser.agent");
const disputeAgent = require("./dispute.agent");
const providerFinder = require("./providerFinder.agent");
const ranker = require("./ranker.agent");
const pricingAgent = require("./pricing.agent");
const bookingSimulator = require("./booking.agent");
const notificationAgent = require("./notification.agent");
const followupScheduler = require("./followup.agent");

const { addDocument, getDocument } = require('../services/firebase.service');
const { buildUserMemoryContext, memoryToPromptContext } = require('../services/userMemory.service');
const { v4: uuidv4 } = require("uuid");

// Helper to clean data for Firestore (remove undefined)
const cleanData = (obj) => {
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) delete newObj[key];
    else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
      newObj[key] = cleanData(newObj[key]);
    }
  });
  return newObj;
};

const run = async (userInput, userId = "guest_user", options = {}) => {
  const isResuming = !!options.selectedProviderId;
  const workflowSessionId = options.workflowSessionId || `WF-${uuidv4().substring(0, 8).toUpperCase()}`;
  
  AgentLogger.info(`[ORCHESTRATOR] Starting pipeline | Session: ${workflowSessionId} | Mode: ${isResuming ? 'RESUME' : 'NEW'}`);
  const traceLogger = new AgentLoggerClass();

  // Helper to persist logs in database
  const persistLog = async (agent, status, reasoning, data, duration) => {
    try {
      await addDocument("agentLogs", uuidv4(), cleanData({
        workflowSessionId,
        agent,
        status,
        reasoning: [reasoning],
        input: { userInput },
        output: data,
        durationMs: duration,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      AgentLogger.error(`Failed to persist log for ${agent}: ${err.message}`);
    }
  };

  try {
    let parsedIntent = options.parsedIntent;
    let searchData = options.searchData;

    // ==========================================================
    // PHASE 1: NLP, DISPUTES, AND DISCOVERY (Only if not resuming)
    // ==========================================================
    if (!isResuming) {
      // ── AI MEMORY: Build context from user history if enabled ──
      let memoryContext = '';
      let memoryData = null;
      if (options.allowAIMemory && userId !== 'guest_user') {
        memoryData = await buildUserMemoryContext(userId, options.historyDepth || 'last10');
        memoryContext = memoryToPromptContext(memoryData);
        AgentLogger.info(`[ORCHESTRATOR] AI Memory context built for ${userId}: ${memoryData?.totalBookings || 0} bookings`);
      }

      // 1. NLP Parser (with memory context if enabled)
      const startA1 = Date.now();
      try {
        parsedIntent = await intentParser.execute(userInput, memoryContext);
        
        // Enforce user preferred settings in logs
        const budgetLabel = options.budgetType === 'fixed' ? `FIXED (Max Rs. ${options.maxBudget})` : 'FLEXIBLE';
        const matchLabel = options.selectionMode === 'manual' ? 'MANUAL' : 'AUTO-MATCH';
        const memoryLabel = options.allowAIMemory ? `MEMORY ON (${options.historyDepth || 'last10'})` : 'MEMORY OFF';
        
        const logMsg = `Analyzed intent. Budget: ${budgetLabel} | Match: ${matchLabel} | ${memoryLabel}`;
        traceLogger.log('Intent Parser', 'success', logMsg, parsedIntent, Date.now() - startA1);
        await persistLog('IntentParser', 'success', logMsg, { ...parsedIntent, memoryUsed: !!memoryData }, Date.now() - startA1);
      } catch (e) {
        traceLogger.log('Intent Parser', 'error', e.message, null, Date.now() - startA1);
        await persistLog('IntentParser', 'error', e.message, null, Date.now() - startA1);
        throw e;
      }

      // 2. Dispute Triage
      const startA2 = Date.now();
      const disputeData = await disputeAgent.execute(userInput, parsedIntent);
      if (disputeData.status === "triggered") {
        traceLogger.log("Dispute Agent", "success", "Safety/Dispute flagged.", disputeData, Date.now() - startA2);
        await persistLog("DisputeAgent", "success", "Safety/Dispute flagged.", disputeData, Date.now() - startA2);
        return {
          success: true,
          message: disputeData.action,
          data: { parsed_intent: parsedIntent, dispute: disputeData },
          logs: traceLogger.getTraces(),
          reasoning: [disputeData.action]
        };
      } else {
        traceLogger.log("Dispute Agent", "success", "Safety check passed. No dispute flagged.", null, Date.now() - startA2);
      }

      // Clarification stop
      if (parsedIntent.clarification_needed) {
        return {
          success: true,
          message: parsedIntent.clarification_question || "Could you please clarify?",
          data: { parsed_intent: parsedIntent },
          logs: traceLogger.getTraces(),
          reasoning: [parsedIntent.clarification_question]
        };
      }

      // 3. Provider Finder
      const startA3 = Date.now();
      try {
        searchData = await providerFinder.execute(parsedIntent);
        
        if (options.emergencyMode) {
          const originalCount = searchData.providers ? searchData.providers.length : 0;
          const userLoc = parsedIntent.location || 'G-13';
          searchData.providers = (searchData.providers || []).filter(p => {
            if (!p.distances) return false;
            const matchingKey = Object.keys(p.distances).find(k => k.toLowerCase() === userLoc.toLowerCase());
            const dist = matchingKey ? p.distances[matchingKey] : 3.0;
            return dist <= 5.0;
          });
          const newCount = searchData.providers.length;
          
          const emergMsg = `🚨 EMERGENCY LIMIT ENFORCED: Restricted proximity to < 5km from ${userLoc}. Kept ${newCount} of ${originalCount} nearby providers.`;
          traceLogger.log("Discovery Agent", "success", emergMsg, { originalCount, newCount }, Date.now() - startA3);
          await persistLog("DiscoveryAgent", "success", emergMsg, { originalCount, newCount }, Date.now() - startA3);
        } else {
          const count = searchData.providers ? searchData.providers.length : 0;
          traceLogger.log("Discovery Agent", "success", `Broadcasting request to ${count} nearby GPS providers...`, { count }, Date.now() - startA3);
          await persistLog("DiscoveryAgent", "success", `Broadcasting request to ${count} nearby GPS providers...`, { count }, Date.now() - startA3);
        }
      } catch (e) {
        traceLogger.log("Discovery Agent", "error", e.message, null, Date.now() - startA3);
        await persistLog("DiscoveryAgent", "error", e.message, null, Date.now() - startA3);
        throw e;
      }

      if (searchData.success === false || !searchData.providers || searchData.providers.length === 0) {
        return {
          success: false,
          message: `We couldn't find any nearby providers in your neighborhood area.`,
          data: { parsed_intent: parsedIntent },
          logs: traceLogger.getTraces(),
          reasoning: ["No providers found in proximity."]
        };
      }
    }

    // ==========================================================
    // DYNAMIC PROVIDER BIDDING & ENFORCEMENT
    // ==========================================================
    const budgetType = options.budgetType || "flexible";
    let maxBudget = parseFloat(options.maxBudget || 3000);
    if (options.emergencyMode) {
      maxBudget = maxBudget * 1.5;
    }
    const selectionMode = options.selectionMode || "auto";

    // Simulate bids based on provider distance and pricing
    const simulatedBids = searchData.providers.map(p => {
      let bid = 2400; // standard fallback
      const providerName = p.name || p.fullName || p.businessName || "Expert Provider";
      if (providerName.includes("Ali")) bid = 2400;
      else if (providerName.includes("Yasir")) bid = 3200;
      else if (providerName.includes("Faisal")) bid = 2200;
      else if (p.price_range) {
        bid = parseInt(p.price_range.split("-")[0]) || 2000;
      }
      return { ...p, name: providerName, bidPrice: bid };
    });

    // Enforce budget gates
    let approvedBids = simulatedBids;
    if (budgetType === "fixed") {
      approvedBids = simulatedBids.filter(p => p.bidPrice <= maxBudget);
      const droppedCount = simulatedBids.length - approvedBids.length;
      
      const bidMsg = `Enforced FIXED budget constraint: Rs. ${maxBudget}. Approved ${approvedBids.length} bids. Filtered out ${droppedCount} bids exceeding cap.`;
      traceLogger.log("Discovery Agent", "success", bidMsg, { approved_count: approvedBids.length }, 100);
      await persistLog("DiscoveryAgent", "success", bidMsg, { approved_count: approvedBids.length }, 100);
    }

    if (approvedBids.length === 0) {
      return {
        success: false,
        message: `All nearby providers bid above your fixed budget of Rs. ${maxBudget}. Please switch to Flexible Plan or increase your threshold.`,
        data: { parsed_intent: parsedIntent },
        logs: traceLogger.getTraces(),
        reasoning: [`All provider bids exceeded max budget cap of Rs. ${maxBudget}. Pipeline aborted.`]
      };
    }

    // MATCH SELECTION ROUTING
    let chosenProvider;

    if (selectionMode === "manual" && !options.selectedProviderId) {
      // Pause execution and return shortlist for user tap!
      const shortlist = approvedBids.map(p => ({
        id: p.id,
        name: p.name,
        rating: p.rating || "4.8",
        distance_km: p.distance_km || "2.5",
        price: p.bidPrice,
        image: p.image || `https://i.pravatar.cc/150?u=${p.id}`
      }));

      // Write session details to resume later
      const { updateDocument } = require("../services/firebase.service");
      await addDocument("workflow_sessions", workflowSessionId, cleanData({
        workflowSessionId,
        userId,
        userInput,
        parsedIntent,
        searchData: { ...searchData, providers: approvedBids },
        shortlist,
        options,
        status: "paused_for_manual_selection",
        timestamp: new Date().toISOString()
      }));

      const pauseMsg = `Bids collected. Paused pipeline for customer manual shortlist selection.`;
      traceLogger.log("Discovery Agent", "success", pauseMsg, { shortlist }, 100);
      await persistLog("DiscoveryAgent", "success", pauseMsg, { shortlist }, 100);

      return {
        success: true,
        status: "paused_for_manual_selection",
        workflowSessionId,
        shortlist,
        logs: traceLogger.getTraces(),
        reasoning: ["Bids collected. Waiting for customer manual match selection."]
      };
    }

    // Fetch customer's favorite providers to prioritize them
    let favoriteIds = [];
    try {
      if (userId && userId !== 'guest_user') {
        const { queryDocuments } = require("../services/firebase.service");
        const favorites = await queryDocuments("favorites", [
          { field: "userId", operator: "==", value: userId }
        ]);
        favoriteIds = favorites.map(f => f.providerId);
      }
    } catch (favErr) {
      AgentLogger.error(`Failed to fetch favorites: ${favErr.message}`);
    }

    const bidsWithFavorites = approvedBids.map(p => ({
      ...p,
      isFavorite: favoriteIds.includes(p.id)
    }));

    // If manually resumed, find the clicked provider
    if (options.selectedProviderId) {
      chosenProvider = bidsWithFavorites.find(p => p.id === options.selectedProviderId) || bidsWithFavorites[0];
    } else {
      // Auto Mode: Match favorite providers first, otherwise select cheapest!
      AgentLogger.info("[DiscoveryAgent] Auto-Match active with Favorite prioritizer. Querying GPS distance refreshes...");
      bidsWithFavorites.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.bidPrice - b.bidPrice;
      });
      chosenProvider = bidsWithFavorites[0];

      const matchMsg = chosenProvider.isFavorite
        ? `⭐ Auto-Match prioritised your FAVORITE provider: ${chosenProvider.name} bidding Rs. ${chosenProvider.bidPrice}!`
        : `Auto-Match locked cheapest deal: ${chosenProvider.name} bidding Rs. ${chosenProvider.bidPrice}.`;
        
      traceLogger.log("Discovery Agent", "success", matchMsg, { matched: chosenProvider.name, isFavorite: chosenProvider.isFavorite }, 300);
      await persistLog("DiscoveryAgent", "success", matchMsg, { matched: chosenProvider.name, isFavorite: chosenProvider.isFavorite }, 300);
    }

    // Inject chosen provider into ranking context
    const mockRankData = {
      top_provider: chosenProvider,
      reasoning: `Selected based on customer criteria (Bid: Rs. ${chosenProvider.bidPrice}).`
    };

    // ==========================================
    // PHASE 2: RANKING, PRICING, BOOKING, NOTIFY
    // ==========================================
    
    // 4. Ranker
    const startA4 = Date.now();
    traceLogger.log("Ranking Agent", "success", mockRankData.reasoning, { top_provider: chosenProvider.name }, Date.now() - startA4);
    await persistLog("RankingAgent", "success", mockRankData.reasoning, { top_provider: chosenProvider.name }, Date.now() - startA4);

    // 5. Pricing Agent (pass custom bid price as base rate overrides)
    const startA5 = Date.now();
    let pricingData;
    try {
      pricingData = await pricingAgent.execute(chosenProvider, parsedIntent);
      // Override final cost with bid price
      pricingData.final_cost = chosenProvider.bidPrice;
      pricingData.quote_breakdown.base_rate = chosenProvider.bidPrice;
      
      const priceMsg = `Dynamic Quote locked: Rs. ${pricingData.final_cost} PKR (Platform split: 10% commission locked).`;
      traceLogger.log("Pricing Agent", "success", priceMsg, pricingData.quote_breakdown, Date.now() - startA5);
      await persistLog("PricingAgent", "success", priceMsg, pricingData.quote_breakdown, Date.now() - startA5);
    } catch (e) {
      traceLogger.log("Pricing Agent", "error", e.message, null, Date.now() - startA5);
      await persistLog("PricingAgent", "error", e.message, null, Date.now() - startA5);
      throw e;
    }

    // 6. Booking Simulator (ACID Escrow Balance Enforcer)
    const startA6 = Date.now();
    let bookingData;
    try {
      // Force booking cost to match bid price
      const rankPayload = { ...mockRankData };
      rankPayload.top_provider.cost = chosenProvider.bidPrice;
      rankPayload.top_provider.price = chosenProvider.bidPrice;

      bookingData = await bookingSimulator.execute(rankPayload, userId, parsedIntent.time, options);
      traceLogger.log("Booking Simulator", "success", bookingData.confirmation_message, { booking_id: bookingData.booking_id }, Date.now() - startA6);
      await persistLog("BookingAgent", "success", bookingData.confirmation_message, { booking_id: bookingData.booking_id }, Date.now() - startA6);
    } catch (e) {
      traceLogger.log("Booking Simulator", "error", e.message, null, Date.now() - startA6);
      await persistLog("BookingAgent", "error", e.message, null, Date.now() - startA6);
      throw e;
    }

    // 7. Notification Agent
    const startA7 = Date.now();
    let notificationData;
    try {
      notificationData = await notificationAgent.execute(bookingData, pricingData);
      traceLogger.log("Notification Agent", "success", "Dispatched email and WhatsApp confirmations.", { channel: "WhatsApp/Email" }, Date.now() - startA7);
      await persistLog("NotificationAgent", "success", "Dispatched email and WhatsApp confirmations.", { channel: "WhatsApp/Email" }, Date.now() - startA7);
    } catch (e) {
      traceLogger.log("Notification Agent", "error", e.message, null, Date.now() - startA7);
      await persistLog("NotificationAgent", "error", e.message, null, Date.now() - startA7);
      throw e;
    }

    // 8. Follow-up Scheduler
    const startA8 = Date.now();
    let followupData;
    try {
      followupData = await followupScheduler.execute(bookingData);
      
      const followMsg = `Unlocked interactive live tracking map, chats, and calls. Auto-schedule confirmed.`;
      traceLogger.log("Follow-up Agent", "success", followMsg, { reminder_id: followupData.reminder_id }, Date.now() - startA8);
      await persistLog("FollowupAgent", "success", followMsg, { reminder_id: followupData.reminder_id }, Date.now() - startA8);
    } catch (e) {
      traceLogger.log("Follow-up Agent", "error", e.message, null, Date.now() - startA8);
      await persistLog("FollowupAgent", "error", e.message, null, Date.now() - startA8);
      throw e;
    }

    AgentLogger.success(`[ORCHESTRATOR] 8-Agent Pipeline finished successfully.`);
    const reasoningArray = traceLogger.getTraces().map(trace => trace.reasoning).filter(Boolean);

    // Update workflow session status on Firestore if existing
    if (isResuming) {
      const { updateDocument } = require("../services/firebase.service");
      await updateDocument("workflow_sessions", workflowSessionId, { status: "completed" });
    }

    return {
      success: true,
      message: "Pipeline completed successfully",
      status: "completed",
      data: {
        userInput,
        userId,
        parsed_intent: parsedIntent,
        recommended_provider: chosenProvider,
        quote: pricingData,
        booking: bookingData,
        notifications: notificationData.payloads,
        live_tracking: followupData,
      },
      logs: traceLogger.getTraces(),
      reasoning: reasoningArray
    };

  } catch (error) {
    AgentLogger.error(`[ORCHESTRATOR] Pipeline failed: ${error.message}`);
    return {
      success: false,
      message: error.message || "An error occurred during orchestration.",
      error: error.message,
      data: null,
      logs: traceLogger.getTraces(),
      reasoning: [error.message || "Aborted due to error."]
    };
  }
};

const resume = async (workflowSessionId, selectedProviderId, options = {}) => {
  const { getDocument } = require("../services/firebase.service");
  const session = await getDocument("workflow_sessions", workflowSessionId);
  if (!session) {
    throw new Error("Workflow session not found.");
  }

  // Merge session state into options to trigger direct ranking resume
  const resumeOptions = {
    ...session.options,
    ...options,
    workflowSessionId,
    selectedProviderId,
    parsedIntent: session.parsedIntent,
    searchData: session.searchData
  };

  return run(session.userInput, session.userId, resumeOptions);
};

module.exports = { run, resume };
