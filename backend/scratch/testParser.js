require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const parser = require("../src/agents/intentParser.agent");
const logger = require("../src/utils/logger");

const testInputs = [
  "Mujhe kal subah G-13 mein AC technician chahiye", // Roman Urdu
  "I need a plumber at F-8 immediately, pipe is bursting!", // English
  "مجھے بلیو ایریا میں بیوٹیشن چاہیے آج شام کو" // Urdu (Blue Area beautician this evening)
];

async function runTests() {
  for (const input of testInputs) {
    console.log("--------------------------------------------------");
    console.log(`TEST INPUT: ${input}`);
    try {
      const result = await parser.execute(input);
      console.log("PARSED OUTPUT:");
      console.log(result);
    } catch (e) {
      console.error("ERROR:", e.message);
    }
  }
}

runTests();
