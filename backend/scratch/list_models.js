const axios = require('axios');
require('dotenv').config();

async function list() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  try {
    const response = await axios.get(url);
    console.log("MODELS:", response.data.models.map(m => m.name));
  } catch (error) {
    console.error("FAILED:", error.response?.data || error.message);
  }
}

list();
