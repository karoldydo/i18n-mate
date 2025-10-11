import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        enabled: true,
        provider: 'v8',
        reporter: ['text-summary', 'html', 'lcov'],
      },
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      watch: false,
    },
  })
);
