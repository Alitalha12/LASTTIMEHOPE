const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Test with simplest model name
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Explain AI in 1 sentence.");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
  } catch (error) {
    console.error("FAILED:", error.message);
  }
}

run();
