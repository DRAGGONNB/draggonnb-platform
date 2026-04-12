/** @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock Supabase admin client
const mockSingle = vi.fn()
const mockInsertSelect = vi.fn()
const mockUpdateEq = vi.fn()

const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: mockInsertSelect.mockResolvedValue({
        data: {
          id: 'test-lead-id',
          phone_number: '+27123456789',
          conversation_state: 'started',
        },
        error: null,
      }),
    }),
  }),
  update: vi.fn().mockReturnValue({
    eq: mockUpdateEq.mockResolvedValue({ error: null }),
  }),
}))

vi.mock('@/lib/ops/config', () => ({
  getOpsClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/whatsapp/client', () => ({
  sendTextMessage: vi.fn().mockResolvedValue({}),
  sendInteractiveMessage: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/agents/lead-qualifier', () => ({
  LeadQualifierAgent: vi.fn().mockImplementation(() => ({
    qualifyLead: vi.fn().mockResolvedValue({
      result: {
        score: { fit: 7, urgency: 8, size: 6, overall: 7.1 },
        recommended_tier: 'growth',
        qualification_status: 'qualified',
        reasoning: 'Good fit for growth tier',
      },
    }),
  })),
}))

vi.mock('@/lib/telegram/bot', () => ({
  sendLeadNotification: vi.fn().mockResolvedValue(undefined),
}))

import { handleIncomingMessage } from '@/lib/whatsapp/intake-flow'
import { sendTextMessage } from '@/lib/whatsapp/client'

describe('WhatsApp Intake Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new lead and sends welcome for new phone number', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

    await handleIncomingMessage('+27123456789', 'Hello', 'msg-123')

    expect(mockFrom).toHaveBeenCalledWith('ops_leads')
    expect(sendTextMessage).toHaveBeenCalledWith(
      '+27123456789',
      expect.stringContaining('Welcome to DraggonnB'),
      undefined
    )
  })

  it('sends already-complete message for completed leads', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'existing-lead',
        phone_number: '+27123456789',
        conversation_state: 'complete',
      },
      error: null,
    })

    await handleIncomingMessage('+27123456789', 'Hello', 'msg-456')

    expect(sendTextMessage).toHaveBeenCalledWith(
      '+27123456789',
      expect.stringContaining('already received'),
      undefined
    )
  })

  it('advances state from started to business_name', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'lead-123',
        phone_number: '+27123456789',
        conversation_state: 'started',
      },
      error: null,
    })

    await handleIncomingMessage('+27123456789', 'My Cool Business', 'msg-789')

    expect(mockFrom).toHaveBeenCalledWith('ops_leads')
  })
})
