import { defineConfig } from 'vitest/config';

// Single entry point for the whole suite: `pnpm test` runs every tests/**/*.test.ts file.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
