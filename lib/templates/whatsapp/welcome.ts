import type { WhatsAppTemplate } from '../types'

interface WelcomeData {
  clientName: string
  tierName: string
  dashboardUrl: string
  supportUrl: string
}

export function welcomeWhatsApp(data: WelcomeData): WhatsAppTemplate {
  return {
    body: `Hi ${data.clientName}! Welcome to DraggonnB OS. Your ${data.tierName} account is ready.

Quick links:
- Dashboard: ${data.dashboardUrl}
- Support: ${data.supportUrl}

Reply HELP for assistance.`,
    buttons: [
      {
        type: 'url',
        text: 'Open Dashboard',
        url: data.dashboardUrl,
      },
      {
        type: 'quick_reply',
        text: 'HELP',
      },
    ],
  }
}
