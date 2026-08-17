import { AccessToken, RoomServiceClient, EgressClient } from "livekit-server-sdk";

export function getLiveKitCredentials() {
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
  const livekitUrl = process.env.LIVEKIT_URL || "ws://127.0.0.1:7880";
  // convert ws/wss to http/https for REST API calls
  const httpUrl = livekitUrl.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");

  return {
    apiKey,
    apiSecret,
    livekitUrl,
    httpUrl,
  };
}

export function getRoomServiceClient() {
  const { httpUrl, apiKey, apiSecret } = getLiveKitCredentials();
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

export function getEgressClient() {
  const { httpUrl, apiKey, apiSecret } = getLiveKitCredentials();
  return new EgressClient(httpUrl, apiKey, apiSecret);
}

export interface CreateAccessTokenParams {
  roomName: string;
  identity: string;
  name: string;
  image?: string;
  isHost?: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
}

export async function createMeetingAccessToken({
  roomName,
  identity,
  name,
  image,
  isHost = false,
  canPublish = true,
  canSubscribe = true,
}: CreateAccessTokenParams): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitCredentials();

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({
      name,
      image: image || null,
      role: isHost ? "host" : "attendee",
      isHost,
    }),
    ttl: "6h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData: true,
    roomRecord: isHost,
    roomAdmin: isHost,
  });

  return await at.toJwt();
}

export function generateMeetingCode(): string {
  // Generate pleasant 3-part code like "tap-k9x-w42"
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `tap-${part1}-${part2}`;
}
