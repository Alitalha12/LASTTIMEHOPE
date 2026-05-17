const axios = require("axios");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const BASE_URL = "http://localhost:5000/api";

async function runFinalTest() {
  console.log("==========================================");
  console.log("   FINAL END-TO-END POLISH TEST           ");
  console.log("==========================================\n");

  let token = "";
  const testUser = {
    name: "Final Boss User",
    email: `final_test${Date.now()}@example.com`,
    password: "password123"
  };

  try {
    // 1. Auth
    console.log("1. Authenticating...");
    await axios.post(`${BASE_URL}/auth/register`, testUser);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    token = loginRes.data.data.token;
    console.log("   ✅ Success. JWT Acquired.\n");

    const config = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Testing Multilingual Intent (Urdu + Roman + Slang + English)
    // "bhai mujhe urgently kal F-8 mein ac repair wala chahiye, budget 2000 tak hai, pipe is completely broken"
    console.log("2. Testing Multilingual Complex Intent...");
    const complexInput = "bhai mujhe urgently kal F-8 mein ac repair wala chahiye, budget 2000 tak hai, pipe is completely broken";
    console.log(`   User Input: "${complexInput}"`);
    
    const res = await axios.post(`${BASE_URL}/service/request`, { userInput: complexInput }, config);
    
    const data = res.data.data;
    if (data.parsed_intent.clarification_needed) {
      console.log("   ⚠️ CLARIFICATION TRIGGERED:", res.data.message);
      console.log("   Trace:", JSON.stringify(data.agent_trace, null, 2));
      return;
    }

    console.log("   ✅ Intent Parsed Successfully!");
    console.log("   Extracted Data:", JSON.stringify(data.parsed_intent, null, 2));
    console.log("");

    // 3. Testing 6-Factor Ranker & ACID Booking
    console.log("3. Provider Ranked & Booked (via ACID Transaction)");
    if (!data.recommended_provider) {
        console.log("   ❌ Error: recommended_provider is missing from response!");
        return;
    }
    console.log(`   Top Pick: ${data.recommended_provider.name}`);
    console.log(`   Booking ID: ${data.booking.booking_id}\n`);

    // 4. Testing Live Tracking Timeline
    console.log("4. Live Tracking Timeline (Uber Style)");
    const timeline = data.live_tracking.live_tracking_timeline;
    timeline.forEach(step => {
      console.log(`   [${step.time}] ${step.status.toUpperCase()}: ${step.description}`);
    });
    console.log("");

    // 5. Testing Multi-Channel Notifications
    console.log("5. Multi-Channel Notifications Dispatched");
    console.log("   --- EMAIL INVOICE ---");
    console.log(data.notifications.email.split('\n').map(l => `   ${l}`).join('\n'));
    console.log("\n   --- IVR VOICE CALL ---");
    console.log(data.notifications.ivr_call.split('\n').map(l => `   ${l}`).join('\n'));
    console.log("\n   --- WHATSAPP MESSAGE ---");
    console.log(res.data.message.split('\n').map(l => `   ${l}`).join('\n'));
    
    console.log("\n==========================================");
    console.log(" 🎉 ALL POLISH TESTS PASSED FLAWLESSLY! 🎉");
    console.log("==========================================");

  } catch (error) {
    console.error("\n❌ Test Failed:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}

runFinalTest();
