# AGENTS.md — Taped / videohost Monorepo

> Lightweight operating guide for AI agents and human contributors.
> Monorepo: Turborepo + npm workspaces. Node 20+, npm 10+, Go 1.26+, PostgreSQL, Redis (optional), FFmpeg, S3-compatible storage.

## 1. App Finder — where to work

| Path | What it is | Stack / entry point |
|---|---|---|
| `apps/web` | **Main Next.js app.** Dashboard, Studio Screen Recorder, HLS/DASH player, all API routes (`app/api/**`), Auth.js, uploads, billing, LiveKit meetings. | Next.js 16 App Router, React 19, `npm run dev --prefix apps/web` → `:3000` |
| `apps/worker` | **Transcoder worker (Node).** Reference implementation. | Node + TS + Express + BullMQ + fluent-ffmpeg, `src/index.ts`, `npm run dev:worker` → `:8080` |
| `apps/worker-go` | **Transcoder worker (Go).** High-performance port. Must stay in parity with Node worker. | Go, `cmd/worker`, `npm run dev:worker-go` → `:8080` |
| `packages/db` | **Single source of truth for data.** Prisma schema, client, seeds, migrations. | `prisma/`, `src/index.ts`, package `@videohost/db` |
| `packages/ui` | **Shared headless UI helpers** (`utils`, themes). | Package `@videohost/ui` |
| `packages/config` | Shared TS / lint configs. Extend these, do not duplicate. | — |
| `scripts/` | Ops helpers (`test-worker.js`, `migrate-video-s3-keys.js`). | Run via root `npm run test:worker`, `db:migrate-keys` |

Docker: `Dockerfile.worker` (Node), `Dockerfile.worker-go` (Go). LiveKit: `docker-compose.livekit.yml`, `livekit.yaml`, `egress.yaml`.

## 2. Critical rule — worker parity

All transcoder workers expose the **same stateless HTTP contract**: `POST /transcode`, `POST /cancel`, `GET /health`, `GET /stats`, plus BullMQ queue mode when `REDIS_URL` is set.

> **If you add or change a transcoding feature in ANY worker (`apps/worker`, `apps/worker-go`), you MUST port the same behavior to the other worker in the same change.** This includes: payload fields, rendition ladder logic, DAR/scaling rules, no-upscale rule, DASH+HLS packaging, WebP thumbnails, S3/R2 upload paths, progress reporting, cancellation semantics, concurrency limits, auth (`WORKER_SECRET_TOKEN`), and Docker `localhost` ↔ `host.docker.internal` translation.

Feature checklist before marking a worker task done:

1. Node (`apps/worker/src/*.ts`) updated.
2. Go (`apps/worker-go/internal/**`) updated.
3. `apps/worker-go/README.md` behavior docs updated if user-visible.
4. Verified with `npm run test:worker` and `npm run test:worker-go` where applicable.

Shared worker conventions: payload-driven (no reliance on worker-local env for job specifics), bounded concurrent jobs via `WORKER_MAX_CONCURRENT_JOBS`, kill FFmpeg on cancel, never upscale beyond source, inject native-resolution rung on large gaps.

## 3. Frontend rules — Next.js + shadcn

- **shadcn is the design system.** Config: `apps/web/components.json` (`style: base-nova`, `cssVariables: true`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/hooks`).
- **Reuse first:** before building new UI, check `apps/web/components/ui/` (button, dialog, drawer, dropdown-menu, sheet, tabs, select, table, skeleton, etc.) and `apps/web/components/` (modals, player, recorder, share). Compose from these.
- **Make it reusable:** if a pattern is used twice (modals, pickers, empty states, confirm dialogs, form fields), extract it to `apps/web/components/ui/` or a generic component in `apps/web/components/` with clear props — do not copy-paste per page. Prefer `confirm-dialog.tsx`, `VideoThumbnail`, `VideoPlayerCore` patterns as examples.
- Use Radix primitives + `class-variance-authority` + `clsx`/`tailwind-merge` (`cn()` in `@/lib/utils`). Lucide icons only (`lucide-react`). No new icon libraries.
- Next.js 16 App Router: Server Components by default; add `'use client'` only where interactivity (recorder, player, canvas, audio) requires it. Keep data fetching and auth on the server / API routes.
- Styling: Tailwind v4, CSS variables, `neutral` base. No inline hex palettes; use theme tokens. Keep `app/globals.css` as the single global entry.

## 4. Backend / data rules

- **Prisma (`packages/db`) is the only place for schema changes.** Never raw SQL in apps. Workflow: edit `prisma/schema.prisma` → `npm run db:push` (dev) / migrate (prod) → `npm run db:generate` → use `@videohost/db` client. Never import Prisma directly from `apps/web` via a local copy.
- **Storage abstraction:** respect `VIDEO_STORAGE="s3" | "bunny"`. New video features must work for both paths (presigned S3 + FFmpeg worker vs. Bunny Stream auto-transcode) or explicitly gate and document the limitation.
- **Streaming:** respect `STREAMING_PROTOCOL="dash" | "hls"` and `STREAMING_SEGMENTS`. Don't hardcode `.m3u8` assumptions in shared player logic.
- Auth: Auth.js v5 (Credentials + Google). RBAC roles `OWNER/ADMIN/MEMBER/VIEWER`, org isolation, share modes `PUBLIC/RESTRICTED/PRIVATE`. Enforce on server, never trust client flags.
- Secrets via `.env` (see `.env.example`). Never commit secrets, presigned URLs, or real keys. Payment (Razorpay/Cashfree), Bunny, LiveKit keys stay server-side.

## 5. Commands agents should use

```bash
npm install                 # install all workspaces
npm run dev                 # web only (:3000)
npm run dev:worker          # node worker (:8080)
npm run dev:worker-go       # go worker (:8080)
npm run dev:all             # everything via turbo
npm run build / build:web / build:worker
npm run build:worker-go     # go build -C apps/worker-go -o worker ./cmd/worker
npm run lint                # turbo lint
npm run db:push / db:generate / db:seed
npm run test:worker         # scripts/test-worker.js → POST /transcode
npm run test:worker-go      # go test ./...
```

Prefer Turbo filters (`turbo run build --filter=@videohost/web`) over `cd` into apps. Verify every change with the narrowest relevant build/lint/test, not just typecheck.

## 6. Working agreements

1. **Small, scoped diffs.** Follow existing file patterns in the touched app; don't re-architect across `apps/*` in one change.
2. **No duplication across apps/packages.** Shared logic goes in `packages/*` or `apps/web/lib/`; worker-shared concepts stay mirrored per §2 (ports, not imports, across languages).
3. **Type-safe, strict TS.** No `any` without justification; handle null/undefined; validate worker payloads and API inputs at boundaries.
4. **Don't invent infra.** Reuse BullMQ queues, S3 client wrappers (`s3.ts` / `internal/s3`), progress reporters, and URL utils already present in each worker.
5. **Update docs with behavior changes:** root `README.md` for architecture, `apps/worker-go/README.md` for worker behavior, `.env.example` for new env vars.
6. **Ask when ambiguous:** if scope spans workers + web + billing/storage, confirm target apps and `VIDEO_STORAGE` path before coding.
