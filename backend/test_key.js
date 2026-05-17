require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testKey() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello, respond with exactly 'API_KEY_WORKING'");
        console.log("Success:", result.response.text());
    } catch (error) {
        console.error("Failed:", error.message);
    }
}
testKey();
