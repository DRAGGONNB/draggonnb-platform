-- Webhook registrations table for outbound webhook dispatch
-- Vertical clients (e.g. FIGARIE) register their webhook endpoints here
-- to receive notifications when CRM data changes.

CREATE TABLE webhook_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by org + active status
CREATE INDEX webhook_registrations_org_active_idx
  ON webhook_registrations (organization_id)
  WHERE is_active = true;

-- RLS: only org members can view their registrations
ALTER TABLE webhook_registrations ENABLE ROW LEVEL SECURITY;

-- Service role bypass for dispatcher (runs server-side)
CREATE POLICY "service_role_full_access" ON webhook_registrations
  FOR ALL USING (true) WITH CHECK (true);
