import { BRAND, type EmailTemplate } from '../types'
import { wrapInLayout } from './layout'

interface WelcomeData {
  clientName: string
  tierName: string
  dashboardUrl: string
}

export function welcomeEmail(data: WelcomeData): EmailTemplate {
  const content = `
<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:${BRAND.secondaryColor};">
  Welcome to ${BRAND.companyName}, ${data.clientName}!
</h1>
<p style="margin:0 0 16px 0;">
  We are thrilled to have you on board. Your <strong>${data.tierName}</strong> plan is now active, and your platform is ready to go.
</p>
<p style="margin:0 0 8px 0;font-weight:600;color:${BRAND.secondaryColor};">
  Get started in three quick steps:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="padding:12px 16px;background-color:#f9f9fb;border-radius:4px;margin-bottom:8px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:32px;vertical-align:top;">
            <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background-color:${BRAND.primaryColor};color:#ffffff;text-align:center;line-height:24px;font-size:13px;font-weight:600;">1</span>
          </td>
          <td style="padding-left:8px;font-family:${BRAND.fontFamily};font-size:14px;color:${BRAND.secondaryColor};">
            <strong>Set up your CRM</strong> &mdash; Import your existing contacts or start adding leads manually.
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="height:8px;"></td></tr>
  <tr>
    <td style="padding:12px 16px;background-color:#f9f9fb;border-radius:4px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:32px;vertical-align:top;">
            <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background-color:${BRAND.primaryColor};color:#ffffff;text-align:center;line-height:24px;font-size:13px;font-weight:600;">2</span>
          </td>
          <td style="padding-left:8px;font-family:${BRAND.fontFamily};font-size:14px;color:${BRAND.secondaryColor};">
            <strong>Import your contacts</strong> &mdash; Upload a CSV or connect your existing tools.
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="height:8px;"></td></tr>
  <tr>
    <td style="padding:12px 16px;background-color:#f9f9fb;border-radius:4px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:32px;vertical-align:top;">
            <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background-color:${BRAND.primaryColor};color:#ffffff;text-align:center;line-height:24px;font-size:13px;font-weight:600;">3</span>
          </td>
          <td style="padding-left:8px;font-family:${BRAND.fontFamily};font-size:14px;color:${BRAND.secondaryColor};">
            <strong>Send your first campaign</strong> &mdash; Use our templates to launch a professional email campaign in minutes.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="background-color:${BRAND.primaryColor};border-radius:4px;text-align:center;">
      <a href="${data.dashboardUrl}" style="display:inline-block;padding:12px 28px;font-family:${BRAND.fontFamily};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        Go to Your Dashboard
      </a>
    </td>
  </tr>
</table>
<p style="margin:0 0 8px 0;font-size:14px;color:#6b6b78;">
  Need a hand? Reply to this email or reach us at <a href="mailto:info@draggonnb.online" style="color:${BRAND.primaryColor};text-decoration:none;">info@draggonnb.online</a>.
</p>`

  const plainText = `Welcome to ${BRAND.companyName}, ${data.clientName}!

We are thrilled to have you on board. Your ${data.tierName} plan is now active and your platform is ready to go.

Get started in three quick steps:

1. Set up your CRM - Import your existing contacts or start adding leads manually.
2. Import your contacts - Upload a CSV or connect your existing tools.
3. Send your first campaign - Use our templates to launch a professional email campaign in minutes.

Go to your dashboard: ${data.dashboardUrl}

Need a hand? Reply to this email or reach us at info@draggonnb.online.

--
${BRAND.companyName} OS - The CRM and Marketing Platform Built for South Africa
${BRAND.websiteUrl}`

  return {
    subject: `Welcome to ${BRAND.companyName}, ${data.clientName}!`,
    preheader: `Your ${data.tierName} plan is active. Here is how to get started.`,
    body: wrapInLayout(content, {
      preheader: `Your ${data.tierName} plan is active. Here is how to get started.`,
    }),
    plainText,
  }
}
