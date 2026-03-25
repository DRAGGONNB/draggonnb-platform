import { BRAND, type EmailTemplate } from '../types'
import { wrapInLayout } from './layout'

interface ProposalModule {
  name: string
  description: string
}

interface ProposalData {
  clientName: string
  tierName: string
  price: string
  modules: ProposalModule[]
  usageLimits: string[]
  signupUrl: string
}

export function proposalEmail(data: ProposalData): EmailTemplate {
  const modulesHtml = data.modules
    .map(
      (m) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f3;font-family:${BRAND.fontFamily};font-size:14px;">
            <strong style="color:${BRAND.secondaryColor};">${m.name}</strong><br />
            <span style="color:#6b6b78;font-size:13px;">${m.description}</span>
          </td>
        </tr>`
    )
    .join('')

  const limitsHtml = data.usageLimits
    .map(
      (l) =>
        `<tr>
          <td style="padding:4px 0;font-family:${BRAND.fontFamily};font-size:13px;color:${BRAND.secondaryColor};">
            <span style="color:${BRAND.accentColor};margin-right:6px;">&#8226;</span> ${l}
          </td>
        </tr>`
    )
    .join('')

  const content = `
<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:${BRAND.secondaryColor};">
  Your ${BRAND.companyName} ${data.tierName} Plan Proposal
</h1>
<p style="margin:0 0 16px 0;">
  Hi ${data.clientName}, here is your tailored proposal for the <strong>${data.tierName}</strong> plan.
</p>
<!-- Price highlight -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="padding:20px;background-color:${BRAND.secondaryColor};border-radius:4px;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#b0b0ba;text-transform:uppercase;letter-spacing:0.5px;font-family:${BRAND.fontFamily};">
        Monthly Investment
      </p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;font-family:${BRAND.fontFamily};">
        R${data.price} <span style="font-size:14px;font-weight:400;color:#b0b0ba;">/month</span>
      </p>
    </td>
  </tr>
</table>
<!-- Modules -->
<p style="margin:0 0 8px 0;font-weight:600;color:${BRAND.secondaryColor};">Included Modules</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid #e8e8eb;border-radius:4px;overflow:hidden;">
  ${modulesHtml}
</table>
<!-- Usage limits -->
<p style="margin:0 0 8px 0;font-weight:600;color:${BRAND.secondaryColor};">Usage Allowances</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  ${limitsHtml}
</table>
<!-- What's included -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;padding:16px;background-color:#f9f9fb;border-radius:4px;">
  <tr>
    <td style="font-family:${BRAND.fontFamily};font-size:13px;color:#6b6b78;">
      <strong style="color:${BRAND.secondaryColor};">Every plan includes:</strong><br />
      Dedicated subdomain &bull; SSL certificate &bull; Email support &bull; Platform updates &bull; Data backups &bull; 99.9% uptime SLA
    </td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
  <tr>
    <td style="background-color:${BRAND.primaryColor};border-radius:4px;text-align:center;">
      <a href="${data.signupUrl}" style="display:inline-block;padding:12px 28px;font-family:${BRAND.fontFamily};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        Start Your 14-Day Free Trial
      </a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#8c8c9a;">
  No credit card required. Cancel anytime during the trial.
</p>`

  const modulesPlain = data.modules
    .map((m) => `  - ${m.name}: ${m.description}`)
    .join('\n')
  const limitsPlain = data.usageLimits.map((l) => `  - ${l}`).join('\n')

  const plainText = `Your ${BRAND.companyName} ${data.tierName} Plan Proposal

Hi ${data.clientName}, here is your tailored proposal for the ${data.tierName} plan.

Monthly Investment: R${data.price}/month

Included Modules:
${modulesPlain}

Usage Allowances:
${limitsPlain}

Every plan includes: Dedicated subdomain, SSL certificate, Email support, Platform updates, Data backups, 99.9% uptime SLA.

Start your 14-day free trial: ${data.signupUrl}
No credit card required. Cancel anytime during the trial.

--
${BRAND.companyName} OS - The CRM and Marketing Platform Built for South Africa
${BRAND.websiteUrl}`

  return {
    subject: `Your ${BRAND.companyName} ${data.tierName} Plan Proposal`,
    preheader: `${data.tierName} plan at R${data.price}/mo -- see what is included.`,
    body: wrapInLayout(content, {
      preheader: `${data.tierName} plan at R${data.price}/mo -- see what is included.`,
    }),
    plainText,
  }
}
