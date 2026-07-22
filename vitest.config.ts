import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Use forks pool for proper CJS/ESM interop
    pool: 'forks',
    // Exclude Playwright e2e tests (use npm run test:e2e instead)
    exclude: [
      'e2e/**',
      'node_modules/**',
      '.worktrees/**',
      '**/node_modules/**',
    ],
    coverage: {
      provider: 'v8',
      // Scoped to new quality/domain modules — do not fail whole repo.
      include: [
        'lib/quality/**',
        'lib/templates/format-context.ts',
        'lib/ai/strict-generation.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
