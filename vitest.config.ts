import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Use forks pool for proper CJS/ESM interop
    pool: 'forks',
    // Exclude Playwright e2e tests (use npm run test:e2e instead)
    exclude: ['e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
    // Prefer CommonJS builds to avoid ESM-only module resolution issues
    conditions: ['require', 'node', 'default'],
  },
});
