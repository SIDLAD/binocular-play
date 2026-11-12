import { defineConfig } from 'vitest/config';
import { seoPages } from './scripts/seo-pages';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2022' },
  server: { port: 5173, strictPort: false },
  plugins: [
    seoPages(async () => {
      const { GAMES } = await import('./src/games/registry');
      return GAMES.map((g) => ({ title: g.title, blurb: g.blurb, group: g.group }));
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
