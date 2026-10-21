import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Interaction tests re-render KaTeX on every key press; allow for a loaded machine.
    testTimeout: 20000,
  },
})
