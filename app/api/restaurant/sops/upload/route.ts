import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ORG_ID, RESTAURANT_ID } from '@/lib/restaurant/constants'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const instanceId = formData.get('instance_id') as string
  const blockId = formData.get('block_id') as string

  if (!file || !instanceId || !blockId) {
    return NextResponse.json({ error: 'file, instance_id, and block_id are required' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${ORG_ID}/${RESTAURANT_ID}/${instanceId}/${blockId}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadErr } = await supabase.storage
    .from('sop-uploads')
    .upload(path, buffer, { contentType: file.type })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: urlData } = await supabase.storage
    .from('sop-uploads')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year

  return NextResponse.json({
    url: urlData?.signedUrl || '',
    path,
  })
}
