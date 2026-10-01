import { defineConfig } from 'vitest/config';

// Runs the throwaway tests in tests/temp/ (gitignored), printing console output.
// `pnpm test` excludes that folder so scratch checks never affect the real suite.
export default defineConfig({
  test: {
    include: ['tests/temp/**/*.test.ts'],
    environment: 'node',
    silent: false,
    reporters: ['verbose'],
  },
});
