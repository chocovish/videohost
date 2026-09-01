/**
 * Migration Script (TypeScript): Migrate Video & VideoRendition S3 Keys to 'videos/' prefix
 * -----------------------------------------------------------------------------------------
 * Updates existing records in the database where S3 keys were stored under:
 *   - {orgId}/{videoId}/... -> videos/{orgId}/{videoId}/...
 *
 * Usage:
 *   npx tsx scripts/migrate-video-s3-keys.ts            # Live migration
 *   npx tsx scripts/migrate-video-s3-keys.ts --dry-run  # Preview changes
 * -----------------------------------------------------------------------------------------
 */

import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const isDryRun = process.argv.includes("--dry-run");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

function migrateKey(
  key?: string | null,
  options: { isOriginalKey?: boolean; storageType?: string } = {}
): string | null {
  if (!key || typeof key !== "string") return null;
  const trimmed = key.trim();
  if (!trimmed) return null;

  // Already prefixed
  if (trimmed.startsWith("videos/")) {
    return null;
  }

  // URLs or data URIs
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("//")
  ) {
    return null;
  }

  // Temporary placeholder keys
  if (trimmed === "temp" || trimmed === "temp-key") {
    return null;
  }

  // Bunny GUIDs
  if (options.isOriginalKey && options.storageType === "bunny") {
    return null;
  }
  if (options.isOriginalKey && isUUID(trimmed)) {
    return null;
  }

  const cleanKey = trimmed.replace(/^\/+/, "");
  return `videos/${cleanKey}`;
}

async function runMigration(): Promise<void> {
  console.log("===============================================================");
  console.log(" 🚀 S3 Key Migration: Adding 'videos/' prefix to existing data");
  console.log(` ⚙️  Mode: ${isDryRun ? "🔍 DRY RUN (Preview only, no DB writes)" : "⚡ LIVE EXECUTION"}`);
  console.log("===============================================================\n");

  let totalVideos = 0;
  let updatedVideos = 0;
  let skippedVideos = 0;

  let totalRenditions = 0;
  let updatedRenditions = 0;
  let skippedRenditions = 0;

  try {
    console.log("📦 1. Scanning Video table...");
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        organizationId: true,
        storageType: true,
        originalKey: true,
        thumbnailKey: true,
        spriteUrl: true,
        bunnyVideoId: true,
      },
    });

    totalVideos = videos.length;
    console.log(`   Found ${totalVideos} video record(s).\n`);

    for (const video of videos) {
      const storageType = (video.storageType || "s3").toLowerCase();
      const updates: { originalKey?: string; thumbnailKey?: string; spriteUrl?: string } = {};
      let needsUpdate = false;

      const newOriginalKey = migrateKey(video.originalKey, {
        isOriginalKey: true,
        storageType: storageType,
      });
      if (newOriginalKey && newOriginalKey !== video.originalKey) {
        updates.originalKey = newOriginalKey;
        needsUpdate = true;
      }

      if (video.thumbnailKey) {
        const newThumbnailKey = migrateKey(video.thumbnailKey);
        if (newThumbnailKey && newThumbnailKey !== video.thumbnailKey) {
          updates.thumbnailKey = newThumbnailKey;
          needsUpdate = true;
        }
      }

      if (video.spriteUrl) {
        const newSpriteUrl = migrateKey(video.spriteUrl);
        if (newSpriteUrl && newSpriteUrl !== video.spriteUrl) {
          updates.spriteUrl = newSpriteUrl;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        updatedVideos++;
        console.log(`   📹 [Video ${video.id}] "${video.title}" (org: ${video.organizationId})`);
        if (updates.originalKey) {
          console.log(`      originalKey:  "${video.originalKey}" ➜ "${updates.originalKey}"`);
        }
        if (updates.thumbnailKey) {
          console.log(`      thumbnailKey: "${video.thumbnailKey}" ➜ "${updates.thumbnailKey}"`);
        }
        if (updates.spriteUrl) {
          console.log(`      spriteUrl:    "${video.spriteUrl}" ➜ "${updates.spriteUrl}"`);
        }

        if (!isDryRun) {
          await prisma.video.update({
            where: { id: video.id },
            data: updates,
          });
        }
      } else {
        skippedVideos++;
      }
    }

    console.log(`\n   Summary for Videos: ${updatedVideos} updated, ${skippedVideos} skipped.\n`);

    console.log("📦 2. Scanning VideoRendition table...");
    const renditions = await prisma.videoRendition.findMany({
      select: {
        id: true,
        videoId: true,
        resolution: true,
        storageKey: true,
      },
    });

    totalRenditions = renditions.length;
    console.log(`   Found ${totalRenditions} rendition record(s).\n`);

    for (const rend of renditions) {
      const newStorageKey = migrateKey(rend.storageKey);

      if (newStorageKey && newStorageKey !== rend.storageKey) {
        updatedRenditions++;
        console.log(`   🎞️ [Rendition ${rend.id}] (video: ${rend.videoId}, res: ${rend.resolution})`);
        console.log(`      storageKey: "${rend.storageKey}" ➜ "${newStorageKey}"`);

        if (!isDryRun) {
          await prisma.videoRendition.update({
            where: { id: rend.id },
            data: { storageKey: newStorageKey },
          });
        }
      } else {
        skippedRenditions++;
      }
    }

    console.log(`\n   Summary for VideoRenditions: ${updatedRenditions} updated, ${skippedRenditions} skipped.\n`);

    console.log("===============================================================");
    console.log(" 🎉 Migration Completed Summary");
    console.log("===============================================================");
    console.log(` Status:           ${isDryRun ? "DRY RUN COMPLETED (No DB changes written)" : "SUCCESS (Database updated)"}`);
    console.log(` Total Videos:     ${totalVideos} (Updated: ${updatedVideos}, Skipped: ${skippedVideos})`);
    console.log(` Total Renditions: ${totalRenditions} (Updated: ${updatedRenditions}, Skipped: ${skippedRenditions})`);
    console.log("===============================================================\n");
  } catch (error) {
    console.error("❌ Migration failed with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runMigration();

