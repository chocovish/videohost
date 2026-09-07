# Taped / videohost

Turborepo + npm workspaces. Node 20+, npm 10+, Go 1.26+, PostgreSQL, optional Redis, FFmpeg, S3-compatible storage.

## Find the right place first

| Need | Start here |
|---|---|
| Web UI, API, auth, uploads, billing, LiveKit | `apps/web` |
| Node transcoder | `apps/worker/src` |
| Go transcoder | `apps/worker-go/internal`, entry: `cmd/worker` |
| Schema, Prisma client, migrations | `packages/db` |
| Shared UI helpers/theme utilities | `packages/ui` |
| Shared config / operations scripts | `packages/config`, `scripts` |

Before editing, use `rg --files <area>` and `rg -n "<feature-or-symbol>" <area>` to locate the closest existing implementation. Read only the files directly involved plus their local imports; extend the established pattern instead of introducing a parallel one. Check `package.json` scripts and the nearest README when behavior is unclear.

## Web UI: reuse the system

- shadcn is the design system: inspect `apps/web/components/ui/` first, then `apps/web/components/`; compose existing primitives before adding anything new.
- The site already has a custom theme. Components using shadcn/Tailwind semantic tokens inherit it automatically—use those tokens and `cn()` from `@/lib/utils`; never add hex colors, competing global styles, or a new icon library. Use `lucide-react`.
- Reuse or extract patterns used more than once (forms, dialogs, empty states, pickers). Prefer the existing `confirm-dialog`, `VideoThumbnail`, and `VideoPlayerCore` conventions over copy/paste.
- Next.js App Router: server components by default; add `'use client'` only for browser interaction. Keep data/auth on the server or API routes.
- Keep `apps/web/app/globals.css` the single global CSS entry. Respect `apps/web/components.json` aliases and shadcn configuration.

## Data, security, and media contracts

- Change the database only in `packages/db/prisma/schema.prisma`; use `@videohost/db`, then run `npm run db:generate`. No raw SQL or app-local Prisma clients.
- Respect `VIDEO_STORAGE` (`s3`/`bunny`), `STREAMING_PROTOCOL` (`dash`/`hls`), and `STREAMING_SEGMENTS`; gate/document any storage-specific feature.
- Enforce Auth.js authorization, org isolation, and roles on the server. Never trust client flags or commit secrets, signed URLs, or keys.

## Worker parity is mandatory

The Node and Go workers share `POST /transcode`, `POST /cancel`, `GET /health`, and `GET /stats` (plus optional BullMQ). A transcoding change must be implemented in both workers: payload validation, renditions/scaling, HLS/DASH, thumbnails, storage paths, progress/cancel, concurrency, and worker-token/Docker URL handling. Keep jobs payload-driven, do not upscale, and kill FFmpeg on cancel. Update `apps/worker-go/README.md` for user-visible behavior.

## Work efficiently

- Make small, scoped diffs; avoid unrelated refactors. Reuse existing queues, storage clients, URL helpers, and API/component patterns.
- Use the narrowest relevant check: `turbo run build --filter=@videohost/web`, `npm run lint`, `npm run test:worker`, or `npm run test:worker-go`. Run both worker tests for worker changes.
- Common commands: `npm run dev`, `npm run dev:worker`, `npm run dev:worker-go`, `npm run build`, `npm run db:push`, `npm run db:generate`.
- Update `README.md`, `.env.example`, or worker docs only when the corresponding external behavior/configuration changes.
- If work crosses web, workers, storage, or billing and the target path is not evident, ask which storage mode and surface are intended before implementing.
