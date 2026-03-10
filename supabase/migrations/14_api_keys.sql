-- ============================================================================
-- Migration: API Keys for M2M Authentication
-- Created: 2026-03-06
-- Purpose: Enables external service-to-service authentication via API keys
--          for the /api/external/* route family (used by FIGARIE and other
--          vertical SaaS clients).
-- ============================================================================

-- 1. Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Index for fast hash lookups during auth
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Index for listing keys by org
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);

-- 2. Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

-- Org admins can view their own keys
CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- Org admins can insert keys for their org
CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Org admins can update (revoke) their keys
CREATE POLICY "api_keys_update" ON api_keys
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role full access (needed for M2M key verification)
CREATE POLICY "api_keys_service_role" ON api_keys
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    RAISE NOTICE 'api_keys table created successfully';
  ELSE
    RAISE EXCEPTION 'api_keys table NOT found';
  END IF;
END;
$$;
