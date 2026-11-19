import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // design/ = static mockups, api/ = archived M006-V1 backend,
  // test pages are DEV-only playgrounds (router.tsx gates them behind import.meta.env.DEV)
  globalIgnores(['dist', 'dev-dist', 'design', 'api', 'src/app/test.tsx', 'src/app/pages/_test-master-crud.tsx']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // eslint-plugin-react-hooks 5.x exposes its flat config as 'recommended-latest'
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui components export their cva variants next to the component by design
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
