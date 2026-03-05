/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(),
  }
})

describe('LeadQualifierAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
  })

  describe('parseResponse()', () => {
    it('parses valid JSON response', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()

      // Access protected method via type assertion for testing
      const parse = (agent as any).parseResponse.bind(agent)
      const result = parse(JSON.stringify({
        score: { fit: 8, urgency: 7, size: 6, overall: 7.3 },
        recommended_tier: 'growth',
        automatable_processes: ['invoice follow-up', 'lead capture'],
        qualification_status: 'qualified',
        reasoning: 'Good fit for growth tier.',
        suggested_templates: ['invoice_followup', 'lead_autoresponse'],
      }))

      expect(result.score.fit).toBe(8)
      expect(result.score.urgency).toBe(7)
      expect(result.score.size).toBe(6)
      expect(result.recommended_tier).toBe('growth')
      expect(result.automatable_processes).toHaveLength(2)
      expect(result.qualification_status).toBe('qualified')
      expect(result.suggested_templates).toContain('invoice_followup')
    })

    it('strips markdown code fences from response', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()
      const parse = (agent as any).parseResponse.bind(agent)

      const wrapped = '```json\n' + JSON.stringify({
        score: { fit: 5, urgency: 5, size: 5, overall: 5 },
        recommended_tier: 'core',
        automatable_processes: [],
        qualification_status: 'qualified',
        reasoning: 'OK fit.',
      }) + '\n```'

      const result = parse(wrapped)
      expect(result.score.fit).toBe(5)
      expect(result.recommended_tier).toBe('core')
    })

    it('recalculates overall score for consistency', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()
      const parse = (agent as any).parseResponse.bind(agent)

      // Overall = (fit * 0.4) + (urgency * 0.35) + (size * 0.25)
      // = (8 * 0.4) + (6 * 0.35) + (4 * 0.25)
      // = 3.2 + 2.1 + 1.0 = 6.3
      const result = parse(JSON.stringify({
        score: { fit: 8, urgency: 6, size: 4, overall: 999 }, // wrong overall
        recommended_tier: 'growth',
        automatable_processes: [],
        qualification_status: 'qualified',
        reasoning: 'Test',
      }))

      expect(result.score.overall).toBe(6.3) // recalculated
    })

    it('clamps scores to 1-10 range', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()
      const parse = (agent as any).parseResponse.bind(agent)

      const result = parse(JSON.stringify({
        score: { fit: 15, urgency: -3, size: 0, overall: 0 },
        recommended_tier: 'core',
        automatable_processes: [],
        qualification_status: 'qualified',
        reasoning: 'Test',
      }))

      expect(result.score.fit).toBe(10) // clamped to max
      expect(result.score.urgency).toBe(1) // clamped to min
      expect(result.score.size).toBe(1) // clamped to min
    })

    it('sets qualification_status based on recalculated overall', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()
      const parse = (agent as any).parseResponse.bind(agent)

      // Low scores: overall = (2*0.4) + (1*0.35) + (1*0.25) = 0.8+0.35+0.25 = 1.4
      const disqualified = parse(JSON.stringify({
        score: { fit: 2, urgency: 1, size: 1, overall: 1 },
        recommended_tier: 'core',
        automatable_processes: [],
        qualification_status: 'qualified', // Claude says qualified but...
        reasoning: 'Low score',
      }))

      expect(disqualified.qualification_status).toBe('disqualified') // overridden by recalculation

      // High scores: overall = (8*0.4) + (7*0.35) + (6*0.25) = 3.2+2.45+1.5 = 7.15
      const qualified = parse(JSON.stringify({
        score: { fit: 8, urgency: 7, size: 6, overall: 7 },
        recommended_tier: 'growth',
        automatable_processes: ['process1'],
        qualification_status: 'disqualified', // Claude says disqualified but...
        reasoning: 'High score',
      }))

      expect(qualified.qualification_status).toBe('qualified') // overridden
    })

    it('throws on missing required fields', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()
      const parse = (agent as any).parseResponse.bind(agent)

      expect(() => parse(JSON.stringify({
        score: { fit: 5 },
        // missing recommended_tier and qualification_status
      }))).toThrow('Missing required fields')
    })

    it('throws on invalid JSON', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()
      const parse = (agent as any).parseResponse.bind(agent)

      expect(() => parse('This is not JSON')).toThrow()
    })

    it('defaults missing optional arrays to empty', async () => {
      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()
      const parse = (agent as any).parseResponse.bind(agent)

      const result = parse(JSON.stringify({
        score: { fit: 5, urgency: 5, size: 5, overall: 5 },
        recommended_tier: 'core',
        qualification_status: 'qualified',
        reasoning: 'Basic',
        // missing automatable_processes and suggested_templates
      }))

      expect(result.automatable_processes).toEqual([])
      expect(result.suggested_templates).toEqual([])
    })
  })

  describe('qualifyLead()', () => {
    it('formats lead data into structured prompt', async () => {
      const createMock = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          score: { fit: 7, urgency: 6, size: 5, overall: 6.2 },
          recommended_tier: 'growth',
          automatable_processes: ['lead capture'],
          qualification_status: 'qualified',
          reasoning: 'Good fit',
          suggested_templates: ['lead_autoresponse'],
        })}],
        usage: { input_tokens: 200, output_tokens: 100 },
      })

      const Anthropic = (await import('@anthropic-ai/sdk')).default
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: createMock },
      }) as any)

      const { createAdminClient } = await import('@/lib/supabase/admin')
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'session-1' }, error: null }),
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

      const { LeadQualifierAgent } = await import('@/lib/agents/lead-qualifier')
      const agent = new LeadQualifierAgent()

      const result = await agent.qualifyLead({
        id: 'lead-1',
        company_name: 'SA Tourism Co',
        email: 'info@satourism.co.za',
        industry: 'tourism',
        company_size: '11-50',
        business_issues: ['manual booking', 'no follow-up system', 'losing leads'],
      })

      expect(result.sessionId).toBe('session-1')
      expect(result.status).toBe('completed')

      // Verify the prompt included lead details
      const messages = createMock.mock.calls[0][0].messages
      const userMessage = messages.find((m: any) => m.role === 'user')
      expect(userMessage.content).toContain('SA Tourism Co')
      expect(userMessage.content).toContain('tourism')
      expect(userMessage.content).toContain('manual booking')
    })
  })
})
