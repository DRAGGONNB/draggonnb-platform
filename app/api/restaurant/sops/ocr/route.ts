import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.image_url) {
    return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const expectedFields = body.expected_fields || ['supplier', 'date', 'items', 'total']

  try {
    // Fetch the image
    const imgResp = await fetch(body.image_url)
    if (!imgResp.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
    }
    const imgBuffer = await imgResp.arrayBuffer()
    const base64 = Buffer.from(imgBuffer).toString('base64')
    const contentType = imgResp.headers.get('content-type') || 'image/jpeg'

    // Call Claude Vision
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: contentType, data: base64 },
            },
            {
              type: 'text',
              text: `Extract the following fields from this document image: ${expectedFields.join(', ')}.\n\nReturn ONLY valid JSON with these exact keys. For "items" use an array of objects with "name", "quantity", and "amount" fields. If a field cannot be found, use null.\n\nExample format:\n{\n  "supplier": "ABC Distributors",\n  "date": "2026-04-08",\n  "items": [{"name": "Coca-Cola 330ml x24", "quantity": 2, "amount": 199.90}],\n  "total": 399.80\n}`,
            },
          ],
        }],
      }),
    })

    if (!claudeResp.ok) {
      const err = await claudeResp.text()
      return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 502 })
    }

    const claudeData = await claudeResp.json()
    const textContent = claudeData.content?.[0]?.text || ''

    // Extract JSON from response
    let parsedFields: Record<string, unknown> = {}
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedFields = JSON.parse(jsonMatch[0])
      }
    } catch {
      // Return raw text if JSON parsing fails
    }

    return NextResponse.json({
      extracted_text: textContent,
      parsed_fields: parsedFields,
    })
  } catch (err) {
    return NextResponse.json({ error: `OCR failed: ${String(err)}` }, { status: 500 })
  }
}
