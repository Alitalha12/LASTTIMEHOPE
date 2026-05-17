
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { run } = require('../backend/src/agents/orchestrator');
const logger = require('../backend/src/utils/logger');

async function testPipeline() {
  console.log("Starting End-to-End Backend Test...");
  console.log("Using API Key:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");

  const userInput = "Mujhe aik plumber chahiye jo sink fix kr sakay Karachi mein subha 10 bjay";
  const userId = "test_user_123";

  try {
    const result = await run(userInput, userId);
    console.log("\n--- TEST RESULT ---");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log("\n✅ SUCCESS: Pipeline executed perfectly.");
    } else {
      console.log("\n❌ FAILED: Pipeline returned error.");
    }
  } catch (error) {
    console.error("\n💥 CRITICAL ERROR during test:", error);
  }
}

testPipeline();
