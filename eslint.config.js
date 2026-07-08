import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ^[A-Z] in args: component-typed params (icon: Icon) are used via JSX,
      // which core no-unused-vars can't see without eslint-plugin-react
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_|^[A-Z]' }],
    },
  },
  // Vercel serverless functions — Node ESM
  {
    files: ['api/**/*.js'],
    languageOptions: { globals: globals.node },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Netlify functions — Node CommonJS
  {
    files: ['netlify/functions/**/*.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
