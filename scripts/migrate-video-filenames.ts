/**
 * Migration Script (TypeScript): Migrate Video originalKey & thumbnailKey to Filenames
 * -----------------------------------------------------------------------------------------
 * Strips redundant organizationId and videoId paths from `originalKey` and `thumbnailKey`
 * in the `Video` table, storing only the actual filename (e.g. "original.mp4", "thumbnail-xxx.webp").
 *
 * Bunny GUIDs (UUIDs) are preserved intact.
 *
 * Usage:
 *   npx tsx scripts/migrate-video-filenames.ts            # Live migration
 *   npx tsx scripts/migrate-video-filenames.ts --dry-run  # Preview changes
 * -----------------------------------------------------------------------------------------
 */import path from "path";
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

/**
 * Extracts the base filename from a key, path, or URL.
 * Returns null if no transformation is needed or if it's already a filename / Bunny GUID.
 */
function extractBaseFileName(
  key?: string | null,
  options: { isOriginalKey?: boolean; storageType?: string } = {}
): string | null {
  if (!key || typeof key !== "string") return null;
  const trimmed = key.trim();
  if (!trimmed) return null;

  // Placeholder keys
  if (trimmed === "temp" || trimmed === "temp-key") {
    return null;
  }

  // Preserve Bunny GUIDs
  if (options.isOriginalKey && (options.storageType === "bunny" || isUUID(trimmed))) {
    return null;
  }

  // If it's a URL, parse path
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("//")
  ) {
    try {
      const url = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);
      const segments = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
      const filename = segments[segments.length - 1];
      return filename && filename !== trimmed ? filename : null;
    } catch {
      const segments = trimmed.split("/").filter(Boolean);
      const filename = segments[segments.length - 1];
      return filename && filename !== trimmed ? filename : null;
    }
  }

  // If it contains slashes, extract the last segment (the filename)
  if (trimmed.includes("/")) {
    const segments = trimmed.replace(/^\/+/, "").split("/").filter(Boolean);
    const filename = segments[segments.length - 1];
    return filename && filename !== trimmed ? filename : null;
  }

  // Already just a filename without path
  return null;
}

async function runMigration(): Promise<void> {
  console.log("===============================================================");
  console.log(" 🚀 Video Key Migration: Storing filenames in originalKey & thumbnailKey");
  console.log(` ⚙️  Mode: ${isDryRun ? "🔍 DRY RUN (Preview only, no DB writes)" : "⚡ LIVE EXECUTION"}`);
  console.log("===============================================================\n");

  let totalVideos = 0;
  let updatedVideos = 0;
  let skippedVideos = 0;

  try {
    console.log("📦 Scanning Video table...");
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        title: true,
        organizationId: true,
        storageType: true,
        originalKey: true,
        thumbnailKey: true,
        bunnyVideoId: true,
      },
    });

    totalVideos = videos.length;
    console.log(`   Found ${totalVideos} video record(s).\n`);

    for (const video of videos) {
      const storageType = (video.storageType || "s3").toLowerCase();
      const updates: { originalKey?: string; thumbnailKey?: string } = {};
      let needsUpdate = false;

      // 1. Check originalKey
      const newOriginalKey = extractBaseFileName(video.originalKey, {
        isOriginalKey: true,
        storageType: storageType,
      });

      if (newOriginalKey && newOriginalKey !== video.originalKey) {
        updates.originalKey = newOriginalKey;
        needsUpdate = true;
      }

      // 2. Check thumbnailKey
      if (video.thumbnailKey) {
        const newThumbnailKey = extractBaseFileName(video.thumbnailKey);
        if (newThumbnailKey && newThumbnailKey !== video.thumbnailKey) {
          updates.thumbnailKey = newThumbnailKey;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        updatedVideos++;
        console.log(`   📹 [Video ${video.id}] "${video.title}" (org: ${video.organizationId}, storage: ${storageType})`);
        if (updates.originalKey) {
          console.log(`      originalKey:  "${video.originalKey}" ➜ "${updates.originalKey}"`);
        }
        if (updates.thumbnailKey) {
          console.log(`      thumbnailKey: "${video.thumbnailKey}" ➜ "${updates.thumbnailKey}"`);
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

    console.log("===============================================================");
    console.log(" 🎉 Migration Completed Summary");
    console.log("===============================================================");
    console.log(` Status:       ${isDryRun ? "DRY RUN COMPLETED (No DB changes written)" : "SUCCESS (Database updated)"}`);
    console.log(` Total Videos: ${totalVideos} (Updated: ${updatedVideos}, Skipped: ${skippedVideos})`);
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
