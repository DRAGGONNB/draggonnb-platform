import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'

// Where new-lead alerts are sent. Override via env if needed.
const LEAD_ALERT_TO = process.env.LEAD_ALERT_TO_EMAIL || 'info@draggonnb.online'

/**
 * POST /api/leads/capture
 * Public endpoint for lead capture. Rate-limited, honeypot anti-spam.
 */

// Simple in-memory rate limiter (IP-based, 5 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Honeypot check - if this hidden field has a value, it's a bot
    if (body.honeypot) {
      // Silently accept but don't process
      return NextResponse.json({ success: true, leadId: 'captured' })
    }

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Accept both company_name and business_name (normalize to company_name for DB)
    const companyName = body.company_name || body.business_name
    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate business issues first (source-agnostic)
    const businessIssues = Array.isArray(body.business_issues)
      ? body.business_issues.filter(
          (issue: unknown) => typeof issue === 'string' && (issue as string).trim()
        )
      : []

    if (businessIssues.length === 0) {
      return NextResponse.json(
        { error: 'At least one business challenge is required' },
        { status: 400 }
      )
    }

    // Map to actual `leads` table schema: name, company, email, phone, status, custom_fields.
    // Extra fields (website, industry, company_size, source, business_issues, qualification_status)
    // live in the `custom_fields` jsonb column — the table does NOT have those columns.
    const contactName: string | null = body.contact_name?.trim() || null
    const source: string = body.source || 'qualify_form'
    const leadData = {
      name: contactName || body.email.toLowerCase().trim(),
      company: companyName.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone?.trim() || null,
      status: 'new' as const,
      custom_fields: {
        contact_name: contactName,
        website: body.website?.trim() || null,
        industry: body.industry || null,
        company_size: body.company_size || null,
        source,
        business_issues: businessIssues,
        qualification_status: 'pending',
      },
    }

    const supabase = createAdminClient()

    // Check for duplicate leads by email (within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', leadData.email)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)
      .single()

    if (existingLead) {
      // Return success with existing lead ID (don't create duplicate)
      return NextResponse.json({
        success: true,
        leadId: existingLead.id,
        message: 'Lead already captured',
      })
    }

    // Insert lead
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .select('id')
      .single()

    if (insertError || !lead) {
      console.error('Failed to insert lead:', insertError?.message, insertError?.details, insertError?.code)
      return NextResponse.json(
        { error: 'Failed to capture lead' },
        { status: 500 }
      )
    }

    console.log(`Lead captured: ${lead.id} (${leadData.email})`)

    // Trigger N8N lead alert (fire and forget)
    const n8nUrl = process.env.N8N_BASE_URL
    if (n8nUrl) {
      fetch(`${n8nUrl}/webhook/draggonnb-lead-captured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          companyName: leadData.company,
          contactName: leadData.custom_fields.contact_name || '',
          email: leadData.email,
          phone: leadData.phone || '',
          industry: leadData.custom_fields.industry || '',
          tier_interest: body.tier_interest || '',
          challenges: businessIssues.join(', '),
        }),
      }).catch((err) => console.error('N8N lead alert failed:', err))
    }

    // Send direct email notification to the team (fire and forget, independent of N8N)
    sendLeadAlertEmail({
      leadId: lead.id,
      name: contactName || leadData.email,
      company: leadData.company,
      email: leadData.email,
      phone: leadData.phone,
      industry: body.industry || null,
      companySize: body.company_size || null,
      source,
      businessIssues,
      tierInterest: body.tier_interest || null,
    }).catch((err) => console.error('Lead alert email failed:', err))

    // Trigger AI qualification async (fire and forget).
    // Use the incoming request origin so this works regardless of NEXT_PUBLIC_APP_URL.
    const internalBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin ||
      'http://localhost:3000'
    triggerQualificationAsync(lead.id, internalBaseUrl).catch((err) =>
      console.error('Async qualification trigger failed:', err)
    )

    return NextResponse.json({
      success: true,
      leadId: lead.id,
    })
  } catch (error) {
    console.error('Lead capture error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Trigger qualification in the background
 * Calls the internal qualify endpoint
 */
async function triggerQualificationAsync(leadId: string, baseUrl: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/leads/${leadId}/qualify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
      },
    })

    if (!response.ok) {
      console.error(`Qualification trigger failed for lead ${leadId}: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`Qualification trigger error for lead ${leadId}:`, error)
  }
}

/**
 * Send direct email notification to the team when a lead is captured.
 * Runs in parallel with the N8N webhook so notifications don't depend on
 * the N8N workflow being correctly configured.
 */
async function sendLeadAlertEmail(payload: {
  leadId: string
  name: string
  company: string
  email: string
  phone: string | null
  industry: string | null
  companySize: string | null
  source: string
  businessIssues: string[]
  tierInterest: string | null
}): Promise<void> {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
    )

  const row = (label: string, value: string | null) =>
    value
      ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;">${esc(label)}</td><td style="padding:4px 0;color:#111827;font-size:14px;">${esc(value)}</td></tr>`
      : ''

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
      <h2 style="color:#6B1420;margin:0 0 4px 0;font-size:20px;">New lead captured</h2>
      <p style="color:#6B7280;margin:0 0 20px 0;font-size:14px;">Source: <strong>${esc(payload.source)}</strong></p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
        ${row('Name', payload.name)}
        ${row('Company', payload.company)}
        ${row('Email', payload.email)}
        ${row('Phone', payload.phone)}
        ${row('Industry', payload.industry)}
        ${row('Company size', payload.companySize)}
        ${row('Tier interest', payload.tierInterest)}
        ${payload.businessIssues.length ? row('Business issues', payload.businessIssues.join(', ')) : ''}
      </table>
      <p style="color:#6B7280;font-size:12px;margin:0;">Lead ID: ${esc(payload.leadId)}</p>
    </div>
  `

  const text = [
    'New lead captured',
    `Source: ${payload.source}`,
    '',
    `Name: ${payload.name}`,
    `Company: ${payload.company}`,
    `Email: ${payload.email}`,
    payload.phone ? `Phone: ${payload.phone}` : null,
    payload.industry ? `Industry: ${payload.industry}` : null,
    payload.companySize ? `Company size: ${payload.companySize}` : null,
    payload.tierInterest ? `Tier interest: ${payload.tierInterest}` : null,
    payload.businessIssues.length ? `Business issues: ${payload.businessIssues.join(', ')}` : null,
    '',
    `Lead ID: ${payload.leadId}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const subjectCompany = payload.company.length > 40 ? payload.company.slice(0, 40) + '…' : payload.company
  const result = await sendEmail({
    to: LEAD_ALERT_TO,
    subject: `🐉 New DraggonnB lead: ${subjectCompany}`,
    html,
    text,
    fromName: 'DraggonnB Leads',
    replyTo: payload.email,
    tags: ['lead_alert', payload.source],
  })

  if (!result.success) {
    console.error('Lead alert email send failed:', result.error)
  } else {
    console.log(`Lead alert email sent: ${result.messageId} (lead ${payload.leadId})`)
  }
}
