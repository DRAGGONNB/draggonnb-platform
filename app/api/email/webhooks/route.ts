import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

/**
 * Resend Webhook Events:
 * - email.sent
 * - email.delivered
 * - email.delivery_delayed
 * - email.complained
 * - email.bounced
 * - email.opened (if using Resend's tracking)
 * - email.clicked (if using Resend's tracking)
 */

interface ResendWebhookEvent {
  type: string
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at?: string
    // For bounce events
    bounce?: {
      message: string
      type: string
    }
    // For complaint events
    complaint?: {
      message: string
      complaint_type: string
    }
    // For click events
    click?: {
      link: string
      timestamp: string
    }
  }
}

// Verify webhook signature from Resend
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true // Skip verification if no secret configured

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  // timingSafeEqual throws if buffers have different lengths
  if (sigBuffer.length !== expectedBuffer.length) return false

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
}

/**
 * POST /api/email/webhooks
 * Receives webhook events from Resend
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('svix-signature') || ''
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    // Verify signature if secret is configured
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event: ResendWebhookEvent = JSON.parse(rawBody)

    console.log('Resend webhook received:', {
      type: event.type,
      email_id: event.data.email_id,
    })

    const supabase = createAdminClient()

    // Find email send record by provider message ID
    const { data: sendRecord, error: findError } = await supabase
      .from('email_sends')
      .select('id, status, organization_id, recipient_email, campaign_id, sequence_id')
      .eq('provider_message_id', event.data.email_id)
      .single()

    if (findError || !sendRecord) {
      console.log('Email send record not found for:', event.data.email_id)
      // Return 200 to acknowledge receipt even if we can't find the record
      return NextResponse.json({ received: true })
    }

    const now = new Date().toISOString()

    switch (event.type) {
      case 'email.sent':
        await supabase
          .from('email_sends')
          .update({
            status: 'sent',
            sent_at: now,
          })
          .eq('id', sendRecord.id)
        break

      case 'email.delivered':
        await supabase
          .from('email_sends')
          .update({
            status: 'delivered',
            delivered_at: now,
          })
          .eq('id', sendRecord.id)

        // Update campaign stats if this is a campaign email
        if (sendRecord.campaign_id) {
          await updateCampaignStats(supabase, sendRecord.campaign_id, 'delivered')
        }
        break

      case 'email.bounced':
        await supabase
          .from('email_sends')
          .update({
            status: 'bounced',
            bounced_at: now,
            error_message: event.data.bounce?.message,
            error_code: event.data.bounce?.type,
          })
          .eq('id', sendRecord.id)

        // Update campaign stats
        if (sendRecord.campaign_id) {
          await updateCampaignStats(supabase, sendRecord.campaign_id, 'bounced')
        }

        // Auto-unsubscribe on hard bounce
        if (event.data.bounce?.type === 'hard') {
          await supabase
            .from('email_unsubscribes')
            .upsert({
              organization_id: sendRecord.organization_id,
              email: sendRecord.recipient_email,
              unsubscribe_type: 'all',
              source: 'bounce',
              source_campaign_id: sendRecord.campaign_id,
              source_sequence_id: sendRecord.sequence_id,
            }, {
              onConflict: 'organization_id,email,unsubscribe_type',
            })
        }
        break

      case 'email.complained':
        await supabase
          .from('email_sends')
          .update({
            status: 'complained',
            error_message: event.data.complaint?.message,
          })
          .eq('id', sendRecord.id)

        // Auto-unsubscribe on complaint
        await supabase
          .from('email_unsubscribes')
          .upsert({
            organization_id: sendRecord.organization_id,
            email: sendRecord.recipient_email,
            unsubscribe_type: 'all',
            source: 'complaint',
            source_campaign_id: sendRecord.campaign_id,
          }, {
            onConflict: 'organization_id,email,unsubscribe_type',
          })
        break

      case 'email.opened':
        // Only update if not already tracked by our pixel
        const { data: current } = await supabase
          .from('email_sends')
          .select('opened_at')
          .eq('id', sendRecord.id)
          .single()

        if (!current?.opened_at) {
          await supabase
            .from('email_sends')
            .update({
              status: 'opened',
              opened_at: now,
              open_count: 1,
            })
            .eq('id', sendRecord.id)

          if (sendRecord.campaign_id) {
            await updateCampaignStats(supabase, sendRecord.campaign_id, 'opened')
          }
        }
        break

      case 'email.clicked':
        const link = event.data.click?.link
        if (link) {
          const { data: clickRecord } = await supabase
            .from('email_sends')
            .select('clicked_at, clicked_links')
            .eq('id', sendRecord.id)
            .single()

          const clickedLinks = clickRecord?.clicked_links || []
          if (!clickedLinks.includes(link)) {
            clickedLinks.push(link)
          }

          const updates: Record<string, unknown> = {
            click_count: (clickRecord?.clicked_links?.length || 0) + 1,
            clicked_links: clickedLinks,
          }

          if (!clickRecord?.clicked_at) {
            updates.clicked_at = now
            updates.status = 'clicked'

            if (sendRecord.campaign_id) {
              await updateCampaignStats(supabase, sendRecord.campaign_id, 'clicked')
            }
          }

          await supabase
            .from('email_sends')
            .update(updates)
            .eq('id', sendRecord.id)
        }
        break

      default:
        console.log('Unhandled webhook event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    // Return 200 to prevent Resend from retrying
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}

/**
 * Update campaign stats atomically
 */
async function updateCampaignStats(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
  field: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed'
) {
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('stats')
    .eq('id', campaignId)
    .single()

  if (campaign) {
    const stats = campaign.stats || { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 }
    stats[field] = (stats[field] || 0) + 1

    await supabase
      .from('email_campaigns')
      .update({ stats })
      .eq('id', campaignId)
  }
}

/**
 * GET /api/email/webhooks
 * Webhook endpoint verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'Email webhook endpoint active',
    provider: 'Resend',
  })
}
