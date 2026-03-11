import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Dispatch a signed webhook payload to a single endpoint.
 *
 * Fire-and-forget: logs success/failure but never throws.
 * Payload is signed with HMAC-SHA256 using the registration's secret.
 */
export async function dispatchWebhook(
  url: string,
  secret: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  }

  const payloadString = JSON.stringify(payload)

  const signature = createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-draggonnb-signature': `sha256=${signature}`,
      },
      body: payloadString,
      signal: controller.signal,
    })

    console.log(
      `[Webhooks] ${event} -> ${url.replace(/^(https?:\/\/[^/]+).*/, '$1/...')} status=${response.status}`
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[Webhooks] Failed to dispatch ${event} -> ${url.replace(/^(https?:\/\/[^/]+).*/, '$1/...')}: ${message}`
    )
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Dispatch webhooks to all registered endpoints for an organization.
 *
 * Queries webhook_registrations for active registrations matching the
 * organization and event type, then dispatches to all in parallel using
 * Promise.allSettled (one failure does not block others).
 */
export async function dispatchWebhooksForOrg(
  organizationId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { data: registrations, error } = await supabase
      .from('webhook_registrations')
      .select('url, secret, events')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .contains('events', [event])

    if (error) {
      console.error('[Webhooks] Failed to query registrations:', error.message)
      return
    }

    if (!registrations || registrations.length === 0) {
      return
    }

    await Promise.allSettled(
      registrations.map((reg) =>
        dispatchWebhook(reg.url, reg.secret, event, data)
      )
    )

    console.log(
      `[Webhooks] Dispatched ${event} to ${registrations.length} endpoint(s) for org ${organizationId.slice(0, 8)}...`
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Webhooks] Dispatch error for ${event}:`, message)
  }
}
