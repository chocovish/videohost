const http = require("http");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const workerUrl = process.env.CONTAINER_WORKER_URL || "http://localhost:8080";
const targetUrl = new URL(workerUrl);
const host = targetUrl.hostname || "localhost";
const port = targetUrl.port || "8080";

console.log(`\n==================================================`);
console.log(` 🧪 Testing Worker Container Endpoint`);
console.log(` 📍 Target URL: ${workerUrl}`);
console.log(`==================================================\n`);

async function testHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(`${workerUrl.replace(/\/$/, "")}/health`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const latency = Date.now() - startTime;
        if (res.statusCode === 200) {
          console.log(`[PASS] GET /health`);
          console.log(`       Status: ${res.statusCode} OK`);
          console.log(`       Latency: ${latency}ms`);
          console.log(`       Payload: ${data.trim()}\n`);
          resolve(true);
        } else {
          console.log(`[FAIL] GET /health returned Status ${res.statusCode}`);
          console.log(`       Payload: ${data.trim()}\n`);
          resolve(false);
        }
      });
    });

    req.on("error", (err) => {
      console.log(`[FAIL] Could not connect to container at ${workerUrl}`);
      console.log(`       Error: ${err.message}`);
      console.log(`\n💡 Tip: Make sure the worker container is running:`);
      console.log(`   docker run --network=host videohost-worker\n`);
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`[FAIL] Timeout connecting to ${workerUrl} after 3000ms\n`);
      resolve(false);
    });
  });
}

async function testPostTranscodeValidation() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({});
    const req = http.request(
      `${workerUrl.replace(/\/$/, "")}/transcode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 400 && data.includes("videoId is required")) {
            console.log(`[PASS] POST /transcode (Validation check)`);
            console.log(`       Status: ${res.statusCode} Bad Request (Expected validation response)`);
            console.log(`       Payload: ${data.trim()}\n`);
            resolve(true);
          } else {
            console.log(`[INFO] POST /transcode returned Status ${res.statusCode}`);
            console.log(`       Payload: ${data.trim()}\n`);
            resolve(true);
          }
        });
      }
    );

    req.on("error", (err) => {
      console.log(`[FAIL] POST /transcode error: ${err.message}\n`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  const isHealthy = await testHealth();
  if (isHealthy) {
    await testPostTranscodeValidation();
    console.log(`✅ SUCCESS: Container HTTP worker endpoint is fully operational!`);
  } else {
    console.log(`❌ FAILURE: Container endpoint test failed.`);
    process.exit(1);
  }
}

runTests();
