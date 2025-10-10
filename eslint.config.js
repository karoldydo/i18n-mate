import eslint from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginReact from 'eslint-plugin-react';
import reactCompiler from 'eslint-plugin-react-compiler';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const baseConfig = defineConfig({
  extends: [
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    reactRefresh.configs.vite,
    perfectionist.configs['recommended-natural'],
  ],
  files: ['**/*.{js,jsx,ts,tsx}'],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
  plugins: { 'unused-imports': unusedImports },
  rules: {
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
    'unused-imports/no-unused-imports': 'error',
  },
});

const reactConfig = defineConfig({
  extends: [eslintPluginReact.configs.flat.recommended],
  files: ['**/*.{js,jsx,ts,tsx}'],
  languageOptions: {
    ...eslintPluginReact.configs.flat.recommended.languageOptions,
    globals: {
      document: true,
      window: true,
    },
  },
  plugins: {
    'react-compiler': reactCompiler,
    'react-hooks': eslintPluginReactHooks,
  },
  rules: {
    ...eslintPluginReactHooks.configs.recommended.rules,
    'react-compiler/react-compiler': 'error',
    'react/react-in-jsx-scope': 'off',
  },
  settings: { react: { version: 'detect' } },
});

const jsxA11yConfig = defineConfig({
  extends: [jsxA11y.flatConfigs.recommended],
  files: ['**/*.{js,jsx,ts,tsx}'],
  languageOptions: {
    ...jsxA11y.flatConfigs.recommended.languageOptions,
  },
});

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  baseConfig,
  reactConfig,
  jsxA11yConfig,
  eslintPluginPrettierRecommended,
]);
