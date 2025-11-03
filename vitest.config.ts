import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        clean: true,
        enabled: true,
        exclude: [
          'node_modules',
          'dist',
          'eslint.config.js',
          'lint-staged.config.js',
          'prettier.config.js',
          'vite.config.ts',
          'vitest.config.ts',
          'src/env.d.ts',
          'src/shared/types/database.types.ts',
          'src/shared/types/types.ts',
          'src/**/*/index.ts',
        ],
        provider: 'v8',
        reporter: ['text-summary', 'html', 'lcov'],
        // thresholds: {
        //   branches: 90,
        //   functions: 90,
        //   lines: 90,
        //   statements: 90,
        // },
      },
      environment: 'jsdom',
      globals: true,
      include: ['**/*.test.tsx', '**/*.test.ts'],
      setupFiles: ['./src/test/setup.ts'],
      watch: false,
    },
  })
);
