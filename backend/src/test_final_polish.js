const http = require('http');

const runTest = (name, input) => {
  return new Promise((resolve) => {
    console.log(`\n--- RUNNING TEST: ${name} ---`);
    const data = JSON.stringify({
      userInput: input,
      userId: "final_demo_user"
    });

    const options = {
      hostname: 'localhost',
      port: 5000, // Directly hitting backend for speed
      path: '/api/service/request',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, res => {
      let responseData = '';
      res.on('data', d => responseData += d);
      res.on('end', () => {
        const result = JSON.parse(responseData);
        console.log(`Result: ${result.success ? "✅ SUCCESS" : "❌ EXPECTED FAILURE"}`);
        console.log(`Message: ${result.message}`);
        if (result.reasoning) console.log(`Reasoning: ${JSON.stringify(result.reasoning)}`);
        resolve();
      });
    });

    req.on('error', e => {
      console.error(`Error: ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
};

const runAll = async () => {
  await runTest("FLOW 1 (Success)", "I need a plumber in Islamabad F-10 at 2 PM");
  await runTest("FLOW 2 (No Provider)", "Mujhe Swat mein AC technician chahiye");
  await runTest("FLOW 6 (Dispute)", "Service bohat late thi, paise wapis karo");
};

runAll();
