import { BRAND, type EmailTemplate } from '../types'
import { wrapInLayout } from './layout'

interface LeadQualifiedData {
  name: string
  businessType: string
  recommendedTier: string
  tierPrice: string
  keyBenefits: string[]
  pricingUrl: string
}

export function leadQualifiedEmail(data: LeadQualifiedData): EmailTemplate {
  const benefitsHtml = data.keyBenefits
    .map(
      (b) =>
        `<tr>
          <td style="padding:4px 0;font-family:${BRAND.fontFamily};font-size:14px;color:${BRAND.secondaryColor};">
            <span style="color:${BRAND.accentColor};font-weight:600;margin-right:6px;">&#10003;</span> ${b}
          </td>
        </tr>`
    )
    .join('')

  const content = `
<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:${BRAND.secondaryColor};">
  Thanks for your interest, ${data.name}
</h1>
<p style="margin:0 0 16px 0;">
  We have reviewed your details and put together a recommendation tailored to your <strong>${data.businessType}</strong> business.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;padding:20px;background-color:#f9f9fb;border-radius:4px;border-left:4px solid ${BRAND.accentColor};">
  <tr>
    <td>
      <p style="margin:0 0 4px 0;font-size:13px;color:#8c8c9a;text-transform:uppercase;letter-spacing:0.5px;font-family:${BRAND.fontFamily};">
        Recommended Plan
      </p>
      <p style="margin:0 0 12px 0;font-size:20px;font-weight:600;color:${BRAND.secondaryColor};font-family:${BRAND.fontFamily};">
        ${data.recommendedTier} &mdash; ${data.tierPrice}/mo
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        ${benefitsHtml}
      </table>
    </td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="background-color:${BRAND.primaryColor};border-radius:4px;text-align:center;">
      <a href="${data.pricingUrl}" style="display:inline-block;padding:12px 28px;font-family:${BRAND.fontFamily};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        View Your Recommended Plan
      </a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#6b6b78;">
  <strong>P.S.</strong> Every plan includes a 14-day free trial, no credit card required. Take it for a spin and see the results for yourself.
</p>`

  const benefitsPlain = data.keyBenefits.map((b) => `  - ${b}`).join('\n')

  const plainText = `Thanks for your interest, ${data.name}

We have reviewed your details and put together a recommendation tailored to your ${data.businessType} business.

Recommended Plan: ${data.recommendedTier} - ${data.tierPrice}/mo

${benefitsPlain}

View your recommended plan: ${data.pricingUrl}

P.S. Every plan includes a 14-day free trial, no credit card required. Take it for a spin and see the results for yourself.

--
${BRAND.companyName} OS - The CRM and Marketing Platform Built for South Africa
${BRAND.websiteUrl}`

  return {
    subject: `Thanks for your interest, ${data.name} -- here's your personalised recommendation`,
    preheader: `We recommend the ${data.recommendedTier} plan for your ${data.businessType} business.`,
    body: wrapInLayout(content, {
      preheader: `We recommend the ${data.recommendedTier} plan for your ${data.businessType} business.`,
    }),
    plainText,
  }
}
