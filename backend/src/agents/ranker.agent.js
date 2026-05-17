/**
 * Agent 4: Ranking Agent
 * Uses Gemini AI to rank providers based on multiple factors
 */
const Groq = require("groq-sdk");
const logger = require("../utils/logger");

let _groq = null;
const getGroq = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

/**
 * Executes the ranking algorithm combining deterministic JS math + AI Reasoning
 */
const execute = async (searchData, parsedIntent) => {
  logger.agent("Ranker", "Ranking matching providers (Math + AI)...");

  try {
    const providers = searchData.providers;
    if (!providers || providers.length === 0) {
      throw new Error("No providers to rank.");
    }

    // STEP 1: Deterministic Math Score
    const scoredProviders = providers.map(provider => {
      const rating = provider.rating || 0;
      const distance = provider.distance || 10;
      const jobs = provider.completedJobs || 0;
      
      let score = (rating * 0.4) + (jobs * 0.1) - (distance * 0.3);
      if (provider.available === false) score -= 5;

      // Trust Badge priority bonus (Feature 12)
      if (provider.badgeTier === "Diamond") score += 1.5;
      else if (provider.badgeTier === "Gold") score += 0.8;

      return {
        ...provider,
        math_score: parseFloat(score.toFixed(2))
      };
    }).sort((a, b) => b.math_score - a.math_score);

    // STEP 2: AI Decision & Reasoning
    const prompt = `
You are an expert ranking agent for a local service marketplace.
User Intent: ${JSON.stringify(parsedIntent)}
Mathematically Ranked Providers: ${JSON.stringify(scoredProviders.slice(0, 3))}

Task: Select the absolute best provider.
Write a human-readable reasoning explaining why it was chosen. 
Make the reasoning sound professional and authoritative (e.g. "Selected because they are the highest-rated professional in G-13 with 150+ completed jobs and immediate availability.").

Return JSON only.
{
  "top_provider": {object},
  "reasoning": "string"
}
`;

    const groq = getGroq();
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    let responseText = chatCompletion.choices[0].message.content.trim();
    
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");
    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
    
    return JSON.parse(jsonString);

  } catch (error) {
    logger.error("Ranker Agent Failed:", error.message);
    return { top_provider: searchData.providers[0] || null, reasoning: "Default math ranking applied due to AI error." };
  }
};

module.exports = { execute };
