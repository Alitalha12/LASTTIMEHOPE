const axios = require("axios");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const BASE_URL = "http://localhost:5000/api";

async function runFinalFinalTest() {
  console.log("==========================================");
  console.log("   🚀 FINAL HACKATHON SYSTEM TEST 🚀       ");
  console.log("==========================================\n");

  let token = "";
  const testUser = {
    name: "Winner User",
    email: `winner_${Date.now()}@example.com`,
    password: "password123"
  };

  try {
    // 1. Auth: Register
    console.log("1. Registering User...");
    const regRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    token = regRes.data.data.token;
    console.log("   ✅ Registered.");

    // 2. Auth: Get Profile (/me)
    console.log("2. Verifying Profile (/me)...");
    const profileRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`   ✅ Profile Verified: ${profileRes.data.data.name} (${profileRes.data.data.email})`);

    // 3. Orchestrator: Full Request
    console.log("3. Running 8-Agent Orchestrator Pipeline...");
    const res = await axios.post(`${BASE_URL}/service/request`, 
      { userInput: "I need an electrician in F-7 tomorrow" }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log("   ✅ Pipeline Success!");
    console.log(`   Provider: ${res.data.data.recommended_provider.name}`);
    console.log(`   Trace Count: ${res.data.data.agent_trace.length} Agents Logged.`);
    console.log(`   Live Tracking: ${res.data.data.live_tracking.tracking_id} Generated.`);

    console.log("\n==========================================");
    console.log(" 🏆 BACKEND & FRONTEND SYNC COMPLETE! 🏆");
    console.log("==========================================");

  } catch (error) {
    console.error("\n❌ Test Failed:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

runFinalFinalTest();
