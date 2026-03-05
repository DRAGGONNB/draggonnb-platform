import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['__tests__/unit/**', 'node'],
      ['__tests__/integration/api/**', 'node'],
      ['__tests__/integration/middleware/**', 'node'],
      ['__tests__/integration/dashboard/**', 'node'],
      ['__tests__/components/**', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
