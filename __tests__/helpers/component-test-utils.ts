import { vi } from 'vitest'

/**
 * Mock global.fetch with URL-pattern based responses.
 * Pass a map of URL substrings to response data.
 */
export function mockFetch(responses: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url

    for (const [pattern, data] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        return {
          ok: true,
          status: 200,
          json: async () => data,
          text: async () => JSON.stringify(data),
        }
      }
    }

    // Default: return empty success
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    }
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * Mock global.fetch to return error responses for specific URLs.
 */
export function mockFetchError(url: string, status: number, error: string) {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    status,
    json: async () => ({ error }),
    text: async () => JSON.stringify({ error }),
  }))

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
