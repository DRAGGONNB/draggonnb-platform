import { config } from 'dotenv'
import { beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Load test environment variables
config({ path: '.env.local' })

// Set fallback test env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Mock ResizeObserver (needed by recharts in jsdom)
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
