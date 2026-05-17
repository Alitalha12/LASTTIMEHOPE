const axios = require("axios");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
  console.log("--- Starting 8-Agent Pipeline Tests ---");

  let token = "";
  const testUser = {
    name: "Agent Test User",
    email: `agent_test${Date.now()}@example.com`,
    password: "password123"
  };

  try {
    // 1. Register & Login to get token
    await axios.post(`${BASE_URL}/auth/register`, testUser);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    token = loginRes.data.data.token;
    console.log("Auth Success. Token acquired.");

    const config = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Test Normal Booking
    console.log("\n--- TEST 1: Normal Booking ---");
    const res1 = await axios.post(`${BASE_URL}/service/request`, {
      userInput: "I need a plumber at F-8 immediately!"
    }, config);
    console.log("Response:", res1.data.message);
    console.log("Quote Breakdown:", res1.data.data.quote.quote_breakdown);

    // 3. Test Ambiguity Edge Case
    console.log("\n--- TEST 2: Ambiguous Input (Clarification Needed) ---");
    const res2 = await axios.post(`${BASE_URL}/service/request`, {
      userInput: "I need someone to fix my thing"
    }, config);
    console.log("Response:", res2.data.message);
    
    // 4. Test Dispute Edge Case
    console.log("\n--- TEST 3: Dispute Triggered ---");
    const res3 = await axios.post(`${BASE_URL}/service/request`, {
      userInput: "This provider is totally fake and the service was bad, I want a refund"
    }, config);
    console.log("Response:", res3.data.message);

    console.log("\n--- All Tests Finished! ---");

  } catch (error) {
    console.error("Test Failed:", error.response ? error.response.data : error.message);
  }
}

runTests();
