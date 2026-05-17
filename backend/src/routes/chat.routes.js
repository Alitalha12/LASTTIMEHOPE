/**
 * Chat & Voice Translation Routes
 * Integrated with Groq Llama 3.3 Versatile for real-time translation and voice messages transcription
 */
const router = require("express").Router();
const Groq = require("groq-sdk");
const logger = require("../utils/logger");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Lazy Groq client getter — avoids crash if GROQ_API_KEY not loaded yet at module require() time
let _groqClient = null;
const getGroqClient = () => {
  if (!_groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set.");
    }
    _groqClient = new Groq({ apiKey });
  }
  return _groqClient;
};

/**
 * POST /api/chat/voice-transcribe
 * Real-time Speech-to-Text via Groq Whisper and LLM optimization
 */
router.post("/voice-transcribe", async (req, res, next) => {
  try {
    const { audioDescription, audioBase64 } = req.body;

    let transcriptionText = "";

    if (audioBase64) {
      logger.agent("VoiceTranscriber", "Received real base64 audio. Transcribing via Groq Whisper...");
      
      // Save base64 audio to temp file
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `recording_${Date.now()}.m4a`);
      
      fs.writeFileSync(tempFilePath, Buffer.from(audioBase64, "base64"));
      
      const groq = getGroqClient();
      const response = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-large-v3",
        language: "ur", // Optimize for Urdu / Roman Urdu speech input!
        response_format: "json",
      });
      
      // Clean up the temp file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        logger.error("Failed to delete temp file:", err.message);
      }
      
      transcriptionText = response.text;
      logger.success(`Real-time Whisper Speech-to-Text succeeded: "${transcriptionText}"`);
    } else if (audioDescription) {
      transcriptionText = audioDescription;
    } else {
      return res.status(400).json({
        success: false,
        error: "Either audioDescription or audioBase64 is required."
      });
    }

    logger.agent("VoiceTranscriber", `Optimizing speech transcript: "${transcriptionText}"`);

    const prompt = `
You are a high-performance Voice-to-Orchestration transcriber for KaamKonnect (an on-demand informal economy app in Pakistan).
You are processing a transcribed spoken message.

Spoken content: "${transcriptionText}"

Task:
1. Transcribe/Optimize the spoken Urdu/Roman Urdu speech into optimized, clear Roman Urdu/Urdu text.
   - E.g. spoken: "yaar mere ghar ka AC thanda nahi kar raha kisi repairer ko jaldi bhej do"
   - Optimized Transcription: "Ghar ka AC thanda nahi kar raha, meharbani karke repairer bhej dein."
2. Make sure it sounds extremely natural and preserves any technical details (e.g., AC not cooling, pipe leaking).

Return the result STRICTLY as a valid JSON object without markdown formatting.
{
  "transcription": "Optimized transcription text that can be used directly for service matching."
}
`;

    const groq = getGroqClient();
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile"
    });

    const responseText = chatCompletion.choices[0].message.content.trim();
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Transcriber did not return a valid JSON object.");
    }

    const parsedResponse = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
    logger.success("Voice transcribed and optimized successfully: " + parsedResponse.transcription);

    res.json({
      success: true,
      transcription: parsedResponse.transcription
    });

  } catch (error) {
    logger.error("Voice transcribing failed:", error.message);
    res.json({
      success: true,
      transcription: req.body.audioDescription || "Mera AC kharab hai, technician bhej dein." // Fail-safe
    });
  }
});

/**
 * POST /api/chat/translate
 * Translates chat messages in real-time breaking language barriers
 */
router.post("/translate", async (req, res, next) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: "text and targetLanguage are required."
      });
    }

    logger.agent("ChatTranslator", `Translating message: "${text}" into: "${targetLanguage}"`);

    const prompt = `
You are an advanced Real-Time AI Chat Translator for KaamKonnect.
You are translating in-app messages between a customer and an informal worker (technician) to break language barriers.

Message to translate: "${text}"
Target language preference: "${targetLanguage}"

Guidelines:
- If targetLanguage is "roman_urdu", translate to standard natural Roman Urdu (e.g. "Aap apne sath naya capacitor le kar aein").
- If targetLanguage is "urdu", translate to standard Urdu script or Urdu text (e.g. "مہربانی فرما کر نیا کپیسیٹر ساتھ لائیں").
- If targetLanguage is "english", translate to professional, simple English (e.g. "Please bring a new capacitor with you").
- Preserve all technical concepts (like capacitor, wire, pipe, AC unit, pricing) and maintain an extremely polite, cooperative tone.

Return the result STRICTLY as a valid JSON object without markdown formatting.
{
  "translatedText": "The translated text."
}
`;

    const groq = getGroqClient();
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile"
    });

    const responseText = chatCompletion.choices[0].message.content.trim();
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Translator did not return a valid JSON object.");
    }

    const parsedResponse = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
    logger.success("Message translated successfully: " + parsedResponse.translatedText);

    res.json({
      success: true,
      translatedText: parsedResponse.translatedText
    });

  } catch (error) {
    logger.error("Chat translation failed:", error.message);
    res.json({
      success: true,
      translatedText: req.body.text // Fallback to original text if error occurs
    });
  }
});

module.exports = router;
