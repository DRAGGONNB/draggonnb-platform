import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  renderTemplate,
  addEmailTracking,
  generateUnsubscribeUrl,
  generatePreferencesUrl,
  isValidEmail,
  sanitizeEmail,
  htmlToPlainText,
  isProviderConfigured,
} from '@/lib/email/resend'
import { TIER_EMAIL_LIMITS } from '@/lib/email/types'

/**
 * POST /api/email/send
 * Send a single email or batch of emails
 *
 * Body:
 * - to: string | string[] - Recipient email(s)
 * - subject: string - Email subject
 * - template_id?: string - Template to use (or provide html directly)
 * - html?: string - Direct HTML content
 * - variables?: object - Template variables
 * - from_name?: string - Sender name override
 */
export async function POST(request: NextRequest) {
  try {
    // Check if email provider is configured
    if (!isProviderConfigured()) {
      return NextResponse.json(
        { error: 'Email provider not configured. Set RESEND_API_KEY.' },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      )
    }

    const organizationId = userData.organization_id

    // Get organization details for limits and tier
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      )
    }

    const tier = orgData.subscription_tier || 'starter'
    const limits = TIER_EMAIL_LIMITS[tier] || TIER_EMAIL_LIMITS.starter

    // Check usage limits
    const { data: usageData } = await supabase
      .from('client_usage_metrics')
      .select('emails_sent_monthly, emails_limit')
      .eq('organization_id', organizationId)
      .single()

    const emailsSent = usageData?.emails_sent_monthly || 0
    const emailLimit = usageData?.emails_limit || limits.emails_per_month

    // Parse request body
    const body = await request.json()
    const {
      to,
      subject,
      template_id,
      html: directHtml,
      variables = {},
      from_name,
    } = body

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email (to) is required' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    // Normalize recipients
    const recipients = Array.isArray(to) ? to : [to]
    const validRecipients = recipients.filter(email => isValidEmail(email)).map(sanitizeEmail)

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses provided' },
        { status: 400 }
      )
    }

    // Check if we have enough quota
    if (emailsSent + validRecipients.length > emailLimit) {
      return NextResponse.json(
        {
          error: 'Monthly email limit reached',
          current: emailsSent,
          limit: emailLimit,
          requested: validRecipients.length,
        },
        { status: 429 }
      )
    }

    // Check for unsubscribed recipients
    const { data: unsubscribes } = await supabase
      .from('email_unsubscribes')
      .select('email')
      .eq('organization_id', organizationId)
      .in('email', validRecipients)
      .is('resubscribed_at', null)

    const unsubscribedEmails = new Set(unsubscribes?.map(u => u.email) || [])
    const activeRecipients = validRecipients.filter(email => !unsubscribedEmails.has(email))

    if (activeRecipients.length === 0) {
      return NextResponse.json(
        { error: 'All recipients have unsubscribed', skipped: validRecipients },
        { status: 400 }
      )
    }

    // Get HTML content
    let htmlContent: string

    if (template_id) {
      // Load template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('html_content, subject')
        .eq('id', template_id)
        .eq('organization_id', organizationId)
        .single()

      if (templateError || !template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      htmlContent = template.html_content
    } else if (directHtml) {
      htmlContent = directHtml
    } else {
      return NextResponse.json(
        { error: 'Either template_id or html content is required' },
        { status: 400 }
      )
    }

    // Process each recipient
    const results = []

    for (const recipientEmail of activeRecipients) {
      // Add standard variables
      const allVariables = {
        ...variables,
        email: recipientEmail,
        unsubscribe_url: generateUnsubscribeUrl(organizationId, recipientEmail),
        preferences_url: generatePreferencesUrl(organizationId, recipientEmail),
        current_year: new Date().getFullYear().toString(),
      }

      // Render template with variables
      let renderedHtml = renderTemplate(htmlContent, allVariables)
      const renderedSubject = renderTemplate(subject, allVariables)

      // Create email_sends record first to get ID for tracking
      const { data: sendRecord, error: sendError } = await supabase
        .from('email_sends')
        .insert({
          organization_id: organizationId,
          recipient_email: recipientEmail,
          subject: renderedSubject,
          from_email: process.env.EMAIL_FROM || 'noreply@draggonnb.online',
          from_name: from_name || process.env.EMAIL_FROM_NAME || 'DraggonnB',
          status: 'queued',
          provider: 'resend',
          metadata: { variables: allVariables },
        })
        .select('id')
        .single()

      if (sendError || !sendRecord) {
        console.error('Failed to create email send record:', sendError)
        results.push({
          email: recipientEmail,
          success: false,
          error: 'Failed to create send record',
        })
        continue
      }

      // Add tracking to email
      renderedHtml = addEmailTracking(renderedHtml, sendRecord.id)

      // Generate plain text version
      const textContent = htmlToPlainText(renderedHtml)

      // Send email via Resend
      const sendResult = await sendEmail({
        to: recipientEmail,
        subject: renderedSubject,
        html: renderedHtml,
        text: textContent,
        fromName: from_name,
      })

      // Update email_sends record with result
      if (sendResult.success) {
        await supabase
          .from('email_sends')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: sendResult.messageId,
          })
          .eq('id', sendRecord.id)
      } else {
        await supabase
          .from('email_sends')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: sendResult.error,
          })
          .eq('id', sendRecord.id)
      }

      results.push({
        email: recipientEmail,
        success: sendResult.success,
        messageId: sendResult.messageId,
        error: sendResult.error,
      })
    }

    // Update usage metrics
    const successCount = results.filter(r => r.success).length
    if (successCount > 0) {
      await supabase
        .from('client_usage_metrics')
        .update({
          emails_sent_monthly: emailsSent + successCount,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
    }

    // Return results
    const allSuccess = results.every(r => r.success)
    const someSuccess = results.some(r => r.success)

    return NextResponse.json({
      success: someSuccess,
      results,
      summary: {
        total: validRecipients.length,
        sent: successCount,
        failed: results.filter(r => !r.success).length,
        skipped_unsubscribed: validRecipients.length - activeRecipients.length,
      },
    }, { status: allSuccess ? 200 : someSuccess ? 207 : 500 })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
