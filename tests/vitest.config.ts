import { defineConfig } from 'vitest/config';

// Single entry point for the whole suite: `pnpm test` runs every tests/**/*.test.ts file.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Scratch tests live in tests/temp/ (gitignored) and run with `pnpm test:temp`.
    exclude: ['tests/temp/**', '**/node_modules/**'],
    environment: 'node',
  },
});
