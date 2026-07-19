import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Pin workspace root so worktree builds don't pick the parent monorepo lockfile.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Standalone output for Docker/VPS (node server.js)
  output: "standalone",
  turbopack: {
    root: rootDir,
  },
  // Allow Playwright / local tooling hosts in dev.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
