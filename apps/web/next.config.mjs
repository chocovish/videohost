import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@videohost/ui", "@videohost/db"],
  allowedDevOrigins: ['192.168.0.100', 'a87f-103-42-174-80.ngrok-free.app', 'host.docker.internal'],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Disable persistent Turbopack filesystem cache to avoid
    // continuous disk writes (.next/dev/cache, .next/cache).
    // Trade-off: slower dev restarts / builds, more CPU+RAM.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
