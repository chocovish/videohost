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
  const egressUrl = httpUrl;
  const httpEgressUrl = egressUrl.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
  return new EgressClient(httpEgressUrl, apiKey, apiSecret);
}


export interface CreateAccessTokenParams {
  roomName: string;
  identity: string;
  name: string;
  image?: string;
  isHost?: boolean;
  isOrgMember?: boolean;
  canModerate?: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
}

export async function createMeetingAccessToken({
  roomName,
  identity,
  name,
  image,
  isHost = false,
  isOrgMember = false,
  canModerate = false,
  canPublish = true,
  canSubscribe = true,
}: CreateAccessTokenParams): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitCredentials();
  const hasModerationRights = Boolean(isHost || isOrgMember || canModerate);

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({
      name,
      image: image || null,
      role: isHost ? "host" : isOrgMember ? "org_member" : "attendee",
      isHost,
      isOrgMember,
      canModerate: hasModerationRights,
    }),
    ttl: "6h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData: true,
    roomRecord: hasModerationRights,
    roomAdmin: hasModerationRights,
  });

  return await at.toJwt();
}
