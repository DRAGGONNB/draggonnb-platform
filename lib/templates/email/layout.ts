import { BRAND } from '../types'

interface LayoutOptions {
  preheader?: string
}

export function wrapInLayout(content: string, options?: LayoutOptions): string {
  const preheaderHtml = options?.preheader
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.preheader}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND.companyName}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .fallback-font { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e8e8eb;border-radius:4px;overflow:hidden;">
          <!-- Brand accent line -->
          <tr>
            <td style="height:4px;background-color:${BRAND.primaryColor};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px 16px 32px;text-align:center;">
              <img src="{{logoUrl}}" alt="${BRAND.companyName}" width="140" style="display:inline-block;max-width:140px;height:auto;border:0;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:8px 32px 32px 32px;font-family:${BRAND.fontFamily};font-size:15px;line-height:1.6;color:${BRAND.secondaryColor};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f9f9fb;border-top:1px solid #e8e8eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${BRAND.fontFamily};font-size:12px;line-height:1.5;color:#8c8c9a;text-align:center;">
                    <p style="margin:0 0 8px 0;">
                      <strong>${BRAND.companyName} OS</strong> &mdash; The CRM and Marketing Platform Built for South Africa
                    </p>
                    <p style="margin:0 0 8px 0;">
                      <a href="${BRAND.websiteUrl}" style="color:${BRAND.primaryColor};text-decoration:none;">${BRAND.websiteUrl}</a>
                    </p>
                    <p style="margin:0 0 4px 0;">
                      <a href="{{unsubscribeUrl}}" style="color:#8c8c9a;text-decoration:underline;">Unsubscribe</a>
                      &nbsp;&middot;&nbsp;
                      <a href="${BRAND.websiteUrl}/privacy" style="color:#8c8c9a;text-decoration:underline;">Privacy Policy</a>
                    </p>
                    <p style="margin:8px 0 0 0;font-size:11px;color:#b0b0ba;">
                      You are receiving this email because you are a ${BRAND.companyName} customer or expressed interest in our services.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
