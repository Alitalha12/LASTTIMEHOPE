const axios = require('axios');
require('dotenv').config();

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: "hi" }] }]
    });
    console.log("SUCCESS:", response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("FAILED:", error.response?.data || error.message);
  }
}

test();
