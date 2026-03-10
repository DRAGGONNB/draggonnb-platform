/**
 * FIGARIE Tenant Provisioning Script
 *
 * Creates the FIGARIE organization in DraggonnB, enables required modules
 * (crm, email, social), and generates an M2M API key for service-to-service
 * communication.
 *
 * Usage: npx tsx scripts/provisioning/provision-figarie.ts
 *
 * The raw API key is printed ONCE to stdout. Store it securely in the
 * FIGARIE project's environment variables as DRAGGONNB_API_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.error('Ensure .env.local is loaded or env vars are set.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 1. Check if FIGARIE org already exists ────────────────────────────
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('subdomain', 'figarie')
    .single()

  let organizationId: string

  if (existingOrg) {
    console.log(`FIGARIE org already exists: ${existingOrg.id}`)
    organizationId = existingOrg.id
  } else {
    // ── 2. Create FIGARIE organization ──────────────────────────────────
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'FIGARIE (Pty) Ltd',
        subdomain: 'figarie',
        subscription_tier: 'professional',
        subscription_status: 'active',
        owner_id: '00000000-0000-0000-0000-000000000000', // sentinel
      })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('Failed to create organization:', orgError?.message)
      process.exit(1)
    }

    organizationId = org.id
    console.log(`Created FIGARIE org: ${organizationId}`)
  }

  // ── 3. Enable modules: crm, email, social ─────────────────────────────
  const modules = ['crm', 'email', 'social']

  for (const moduleId of modules) {
    const { error } = await supabase
      .from('tenant_modules')
      .upsert(
        {
          organization_id: organizationId,
          module_id: moduleId,
          is_enabled: true,
        },
        { onConflict: 'organization_id,module_id', ignoreDuplicates: true }
      )

    if (error) {
      console.warn(`Warning: module ${moduleId} upsert: ${error.message}`)
    } else {
      console.log(`Enabled module: ${moduleId}`)
    }
  }

  // ── 4. Generate API key ───────────────────────────────────────────────
  const rawKey = randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { error: keyError } = await supabase.from('api_keys').insert({
    organization_id: organizationId,
    key_hash: keyHash,
    name: 'FIGARIE M2M Integration Key',
    scopes: ['contacts:read', 'contacts:write', 'sync:read', 'sync:write'],
  })

  if (keyError) {
    console.error('Failed to create API key:', keyError.message)
    process.exit(1)
  }

  // ── 5. Output ─────────────────────────────────────────────────────────
  console.log('')
  console.log('========================================')
  console.log('FIGARIE provisioning complete!')
  console.log('========================================')
  console.log(`Organization ID: ${organizationId}`)
  console.log('')
  console.log('API Key (store this securely - shown ONCE):')
  console.log(rawKey)
  console.log('')
  console.log('Add to FIGARIE .env.local:')
  console.log(`  DRAGGONNB_API_KEY=${rawKey}`)
  console.log(`  DRAGGONNB_ORG_ID=${organizationId}`)
  console.log('========================================')
}

main().catch((err) => {
  console.error('Provisioning failed:', err)
  process.exit(1)
})
