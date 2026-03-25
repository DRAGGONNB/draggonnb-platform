/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"score": 8, "tier": "growth"}' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    })),
  }
})

describe('BaseAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key')
  })

  it('creates a new session when no sessionId provided', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-session-id' },
          error: null,
        }),
      })),
    })
    const updateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }))

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'agent_sessions') {
          return {
            insert: insertMock,
            update: updateMock,
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { tokens_used: 0 },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }),
    } as any)

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    // Create a concrete subclass
    class TestAgent extends BaseAgent {
      constructor() {
        super({
          agentType: 'lead_qualifier',
          systemPrompt: 'You are a test agent.',
        })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    const result = await agent.run({
      input: 'Test input',
      organizationId: 'test-org',
    })

    expect(result.sessionId).toBe('new-session-id')
    expect(result.response).toBeDefined()
    expect(result.tokensUsed).toBeGreaterThan(0)
    expect(result.status).toBe('completed')

    // Verify session was created
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_type: 'test',
        organization_id: 'test-org',
        status: 'active',
      })
    )
  })

  it('resumes existing session with message history', async () => {
    const existingMessages = [
      { role: 'user', content: 'Previous input', timestamp: '2026-01-01T00:00:00Z' },
      { role: 'assistant', content: 'Previous response', timestamp: '2026-01-01T00:01:00Z', tokens: 100 },
    ]

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'agent_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { messages: existingMessages, tokens_used: 100 },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          }
        }
        return {}
      }),
    } as any)

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    class TestAgent extends BaseAgent {
      constructor() {
        super({ agentType: 'lead_qualifier', systemPrompt: 'Test' })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    const result = await agent.run({
      input: 'Follow-up input',
      sessionId: 'existing-session-id',
    })

    expect(result.sessionId).toBe('existing-session-id')
    // Total tokens should include existing + new
    expect(result.tokensUsed).toBe(250) // 100 existing + 150 new
  })

  it('marks session as failed on error', async () => {
    const updateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }))

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'agent_sessions') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'fail-session' },
                  error: null,
                }),
              })),
            })),
            update: updateMock,
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { tokens_used: 0 },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }),
    } as any)

    // Make Anthropic client throw
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: {
        create: vi.fn().mockRejectedValue(new Error('API error')),
      },
    }) as any)

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    class TestAgent extends BaseAgent {
      constructor() {
        super({ agentType: 'lead_qualifier', systemPrompt: 'Test' })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    await expect(agent.run({ input: 'Test' })).rejects.toThrow('API error')

    // Verify session was marked as failed
    expect(updateMock).toHaveBeenCalledWith({ status: 'failed' })
  })

  it('handles context object in input', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'ctx-session' }, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { tokens_used: 0 }, error: null }),
          })),
        })),
      })),
    } as any)

    // Reset Anthropic mock to capture messages
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"result": "ok"}' }],
      usage: { input_tokens: 50, output_tokens: 30 },
    })
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: createMock },
    }) as any)

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    class TestAgent extends BaseAgent {
      constructor() {
        super({ agentType: 'lead_qualifier', systemPrompt: 'Test' })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    await agent.run({
      input: 'Analyze this',
      context: { company: 'Test Corp', size: 50 },
    })

    // Verify context was included in the message
    const messagesArg = createMock.mock.calls[0][0].messages
    const lastMessage = messagesArg[messagesArg.length - 1]
    expect(lastMessage.content).toContain('Context:')
    expect(lastMessage.content).toContain('Test Corp')
  })
})
