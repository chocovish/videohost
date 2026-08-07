import crypto from "crypto";
import { db } from "@videohost/db";

export function generateApiKey(): { rawKey: string; prefix: string; hashedKey: string } {
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const rawKey = `vk_live_${randomBytes}`;
  const prefix = `vk_live_${randomBytes.substring(0, 4)}`;
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  return { rawKey, prefix, hashedKey };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function verifyApiKey(rawKey: string) {
  if (!rawKey.startsWith("vk_live_")) return null;

  const hashedKey = hashApiKey(rawKey);
  const apiKey = await db.apiKey.findUnique({
    where: { hashedKey },
    include: {
      organization: {
        include: { plan: true },
      },
    },
  });

  if (!apiKey) return null;

  // Touch lastUsedAt asynchronously
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return apiKey;
}
