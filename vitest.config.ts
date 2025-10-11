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
        // TODO: uncomment this when we have more tests :-)
        // thresholds: {
        //   branches: 90,
        //   functions: 90,
        //   lines: 90,
        //   statements: 90,
        // },
      },
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      watch: false,
    },
  })
);
