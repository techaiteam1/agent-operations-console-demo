import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/agent-operations-console-demo/',
  // Vite/esbuild handles the automatic JSX transform. Keeping React Fast Refresh
  // out of the demo lets the strict no-inline-script CSP remain active in dev.
  plugins: [],
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws://127.0.0.1:4173; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'",
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'",
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
