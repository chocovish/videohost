import { db } from "../src";

async function main() {
  console.log("Applying Playlist schema migrations...");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Playlist" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "shareAccessMode" "ShareAccessMode" NOT NULL DEFAULT 'PUBLIC',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlaylistItem" (
      "id" TEXT NOT NULL,
      "playlistId" TEXT NOT NULL,
      "videoId" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
    );
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE "SharedEmail" ADD COLUMN IF NOT EXISTS "playlistId" TEXT;
  `);

  await db.$executeRawUnsafe(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Playlist_organizationId_fkey') THEN
        ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlaylistItem_playlistId_fkey') THEN
        ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlaylistItem_videoId_fkey') THEN
        ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SharedEmail_playlistId_fkey') THEN
        ALTER TABLE "SharedEmail" ADD CONSTRAINT "SharedEmail_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Playlist_organizationId_idx" ON "Playlist"("organizationId");
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PlaylistItem_playlistId_videoId_key" ON "PlaylistItem"("playlistId", "videoId");
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PlaylistItem_playlistId_order_idx" ON "PlaylistItem"("playlistId", "order");
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "SharedEmail_playlistId_email_key" ON "SharedEmail"("playlistId", "email");
  `);

  console.log("Migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
