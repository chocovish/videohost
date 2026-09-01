# Taped Monorepo

An enterprise-grade, multi-tenant video hosting, studio screen recording, transcoding, and adaptive HLS streaming platform built with Next.js, Node.js, FFmpeg, Prisma, and Cloud Storage.

---

## 🌟 Features

### 🎥 In-Browser Studio Screen Recorder
- **Canvas Compositing Engine**: Real-time 2D canvas stream compositor merging screen share video, webcam overlay, and audio tracks into a unified WebM/MP4 recording.
- **Webcam Picture-in-Picture Overlay**:
  - **Positioning**: Place camera overlay in any of the 4 screen corners (`Top-Left`, `Top-Right`, `Bottom-Left`, `Bottom-Right`).
  - **Frame Shapes**: Choose between `Circle`, `Squircle`, and `Square` frames with ambient drop shadows and border rings.
  - **Overlay Sizing**: Scalable webcam sizes (`Small`, `Medium`, `Large`).
  - **Device Selection**: Multi-camera input device enumeration and live switching.
- **Audio Mixing**: Simultaneous capture and mixing of system/tab audio and microphone input via `AudioContext`.
- **Custom Start Delay & Countdown**: Configurable delay timer (`Off`, `3s`, `5s`) with animated visual badges.
- **File Size & Bitrate Optimization**:
  - **Compact Mode**: Ultra-compressed (~1.2 Mbps, ~8-10MB/min) for fast sharing.
  - **Balanced Mode**: Optimal quality-to-size balance (~2.2 Mbps, ~16MB/min).
  - **Max Quality Mode**: Crisp 60 FPS high-bitrate recording (~5.0 Mbps).
- **WebM Duration Repair & Metadata**: Client-side metadata patching (`fixWebmDuration`) ensuring seekable duration metadata.
- **Live Controls & Direct Upload**: Pause/Resume, Live Timer, Re-record, Instant Local Download (`.webm`), and seamless presigned cloud upload.

### 🏢 Multi-Tenant Organizations & Access Control
- **Workspace Isolation**: Multi-tenant architecture supporting independent organizations and team workspaces.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions with roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Team Invitations**: Email-based organization invitations with token expiration.
- **Subscription Plans**: Configurable limits (Free, Pro, Enterprise) for video minutes, storage capacity, and maximum video resolutions.

### 🔐 Auth & User Management
- Powered by **NextAuth.js v5 (Auth.js)** supporting Credentials (email/password with bcrypt hashing) and OAuth 2.0 (Google).
- Dual view modes for users: **Creator Mode** (full dashboard management) and **Viewer Mode**.

### ⚡ Direct Cloud Storage & Video Upload Pipeline
- **Direct-to-S3 Uploads**: Bypasses backend server bottlenecks by generating presigned AWS S3 / MinIO / Cloudflare R2 URLs directly from the client.
- **Scalable Transcoding Pipeline**: Asynchronous background video processing powered by `fluent-ffmpeg`.
- **Adaptive Bitrate HLS Streaming**: Automatically transcodes uploaded source videos into HLS master playlists (`.m3u8`) with multiple rendition qualities (`480p`, `720p`, `1080p`, `4K`).
- **Thumbnail & Sprite Extraction**: Automatic poster frame extraction and HLS segment sprite generation for scrubbable timeline previews.

### 📁 Asset Management & Sharing Controls
- **Hierarchical Folders**: Organize videos into nested folder structures.
- **Granular Share Access**: Configurable access modes (`PUBLIC`, `RESTRICTED`, `PRIVATE`) with email whitelist controls (`SharedEmail`).
- **Interactive Player**: Custom HLS video player powered by **Video.js** with resolution switching, playback speed controls, and picture-in-picture.

### 🔑 Developer API & Webhook Infrastructure
- **API Keys**: Provision hashed API key credentials with prefixing (`vk_live_...`) for external API access.
- **Event Webhooks**: Real-time webhook notifications for video lifecycle events (`video.ready`, `video.failed`, `usage.limit_reached`).

### 🐳 Flexible Transcoder Workers
- Dual execution architecture for video processing:
  1. **BullMQ / Redis**: Event-driven queue processing for high throughput.
  2. **Containerized HTTP Service**: Standalone HTTP server (`POST /transcode`) listening on port 8080 (ideal for Docker / Cloud Run deployments).

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Client Layer (apps/web)"]
        Browser["Next.js Web App (React 19)"]
        Recorder["Studio Screen Recorder (Canvas Compositor)"]
        Player["Video.js HLS Player"]
    end

    subgraph API ["Web Application (apps/web)"]
        NextServer["Next.js 16 API Routes & Auth.js"]
    end

    subgraph Storage ["Object Storage"]
        S3["Cloudflare R2 / MinIO / AWS S3"]
    end

    subgraph Database ["Data Store"]
        Postgres[(PostgreSQL + Prisma ORM)]
        Redis[(Redis Cache / BullMQ)]
    end

    subgraph Worker ["Worker Service (apps/worker)"]
        WorkerHTTP["HTTP Transcode Server (:8080)"]
        WorkerQueue["BullMQ Worker Listener"]
        FFmpeg["FFmpeg Engine"]
    end

    Recorder -->|1. Record Screen & Webcam| Browser
    Browser -->|2. Presigned Direct Upload| S3
    Browser -->|3. API Calls & Auth| NextServer
    NextServer -->|Store Metadata| Postgres
    NextServer -->|Enqueue Job| Redis
    NextServer -->|Or POST /transcode| WorkerHTTP
    Redis --> WorkerQueue
    WorkerQueue --> FFmpeg
    WorkerHTTP --> FFmpeg
    FFmpeg -->|Download Source & Upload HLS renditions| S3
    FFmpeg -->|Update Status / Webhooks| Postgres
    Player -->|Stream HLS .m3u8| S3
```

---

## 🛠️ Tech Stack

- **Monorepo & Build Tooling**: [Turborepo](https://turbo.build/), [npm Workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- **Frontend App & Studio (`apps/web`)**: Next.js 16 (App Router), React 19, HTML5 Canvas Compositor API, Web Audio API, Tailwind CSS, Radix UI, Vaul Drawer, Lucide Icons, Video.js
- **Backend & Worker (`apps/worker`)**: Node.js, TypeScript, Express HTTP Server, BullMQ, ioredis, `fluent-ffmpeg`
- **Database & ORM (`packages/db`)**: PostgreSQL, Prisma ORM
- **Object Storage**: S3-compatible storage (AWS S3, Cloudflare R2, or local MinIO)
- **Containerization**: Docker (`Dockerfile.worker`)

---

## 📂 Repository Structure

```
videohost/
├── apps/
│   ├── web/               # Next.js app (Dashboard, Screen Recorder Drawer, Player, API Routes)
│   │   ├── components/
│   │   │   └── ScreenRecordDrawer.tsx # In-browser Studio Screen Recorder UI & drawer
│   │   └── lib/
│   │       ├── recording-compositor.ts # Real-time Canvas & audio stream compositor
│   │       └── video-utils.ts          # Metadata extraction & WebM duration patcher
│   └── worker/            # Video transcoding worker (FFmpeg processing, BullMQ, HTTP API)
├── packages/
│   ├── db/                # Prisma schema, database client, migration & seed scripts
│   ├── ui/                # Shared UI component library
│   └── config/            # Shared TypeScript & lint configurations
├── scripts/               # Helper testing scripts (e.g. test-worker.js)
├── Dockerfile.worker      # Docker production build for transcoder worker
├── turbo.json             # Turborepo task pipeline configuration
├── package.json           # Root workspace package configuration
└── .env.example           # Environment template
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v20+ recommended)
- **npm** (v10+)
- **PostgreSQL** database instance
- **Redis** instance (optional, for BullMQ queue processing)
- **FFmpeg** installed locally (required if running `apps/worker` without Docker)
- **MinIO** or **AWS S3 / Cloudflare R2** bucket

---

### Step 1: Clone & Install Dependencies

```bash
# Install monorepo dependencies
npm install
```

---

### Step 2: Environment Setup

Copy the environment template file to `.env` in the root directory:

```bash
cp .env.example .env
```

Update `.env` with your local or cloud service credentials:

```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:passpass@localhost:5432/videohost?schema=public"

# Auth.js / NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
AUTH_URL="http://localhost:3000"

# Cloud Storage (S3 / MinIO / Cloudflare R2)
R2_ENDPOINT="http://localhost:9000"
R2_ACCESS_KEY_ID="minioadmin"
R2_SECRET_ACCESS_KEY="passpass"
R2_BUCKET_NAME="videohost"

# Job Queue Redis Connection (optional)
REDIS_CONNECTION_URL="redis://127.0.0.1:6379"

# Worker Settings
WORKER_CONCURRENCY="2"
WORKER_MAX_CONCURRENT_JOBS="2"
RENDITION_RESOLUTIONS="480,720,1080,2160"
PORT="8080"
```

---

### Step 3: Database Setup

```bash
# Push schema to database
npm run db:push

# Generate Prisma Client
npm run db:generate

# Seed initial seed data (optional)
npm run db:seed
```

---

### Step 4: Running the Applications

You can start services individually or concurrently using Turborepo.

#### Run Next.js Web App Only
```bash
npm run dev
# Web dashboard & screen recorder available at http://localhost:3000
```

#### Run Transcoder Worker Only
```bash
npm run dev:worker
# Worker HTTP server listening at http://localhost:8080
```

#### Run All Workspace Services Concurrently
```bash
npm run dev:all
```

---

## 🐳 Docker Deployment (Worker Service)

The transcoder worker can be containerized using `Dockerfile.worker`, which bundles Node.js, FFmpeg, and OpenSSL into a lightweight runtime image.

### Building the Docker Image
```bash
docker build -f Dockerfile.worker -t videohost-worker .
```

### Running the Container
```bash
docker run -d \
  -p 8080:8080 \
  --env-file .env \
  --name videohost-worker \
  videohost-worker
```

---

## 🧪 Testing the Worker

You can verify the transcoding worker using the provided test script:

```bash
npm run test:worker
```

This triggers `scripts/test-worker.js`, which sends a sample transcoding payload to the worker's HTTP `/transcode` endpoint.

---

## 📜 Available NPM Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js web application (`@videohost/web`) in dev mode |
| `npm run dev:worker` | Starts the worker application (`@videohost/worker`) in dev mode |
| `npm run dev:all` | Runs dev servers for all workspaces in parallel via Turbo |
| `npm run build` | Builds all packages and applications for production |
| `npm run build:web` | Builds only the Next.js web app |
| `npm run build:worker` | Builds only the transcoder worker |
| `npm run start:web` | Starts the production web application server |
| `npm run start:worker` | Starts the production worker application |
| `npm run db:push` | Pushes Prisma schema changes directly to PostgreSQL |
| `npm run db:generate` | Generates the Prisma Client |
| `npm run db:seed` | Seeds the database with default data |
| `npm run lint` | Runs linters across all workspace projects |
| `npm run test:worker` | Executes the worker test script |

---

## 📄 License

[MIT](LICENSE) © Taped Team
