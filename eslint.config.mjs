// @ts-check
// ESLint 9 flat config for TS/JS in this monorepo

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // global ignores for generated and config files
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/vite.config.*', // avoid the vite.config.ts parse issue for now
    ],
  },
  eslint.configs.recommended,
  // typescript-eslint recommended rules for TS
  ...tseslint.configs.recommended,
);
