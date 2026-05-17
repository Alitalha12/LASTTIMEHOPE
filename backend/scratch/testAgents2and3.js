require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { initializeFirebase } = require("../src/config/firebase");
const providerFinder = require("../src/agents/providerFinder.agent");
const ranker = require("../src/agents/ranker.agent");
const logger = require("../src/utils/logger");

async function test() {
  initializeFirebase();

  try {
    // 1. Mock Parsed Intent from Agent 1
    const mockIntent = {
      service_type: "ac_technician",
      location: "G-13",
      time: "tomorrow morning",
      urgency: "normal"
    };

    logger.info("--- Starting Agent 2 (ProviderFinder) ---");
    const searchData = await providerFinder.execute(mockIntent);
    
    logger.info("Search Result Count:", searchData.providers.length);
    
    if (searchData.providers.length > 0) {
      logger.info("--- Starting Agent 3 (Ranker) ---");
      const rankedData = await ranker.execute(searchData);
      
      logger.info("TOP PICK:", rankedData.top_provider.name);
      logger.info("SCORE:", rankedData.top_provider.score);
      logger.info("DISTANCE:", rankedData.top_provider.distance_km);
      logger.info("RATING:", rankedData.top_provider.rating);
      logger.info("REASONING:", rankedData.reasoning);
    }
  } catch(e) {
    logger.error("Test Failed", e.message);
  }
}

test();
