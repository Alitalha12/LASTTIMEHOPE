require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    data.models.forEach(m => {
      if (m.supportedGenerationMethods.includes("generateContent")) {
        console.log(m.name);
      }
    });
  } catch(e) {
    console.error(e.message);
  }
}
listModels();
