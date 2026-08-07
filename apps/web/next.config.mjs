/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@videohost/ui", "@videohost/db"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
