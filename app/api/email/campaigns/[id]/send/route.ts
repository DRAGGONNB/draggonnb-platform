import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  sendBatchEmails,
  renderTemplate,
  addEmailTracking,
  generateUnsubscribeUrl,
  generatePreferencesUrl,
  htmlToPlainText,
  isProviderConfigured,
} from '@/lib/email/resend'
import { TIER_EMAIL_LIMITS } from '@/lib/email/types'
import type { SendEmailRequest } from '@/lib/email/types'

/**
 * POST /api/email/campaigns/[id]/send
 * Send a campaign to its recipients
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if email provider is configured
    if (!isProviderConfigured()) {
      return NextResponse.json(
        { error: 'Email provider not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const organizationId = userData.organization_id

    // Get organization tier and limits
    const { data: orgData } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()

    const tier = orgData?.subscription_tier || 'starter'
    const limits = TIER_EMAIL_LIMITS[tier] || TIER_EMAIL_LIMITS.starter

    // Get current usage
    const { data: usageData } = await supabase
      .from('client_usage_metrics')
      .select('emails_sent_monthly')
      .eq('organization_id', organizationId)
      .single()

    const emailsSent = usageData?.emails_sent_monthly || 0

    // Get campaign with template
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*, email_templates(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Cannot send campaign with status: ${campaign.status}` },
        { status: 400 }
      )
    }

    // Get HTML content
    const htmlContent = campaign.template_id
      ? campaign.email_templates?.html_content
      : campaign.html_content

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'No email content found' },
        { status: 400 }
      )
    }

    // Get recipients based on segment rules
    // Query CONTACTS (CRM leads/customers), not USERS (team members)
    // Users table contains team members who should not receive marketing emails
    const { data: recipients, error: recipientsError } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name')
      .eq('organization_id', organizationId)
      .eq('status', 'active')  // Only send to active contacts

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for this campaign' },
        { status: 400 }
      )
    }

    // Check usage limits
    if (emailsSent + recipients.length > limits.emails_per_month) {
      return NextResponse.json(
        {
          error: 'Monthly email limit would be exceeded',
          current: emailsSent,
          limit: limits.emails_per_month,
          requested: recipients.length,
        },
        { status: 429 }
      )
    }

    // Filter out unsubscribed recipients
    const { data: unsubscribes } = await supabase
      .from('email_unsubscribes')
      .select('email')
      .eq('organization_id', organizationId)
      .is('resubscribed_at', null)

    const unsubscribedEmails = new Set(unsubscribes?.map((u) => u.email) || [])
    const activeRecipients = recipients.filter(
      (r) => !unsubscribedEmails.has(r.email)
    )

    if (activeRecipients.length === 0) {
      return NextResponse.json(
        { error: 'All recipients have unsubscribed' },
        { status: 400 }
      )
    }

    // Update campaign status to sending
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
        recipient_count: activeRecipients.length,
      })
      .eq('id', id)

    // Prepare all email requests first
    const emailRequests: Array<{
      request: SendEmailRequest
      sendRecordId: string
      recipientEmail: string
    }> = []

    for (const recipient of activeRecipients) {
      // Prepare variables
      const variables = {
        first_name: recipient.first_name || '',
        last_name: recipient.last_name || '',
        full_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
        email: recipient.email,
        unsubscribe_url: generateUnsubscribeUrl(organizationId, recipient.email),
        preferences_url: generatePreferencesUrl(organizationId, recipient.email),
        current_year: new Date().getFullYear().toString(),
      }

      // Render template
      let renderedHtml = renderTemplate(htmlContent, variables)
      const renderedSubject = renderTemplate(campaign.subject, variables)

      // Create email send record
      const { data: sendRecord } = await supabase
        .from('email_sends')
        .insert({
          organization_id: organizationId,
          campaign_id: id,
          recipient_email: recipient.email,
          recipient_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || null,
          recipient_user_id: null,
          subject: renderedSubject,
          from_email: process.env.EMAIL_FROM || 'noreply@draggonnb.online',
          from_name: process.env.EMAIL_FROM_NAME || 'DraggonnB',
          status: 'queued',
          provider: 'resend',
          metadata: { campaign_id: id },
        })
        .select('id')
        .single()

      if (!sendRecord) continue

      // Add tracking to HTML
      renderedHtml = addEmailTracking(renderedHtml, sendRecord.id)

      emailRequests.push({
        request: {
          to: recipient.email,
          subject: renderedSubject,
          html: renderedHtml,
          text: htmlToPlainText(renderedHtml),
        },
        sendRecordId: sendRecord.id,
        recipientEmail: recipient.email,
      })
    }

    // Send in batches of 100 (Resend limit)
    const BATCH_SIZE = 100
    let successCount = 0

    for (let i = 0; i < emailRequests.length; i += BATCH_SIZE) {
      const batch = emailRequests.slice(i, i + BATCH_SIZE)
      const batchRequests = batch.map(item => item.request)

      const results = await sendBatchEmails(batchRequests)

      // Update send records with results
      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        const item = batch[j]

        if (result.success) {
          await supabase
            .from('email_sends')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              provider_message_id: result.messageId,
            })
            .eq('id', item.sendRecordId)
          successCount++
        } else {
          await supabase
            .from('email_sends')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: result.error,
            })
            .eq('id', item.sendRecordId)
        }
      }
    }

    // Update campaign status and stats
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        completed_at: new Date().toISOString(),
        stats: {
          sent: successCount,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
        },
      })
      .eq('id', id)

    // Update usage metrics
    if (successCount > 0) {
      await supabase
        .from('client_usage_metrics')
        .update({
          emails_sent_monthly: emailsSent + successCount,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_recipients: activeRecipients.length,
        sent: successCount,
        failed: activeRecipients.length - successCount,
        skipped_unsubscribed: recipients.length - activeRecipients.length,
      },
    })
  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 })
  }
}
