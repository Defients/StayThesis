import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: '**/shared-workspace.spec.ts',
  outputDir: './test-results-shared',
  tsconfig: './tsconfig.app.json',
  timeout: 60000, workers: 1, retries: 0, reporter: [['list']],
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build -- --outDir dist-shared && npx vite preview --outDir dist-shared --port 4174 --strictPort',
    url: 'http://localhost:4174', reuseExistingServer: false, timeout: 180000,
    env: { VITE_SUPABASE_URL: 'https://staythesis-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_test',
      VITE_WORKSPACE_ID: '11111111-1111-4111-8111-111111111111' },
  },
});
