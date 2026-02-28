import type { SendMessageResponse } from './types'

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v19.0'

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID')
  }
  return { accessToken, phoneNumberId }
}

export async function sendTextMessage(to: string, text: string): Promise<SendMessageResponse> {
  const { accessToken, phoneNumberId } = getConfig()
  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp send text error: ${response.status} - ${err}`)
  }
  return response.json()
}

export async function sendInteractiveMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
): Promise<SendMessageResponse> {
  const { accessToken, phoneNumberId } = getConfig()
  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp interactive error: ${response.status} - ${err}`)
  }
  return response.json()
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string = 'en',
  components?: Array<{
    type: 'header' | 'body' | 'button'
    parameters: Array<{ type: 'text' | 'currency' | 'date_time'; text?: string }>
    sub_type?: 'quick_reply' | 'url'
    index?: string
  }>
): Promise<SendMessageResponse> {
  const { accessToken, phoneNumberId } = getConfig()

  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: language },
  }
  if (components?.length) {
    template.components = components
  }

  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template,
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp template error: ${response.status} - ${err}`)
  }
  return response.json()
}

export async function sendMediaMessage(
  to: string,
  mediaType: 'image' | 'document' | 'video' | 'audio',
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<SendMessageResponse> {
  const { accessToken, phoneNumberId } = getConfig()

  const mediaPayload: Record<string, unknown> = { link: mediaUrl }
  if (caption) mediaPayload.caption = caption
  if (filename && mediaType === 'document') mediaPayload.filename = filename

  const response = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`WhatsApp media error: ${response.status} - ${err}`)
  }
  return response.json()
}

export async function markAsRead(messageId: string): Promise<void> {
  const { accessToken, phoneNumberId } = getConfig()

  await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })
}

export async function getBusinessProfile(): Promise<Record<string, unknown> | null> {
  const { accessToken, phoneNumberId } = getConfig()

  const response = await fetch(
    `${WHATSAPP_API_BASE}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  )
  if (!response.ok) return null
  const data = await response.json()
  return data?.data?.[0] || null
}
