const { useDockerHostForLocalhost, useLocalhostForDockerHost } = require("../apps/worker/dist/urlUtils");

console.log("==================================================");
console.log(" 🧪 Testing URL Mapping Logic for Worker Container");
console.log("==================================================\n");

const incomingPayload = {
  videoId: "test-video-123",
  callbackUrl: "http://localhost:3000/api/v1/videos/transcode-callback",
  s3: {
    endpoint: "http://localhost:9000",
    cdnHost: "http://127.0.0.1:9000/videohost"
  }
};

console.log("1. Incoming payload received by container:");
console.log(JSON.stringify(incomingPayload, null, 2));

const containerInternalPayload = useDockerHostForLocalhost(incomingPayload);
console.log("\n2. Converted payload for worker container internal calls:");
console.log(JSON.stringify(containerInternalPayload, null, 2));

if (
  containerInternalPayload.callbackUrl.includes("host.docker.internal") &&
  containerInternalPayload.s3.endpoint.includes("host.docker.internal") &&
  containerInternalPayload.s3.cdnHost.includes("host.docker.internal")
) {
  console.log("[PASS] Localhost successfully converted to host.docker.internal for container networking");
} else {
  console.error("[FAIL] Localhost conversion failed!");
  process.exit(1);
}

const outgoingResponsePayload = {
  videoId: "test-video-123",
  status: "READY",
  thumbnailUrl: "http://host.docker.internal:9000/videohost/test-video-123/thumbnail.jpg",
  renditions: [
    { storageKey: "http://host.docker.internal:9000/videohost/test-video-123/hls/720p/prog.m3u8" }
  ]
};

console.log("\n3. Internal container result payload:");
console.log(JSON.stringify(outgoingResponsePayload, null, 2));

const responsePayload = useLocalhostForDockerHost(outgoingResponsePayload);
console.log("\n4. Converted response payload sent back to client / callback:");
console.log(JSON.stringify(responsePayload, null, 2));

if (
  responsePayload.thumbnailUrl.includes("localhost") &&
  !responsePayload.thumbnailUrl.includes("host.docker.internal") &&
  responsePayload.renditions[0].storageKey.includes("localhost")
) {
  console.log("[PASS] host.docker.internal successfully converted back to localhost for outgoing responses");
} else {
  console.error("[FAIL] Response conversion back to localhost failed!");
  process.exit(1);
}

console.log("\n✅ ALL URL MAPPING TESTS PASSED SUCCESSFULLY!");
