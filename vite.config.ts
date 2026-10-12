import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { readSharedConfig } from './src/app/shared/config.ts';

export default defineConfig(({ mode }) => {
  // Fail before emitting a bundle if a secret was accidentally configured as
  // the public key, or shared configuration is incomplete.
  readSharedConfig({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env });
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts'],
      css: false,
      exclude: ['e2e/**', 'node_modules/**'],
    },
  };
});
