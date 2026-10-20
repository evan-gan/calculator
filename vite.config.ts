import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const pagePath = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  // Relative asset paths so the built `dist/` works from any static host or subfolder.
  base: './',
  build: {
    // Two apps sharing the math engine and UI: the calculator at / and the graphing app at /graphing/.
    rollupOptions: {
      input: {
        scientific: pagePath('./index.html'),
        graphing: pagePath('./graphing/index.html'),
      },
    },
  },
});
