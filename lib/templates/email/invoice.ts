import { BRAND, type EmailTemplate } from '../types'
import { wrapInLayout } from './layout'

interface InvoiceLineItem {
  description: string
  amount: string
}

interface InvoiceData {
  clientName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  lineItems: InvoiceLineItem[]
  totalAmount: string
  paymentUrl: string
}

export function invoiceEmail(data: InvoiceData): EmailTemplate {
  const lineItemsHtml = data.lineItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f3;font-family:${BRAND.fontFamily};font-size:14px;color:${BRAND.secondaryColor};">
            ${item.description}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f3;font-family:${BRAND.fontFamily};font-size:14px;color:${BRAND.secondaryColor};text-align:right;white-space:nowrap;">
            R${item.amount}
          </td>
        </tr>`
    )
    .join('')

  const content = `
<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:${BRAND.secondaryColor};">
  Invoice #${data.invoiceNumber}
</h1>
<p style="margin:0 0 20px 0;">
  Hi ${data.clientName}, please find your invoice details below.
</p>
<!-- Invoice meta -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
  <tr>
    <td style="font-family:${BRAND.fontFamily};font-size:13px;color:#6b6b78;">
      <strong style="color:${BRAND.secondaryColor};">Invoice Date:</strong> ${data.invoiceDate}<br />
      <strong style="color:${BRAND.secondaryColor};">Due Date:</strong> ${data.dueDate}<br />
      <strong style="color:${BRAND.secondaryColor};">Invoice Number:</strong> ${data.invoiceNumber}
    </td>
  </tr>
</table>
<!-- Line items -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px 0;border:1px solid #e8e8eb;border-radius:4px;overflow:hidden;">
  <tr>
    <td style="padding:10px 12px;background-color:#f9f9fb;font-family:${BRAND.fontFamily};font-size:12px;font-weight:600;color:#8c8c9a;text-transform:uppercase;letter-spacing:0.5px;">
      Description
    </td>
    <td style="padding:10px 12px;background-color:#f9f9fb;font-family:${BRAND.fontFamily};font-size:12px;font-weight:600;color:#8c8c9a;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">
      Amount (ZAR)
    </td>
  </tr>
  ${lineItemsHtml}
  <tr>
    <td style="padding:12px;font-family:${BRAND.fontFamily};font-size:15px;font-weight:700;color:${BRAND.secondaryColor};">
      Total
    </td>
    <td style="padding:12px;font-family:${BRAND.fontFamily};font-size:15px;font-weight:700;color:${BRAND.secondaryColor};text-align:right;">
      R${data.totalAmount}
    </td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${BRAND.primaryColor};border-radius:4px;text-align:center;">
      <a href="${data.paymentUrl}" style="display:inline-block;padding:12px 28px;font-family:${BRAND.fontFamily};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        Pay Now via PayFast
      </a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#8c8c9a;">
  <strong>Payment Terms:</strong> Payment is due by ${data.dueDate}. If you have already made payment, please disregard this email. For queries, reply to this email or contact <a href="mailto:accounts@draggonnb.co.za" style="color:${BRAND.primaryColor};text-decoration:none;">accounts@draggonnb.co.za</a>.
</p>`

  const lineItemsPlain = data.lineItems
    .map((item) => `  ${item.description} — R${item.amount}`)
    .join('\n')

  const plainText = `Invoice #${data.invoiceNumber}

Hi ${data.clientName}, please find your invoice details below.

Invoice Date: ${data.invoiceDate}
Due Date: ${data.dueDate}
Invoice Number: ${data.invoiceNumber}

Items:
${lineItemsPlain}

Total: R${data.totalAmount}

Pay now: ${data.paymentUrl}

Payment Terms: Payment is due by ${data.dueDate}. If you have already made payment, please disregard this email. For queries, reply to this email or contact accounts@draggonnb.co.za.

--
${BRAND.companyName} OS - The CRM and Marketing Platform Built for South Africa
${BRAND.websiteUrl}`

  return {
    subject: `Invoice #${data.invoiceNumber} from ${BRAND.companyName}`,
    preheader: `Invoice for R${data.totalAmount} due ${data.dueDate}.`,
    body: wrapInLayout(content, {
      preheader: `Invoice for R${data.totalAmount} due ${data.dueDate}.`,
    }),
    plainText,
  }
}
