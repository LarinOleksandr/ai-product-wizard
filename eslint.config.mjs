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
      '.tmp_wizard_head.tsx', // generated temporary file
      'frontend/web/dist/**', // build output
      'frontend/web/tailwind.config.js', // uses require(), excluded in frontend config
      'frontend/web/src/**', // has its own eslint.config.js with different rules
      'ai/orchestrator/**', // uses Node.js globals, separate lint config needed
      'supabase/**', // Deno functions, separate lint config needed
    ],
  },
  eslint.configs.recommended,
  // typescript-eslint recommended rules for TS
  ...tseslint.configs.recommended,
);
