const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", apiVersion: 'v1' });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash (v1):", result.response.text());
  } catch (e) {
    console.log("Failed with gemini-1.5-flash (v1):", e.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro", apiVersion: 'v1' });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-pro (v1):", result.response.text());
  } catch (e) {
    console.log("Failed with gemini-pro (v1):", e.message);
  }
}

listModels();
