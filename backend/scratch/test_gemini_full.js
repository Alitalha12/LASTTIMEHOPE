const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // There is no direct listModels in the common SDK, but we can try to find it
    console.log("Checking API Key:", process.env.GEMINI_API_KEY.substring(0, 10) + "...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("Result:", result.response.text());
  } catch (e) {
    console.log("Error details:", JSON.stringify(e, null, 2));
    console.log("Error message:", e.message);
  }
}

listModels();
