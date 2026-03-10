import { NextResponse, type NextRequest } from 'next/server'
import { getDualAuth, isDualAuthError } from '@/lib/accommodation/api-helpers'
import { sendDepartmentNotification } from '@/lib/accommodation/telegram/ops-bot'

/**
 * POST /api/accommodation/telegram/stock-alert
 * Checks stock levels and sends Telegram alerts for items below reorder level.
 * Supports dual auth: user session (UI trigger) or service key (N8N cron).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getDualAuth(request)
    if (isDualAuthError(auth)) return auth

    // Query stock items at or below min_stock_level
    const { data: stockItems, error } = await auth.supabase
      .from('accommodation_stock_items')
      .select('id, name, current_stock, min_stock_level, category, unit_of_measure, location')
      .eq('organization_id', auth.organizationId)
      .eq('is_active', true)
      .gt('min_stock_level', 0)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stock items' }, { status: 500 })
    }

    // Filter items below reorder level
    const lowStockItems = (stockItems || []).filter(
      (item) => item.current_stock <= item.min_stock_level
    )

    if (lowStockItems.length === 0) {
      return NextResponse.json({ alertsSent: 0, message: 'No stock alerts needed' })
    }

    // Build alert message
    const criticalItems = lowStockItems.filter((i) => i.current_stock === 0)
    const lowItems = lowStockItems.filter((i) => i.current_stock > 0)

    const lines: string[] = [
      `📦 <b>Stock Level Alert</b>`,
      `⏰ ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      '',
    ]

    if (criticalItems.length > 0) {
      lines.push(`🔴 <b>OUT OF STOCK (${criticalItems.length}):</b>`)
      for (const item of criticalItems) {
        lines.push(`  - ${escapeHtml(item.name)} (${item.category})${item.location ? ` @ ${escapeHtml(item.location)}` : ''}`)
      }
      lines.push('')
    }

    if (lowItems.length > 0) {
      lines.push(`🟡 <b>LOW STOCK (${lowItems.length}):</b>`)
      for (const item of lowItems) {
        lines.push(`  - ${escapeHtml(item.name)}: ${item.current_stock}/${item.min_stock_level} ${item.unit_of_measure || 'units'}`)
      }
    }

    lines.push('', `Total items needing reorder: <b>${lowStockItems.length}</b>`)

    const message = lines.join('\n')

    // Send to management and housekeeping channels
    let alertsSent = 0
    for (const dept of ['management', 'housekeeping']) {
      const result = await sendDepartmentNotification(
        auth.supabase,
        auth.organizationId,
        dept,
        message
      )
      if (result.ok) alertsSent++
    }

    return NextResponse.json({
      alertsSent,
      itemsAlerted: lowStockItems.length,
      critical: criticalItems.length,
      low: lowItems.length,
    })
  } catch (error) {
    console.error('[API] telegram/stock-alert error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
