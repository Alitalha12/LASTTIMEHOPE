/**
 * Agent 1: NLP Intent Parser
 * Uses Google Gemini API to extract structured data from natural language
 */
const Groq = require("groq-sdk");
const logger = require("../utils/logger");

// Lazy Groq client - avoids top-level crash if env not loaded
let _groq = null;
const getGroq = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

/**
 * Parses user input to extract service intent
 * @param {string} userInput - The raw message from the user (Urdu/English/Roman Urdu)
 * @param {string} [memoryContext] - Optional AI memory context string from user history
 * @returns {object} Extracted JSON data
 */
const execute = async (userInput, memoryContext = '') => {
  logger.agent('IntentParser', `Analyzing input: "${userInput}" | Memory: ${memoryContext ? 'ACTIVE' : 'OFF'}`);

  const prompt = `
You are an advanced AI assistant that extracts service booking requests from natural language.
The user might speak in English, Urdu, or Roman Urdu, and may use misspellings (e.g. "plmbr chye").

Task: Extract the following information from the user's input.
1. service_type: MUST map to one of: "ac_technician", "plumber", "electrician", "tutor", "beautician", "carpenter", "cleaner", "mechanic".
2. location: The specific area/sector (e.g., "G-13", "DHA", "Clifton").
3. city: The city name (must be one of: "Islamabad", "Rawalpindi", "Lahore", "Karachi"). If missing, default to "Islamabad" but set confidence lower.
4. time: Requested time (default to "ASAP").
5. urgency: "normal", "high", or "emergency".
6. budget: Extract budget if mentioned (e.g., 2000), else null.
7. complexity: Guess based on task: "basic", "intermediate", "complex". Default: "intermediate".
8. confidence_score: A number from 0 to 100 based on how sure you are.
9. clarification_needed: true if confidence_score < 75 OR if service_type/location/city is completely missing/unclear.
10. clarification_question: If clarification_needed is true, write a polite question in the same language as the input asking for the missing info. Mention that we currently support Islamabad, Rawalpindi, Lahore, and Karachi.
${memoryContext}
Return the result STRICTLY as a valid JSON object without markdown formatting.

Example Input: "plumber needed tmrw morning DHA phase 5"
Output: {"service_type": "plumber", "location": "DHA Phase 5", "time": "tomorrow morning", "urgency": "normal", "budget": null, "complexity": "intermediate", "confidence_score": 95, "clarification_needed": false, "clarification_question": null}

Example Input: "I need someone to fix my thing"
Output: {"service_type": null, "location": null, "time": "ASAP", "urgency": "normal", "budget": null, "complexity": "basic", "confidence_score": 10, "clarification_needed": true, "clarification_question": "Could you please specify what needs fixing and what your location is?"}

User Input: "${userInput}"
`;

  try {
    const groq = getGroq();
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    let responseText = chatCompletion.choices[0].message.content.trim();
    
    // Robust JSON extraction: Find the first { and last }
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("Raw Model Response (No JSON found):", responseText);
      throw new Error("Model did not return a valid JSON object.");
    }
    
    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);

    const parsedData = JSON.parse(jsonString);

    logger.agent("IntentParser", parsedData.clarification_needed ? "Clarification needed" : "Successfully extracted intent", parsedData);
    
    return parsedData;

  } catch (error) {
    logger.error("IntentParser Agent Failed:", error.message);
    // Log the error but throw a cleaner message for the orchestrator
    throw new Error(`Intent parsing failed: ${error.message}`);
  }
};

module.exports = { execute };
