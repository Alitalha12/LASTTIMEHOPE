const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
  console.log("--- Starting Enterprise Backend Tests ---");

  let token = "";
  const testUser = {
    name: "Test User",
    email: `test${Date.now()}@example.com`,
    password: "password123"
  };

  try {
    // 1. Test Register
    console.log(`\n1. Registering user: ${testUser.email}`);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log("Register Success! User ID:", regRes.data.data.id);
    
    // 2. Test Login
    console.log("\n2. Logging in...");
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    token = loginRes.data.data.token;
    console.log("Login Success! Token received.");

    // 3. Test Protected Agent Pipeline Route without Token (Should Fail)
    console.log("\n3. Testing Protected Route (No Token)...");
    try {
      await axios.post(`${BASE_URL}/service/request`, {
        userInput: "I need a plumber at F-8"
      });
      console.log("ERROR: Route should be protected!");
    } catch (e) {
      console.log("Expected Error:", e.response.data.error.message);
    }

    // 4. Test Protected Route WITH Token
    console.log("\n4. Testing Protected Route (With Token)...");
    const serviceRes = await axios.post(`${BASE_URL}/service/request`, {
      userInput: "I need a plumber at F-8"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Agent Pipeline Success! Response:");
    console.log(serviceRes.data.message);
    console.log("Booking ID:", serviceRes.data.data.booking.booking_id);

    console.log("\n--- All Enterprise Tests Passed! ---");

  } catch (error) {
    console.error("Test Failed:", error.response ? error.response.data : error.message);
  }
}

runTests();
