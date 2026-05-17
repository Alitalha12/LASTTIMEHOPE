/**
 * Automated Test Script: AI Dispute Arbitrator & Firebase Integration Verification
 * Run: node testFeatures.js
 */
require("dotenv").config();

const { initializeFirebase, getDb } = require("./src/config/firebase");
const arbitratorAgent = require("./src/agents/arbitrator.agent");
const logger = require("./src/utils/logger");

async function testArbitration() {
  try {
    logger.info("Initializing Test Environment...");
    initializeFirebase();
    const db = getDb();
    
    if (!db) {
      logger.error("Firebase DB initialization failed.");
      process.exit(1);
    }

    logger.info("Retrieving seeded disputed booking (BK-BT22XX) from Firestore...");
    const snapshot = await db.collection("bookings").where("bookingId", "==", "BK-BT22XX").get();
    
    if (snapshot.empty) {
      logger.warn("Seeded disputed booking BK-BT22XX not found. Seeding first...");
      // Mock a booking object directly for the test!
      const mockBooking = {
        bookingId: "BK-BT22XX",
        serviceCategory: "beautician",
        serviceName: "Home Party Makeup Package",
        area: "Bahria Town",
        city: "Islamabad",
        price: 6000,
        disputeReason: "Provider arrived 45 minutes late and makeup quality was not up to premium standards.",
        createdAt: new Date().toISOString()
      };
      
      logger.info("Executing AI Arbitrator Agent on Mock Booking data...");
      const verdict = await arbitratorAgent.execute(mockBooking);
      console.log("\n=================== AI JUDGE VERDICT RESPONSE ===================");
      console.log(JSON.stringify(verdict, null, 2));
      console.log("=================================================================\n");
      logger.success("AI Arbitrator Test Completed Successfully!");
      process.exit(0);
    }

    const bookingDoc = snapshot.docs[0].data();
    logger.success(`Successfully loaded booking: ${bookingDoc.bookingId} from collection bookings!`);
    
    logger.info("Invoking Gemini 1.5 Flash via AI Arbitrator Agent...");
    const verdict = await arbitratorAgent.execute(bookingDoc);
    
    console.log("\n=================== AI JUDGE VERDICT RESPONSE ===================");
    console.log(JSON.stringify(verdict, null, 2));
    console.log("=================================================================\n");
    
    // ---- TEST CHAT TRANSLATION AND VOICE TRANSCRIPTION ----
    logger.info("Executing Voice-to-Orchestration Transcription simulation...");
    const Groq = require("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Voice transcription prompt
    const voicePrompt = `
You are a high-performance Voice-to-Orchestration transcriber for KaamKonnect.
Transcribe natural Urdu speech: "yaar mere ghar ka AC thanda nahi kar raha kisi repairer ko jaldi bhej do"
Return the result STRICTLY as a JSON object: {"transcription": "Optimized Roman Urdu request"}
`;
    const voiceResult = await groq.chat.completions.create({
      messages: [{ role: "user", content: voicePrompt }],
      model: "llama-3.3-70b-versatile"
    });
    console.log("\n=================== VOICE TRANSCRIPTION RESULT ===================");
    console.log(voiceResult.choices[0].message.content.trim());
    console.log("==================================================================\n");

    // Chat translation prompt
    logger.info("Executing Chat Translation simulation (English to Roman Urdu)...");
    const transPrompt = `
You are an advanced AI Real-Time Chat Translator for KaamKonnect.
Translate: "Please bring a new capacitor with you." to Roman Urdu preference.
Return the result STRICTLY as a JSON object: {"translatedText": "Roman Urdu translation"}
`;
    const transResult = await groq.chat.completions.create({
      messages: [{ role: "user", content: transPrompt }],
      model: "llama-3.3-70b-versatile"
    });
    console.log("\n=================== CHAT TRANSLATION RESULT ===================");
    console.log(transResult.choices[0].message.content.trim());
    console.log("===============================================================\n");

    logger.success("AI Arbitrator & Communication Layers Test Completed Successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("Test Failed:", error);
    process.exit(1);
  }
}

testArbitration();
