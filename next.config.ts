import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker/VPS (node server.js)
  output: "standalone",
};

export default nextConfig;
