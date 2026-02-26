# Elijah: community safety operations architecture for DraggonnB

**Elijah is a vertical SaaS module that transforms fragmented WhatsApp groups and manual processes into a structured, AI-powered community safety operations platform.** Built atop DraggonnB's existing CRMM stack (Next.js, Supabase, n8n, Claude API), it delivers incident management, automated roll calls, patrol coordination, and intelligent escalations for South African farm watch and neighborhood watch communities. This document provides the complete technical architecture, database schema, workflow designs, AI agent framework, and phased build plan to take Elijah from concept to production.

The platform's messaging strategy is distinctly tiered: **Telegram handles daily operations at zero cost**, **WhatsApp Business API reserves critical emergency alerts only** (keeping costs to ~$15–60/month per community), and an **embedded Supabase Realtime chat** inside the web dashboard provides the operational command center. AI triage via Claude Haiku classifies incidents in under 3 seconds, while n8n orchestrates escalation chains that progress from gentle reminders to emergency alerts across all channels.

---

## System architecture and technology decisions

The architecture extends the existing CRMM without disrupting it. The Next.js frontend gains new route groups (`/elijah/*`) for the dispatcher dashboard, incident views, patrol tracking, and embedded chat. Supabase remains the single PostgreSQL database with new Elijah-specific tables protected by community-scoped RLS policies. n8n on VPS becomes the automation backbone handling webhooks from Telegram and WhatsApp, scheduling roll calls, running escalation monitors, and orchestrating Claude API calls for AI triage.

```
┌─────────────────────────────────────────────────────────┐
│  USERS: Farmers, Patrol Members, Dispatchers, Admins    │
│  Channels: PWA Dashboard │ Telegram Bot │ WhatsApp      │
└────────┬──────────────────┬───────────────┬─────────────┘
         │                  │               │
         ▼                  ▼               ▼
┌─────────────────┐  ┌───────────┐  ┌──────────────────┐
│  Next.js on     │  │  n8n on   │  │  Supabase        │
│  Vercel (PWA)   │  │  VPS      │  │  (PostgreSQL+    │
│  - Dashboard    │◄─┤  - Cron   │─►│   Auth+Realtime+ │
│  - Chat (RT)    │  │  - Webhooks│  │   Storage)       │
│  - Incident UI  │  │  - Claude │  │  - RLS policies  │
│  - Patrol view  │  │  - STT    │  │  - Realtime      │
└─────────────────┘  └─────┬─────┘  │    broadcast     │
                           │        └──────────────────┘
                    ┌──────┴──────┐
                    │  External   │
                    │  APIs       │
                    │  - Claude   │
                    │  - Whisper  │
                    │  - Google   │
                    │    STT      │
                    │  - WA Cloud │
                    │  - Telegram │
                    └─────────────┘
```

**Key technology choices and rationale:**

| Component | Choice | Why |
|---|---|---|
| Real-time chat | Supabase Realtime Broadcast + Presence | Low latency, RLS-enforced private channels, no additional infrastructure |
| WhatsApp provider | Meta Cloud API (direct) | Zero platform fees, zero markup ($0.0076/utility msg to SA), native n8n node |
| Telegram | Bot API via n8n | Completely free, native n8n Telegram nodes, excellent bot capabilities |
| Primary STT | OpenAI Whisper API | $0.006/min, excellent English accuracy, cheapest API option |
| Afrikaans STT | Google Cloud Speech-to-Text (Chirp) | Native Afrikaans support — Whisper misidentifies Afrikaans as Dutch |
| AI triage | Claude Haiku 4.5 | $1/$5 per MTok, structured JSON output, fast enough for real-time classification |
| AI analysis | Claude Sonnet 4.5 (batch) | Complex pattern detection, weekly reports, 50% discount via Batch API |
| Workflow engine | n8n (self-hosted, queue mode) | Already deployed, handles 220 executions/sec, direct Supabase/Telegram/WA nodes |

---

## Database schema for community safety operations

The schema extends the existing CRMM database. All new tables reference the CRMM's organization/tenant system and use Supabase Auth's `auth.users`. Every table has RLS enabled with community-scoped isolation.

### Custom types and enums

```sql
-- Severity and status enums
CREATE TYPE incident_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_status AS ENUM ('reported', 'acknowledged', 'responding', 'resolved', 'closed');
CREATE TYPE incident_type AS ENUM (
  'break_in', 'theft', 'suspicious_vehicle', 'suspicious_person',
  'fire', 'medical_emergency', 'livestock_issue', 'fence_damage',
  'road_blockage', 'power_outage', 'communication_failure',
  'wildlife_threat', 'flooding', 'missing_person', 'gunshots_heard', 'other'
);
CREATE TYPE community_role AS ENUM ('admin', 'dispatcher', 'responder', 'member');
CREATE TYPE channel_type AS ENUM ('general', 'dispatch', 'incident', 'patrol', 'direct');
CREATE TYPE notification_channel AS ENUM ('in_app', 'telegram', 'whatsapp', 'sms');
CREATE TYPE escalation_level AS ENUM ('none', 'reminder', 'buddy', 'dispatcher', 'critical');
CREATE TYPE patrol_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE message_type AS ENUM ('text', 'image', 'voice', 'file', 'system', 'alert');
```

### Core tables

```sql
-- ============================================
-- COMMUNITIES
-- ============================================
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),  -- links to CRMM tenant
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  threat_level TEXT DEFAULT 'normal' CHECK (threat_level IN ('normal','elevated','high','critical')),
  settings JSONB DEFAULT '{}',  -- messaging prefs, escalation defaults
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_communities_org ON communities(organization_id);

-- ============================================
-- COMMUNITY MEMBERS
-- ============================================
CREATE TABLE community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role community_role NOT NULL DEFAULT 'member',
  display_name TEXT NOT NULL,
  phone TEXT,
  telegram_chat_id TEXT,
  whatsapp_number TEXT,
  property_name TEXT,          -- farm/property name
  property_location POINT,    -- GPS coordinates
  emergency_contacts JSONB DEFAULT '[]',
  buddy_member_id UUID REFERENCES community_members(id),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);
CREATE INDEX idx_cm_community ON community_members(community_id);
CREATE INDEX idx_cm_user ON community_members(user_id);
CREATE INDEX idx_cm_community_role ON community_members(community_id, role);
CREATE INDEX idx_cm_telegram ON community_members(telegram_chat_id);

-- Sensitive data in separate table (access-controlled)
CREATE TABLE member_sensitive_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id),
  medical_conditions TEXT,      -- encrypted at app layer
  medical_notes TEXT,
  blood_type TEXT,
  firearms_registered JSONB,    -- encrypted: [{type, license_no, caliber}]
  vehicles JSONB,               -- [{make, model, color, registration}]
  access_level community_role DEFAULT 'dispatcher',  -- minimum role to view
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_msd_member ON member_sensitive_data(member_id);

-- ============================================
-- INCIDENTS
-- ============================================
CREATE TABLE incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  reported_by UUID REFERENCES community_members(id),
  incident_type incident_type NOT NULL DEFAULT 'other',
  severity incident_severity NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'reported',
  title TEXT NOT NULL,
  description TEXT,
  location POINT,
  location_description TEXT,
  source_channel notification_channel DEFAULT 'in_app',
  ai_triage JSONB,             -- full AI classification result
  ai_confidence NUMERIC(3,2),
  assigned_to UUID REFERENCES community_members(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  sla_acknowledge_by TIMESTAMPTZ,
  sla_resolve_by TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- voice note URLs, original message, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_incidents_community ON incidents(community_id);
CREATE INDEX idx_incidents_status ON incidents(community_id, status);
CREATE INDEX idx_incidents_severity ON incidents(community_id, severity);
CREATE INDEX idx_incidents_created ON incidents(community_id, created_at DESC);

-- ============================================
-- INCIDENT RESPONSES (activity log)
-- ============================================
CREATE TABLE incident_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  responder_id UUID REFERENCES community_members(id),
  action TEXT NOT NULL,         -- 'acknowledged', 'dispatched', 'arrived', 'note', 'escalated', 'resolved'
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ir_incident ON incident_responses(incident_id, created_at);

-- ============================================
-- ROLL CALLS
-- ============================================
CREATE TABLE roll_call_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  grace_window_minutes INT DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
  initiated_by UUID REFERENCES community_members(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rcs_community ON roll_call_sessions(community_id, scheduled_at DESC);

CREATE TABLE roll_call_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES roll_call_sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','safe','issue','missed','escalated')),
  escalation_level escalation_level DEFAULT 'none',
  responded_at TIMESTAMPTZ,
  response_note TEXT,
  telegram_message_id TEXT,
  sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  buddy_notified_at TIMESTAMPTZ,
  dispatcher_alerted_at TIMESTAMPTZ,
  critical_alert_sent_at TIMESTAMPTZ,
  UNIQUE(session_id, member_id)
);
CREATE INDEX idx_rcr_session ON roll_call_responses(session_id, status);
CREATE INDEX idx_rcr_member ON roll_call_responses(member_id);

-- ============================================
-- PATROLS
-- ============================================
CREATE TABLE patrol_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  name TEXT NOT NULL,
  description TEXT,
  checkpoints JSONB NOT NULL DEFAULT '[]', -- [{name, lat, lng, order, instructions}]
  estimated_duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE patrol_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  route_id UUID REFERENCES patrol_routes(id),
  assigned_to UUID NOT NULL REFERENCES community_members(id),
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  status patrol_status DEFAULT 'scheduled',
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  handover_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ps_community ON patrol_sessions(community_id, shift_start);

CREATE TABLE patrol_checkpoint_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES patrol_sessions(id),
  checkpoint_index INT NOT NULL,
  location POINT,
  verified BOOLEAN DEFAULT false,
  distance_from_expected_m NUMERIC,
  notes TEXT,
  photo_url TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SOPs AND CHECKLISTS
-- ============================================
CREATE TABLE sops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,       -- maps to incident_type for AI matching
  content TEXT NOT NULL,        -- markdown content
  severity_applicability incident_severity[],
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  created_by UUID REFERENCES community_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sops_community ON sops(community_id, category);

CREATE TABLE checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  sop_id UUID REFERENCES sops(id),
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- [{order, text, required}]
  context TEXT CHECK (context IN ('patrol', 'incident', 'shift_handover', 'general')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHAT SYSTEM
-- ============================================
CREATE TABLE chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  name TEXT NOT NULL,
  channel_type channel_type DEFAULT 'general',
  linked_incident_id UUID REFERENCES incidents(id),
  linked_patrol_id UUID REFERENCES patrol_sessions(id),
  is_restricted BOOLEAN DEFAULT false,  -- admin/dispatcher only
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cc_community ON chat_channels(community_id);

CREATE TABLE chat_channel_members (
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  member_id UUID REFERENCES community_members(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (channel_id, member_id)
);

CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES community_members(id),
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  metadata JSONB DEFAULT '{}',  -- {file_url, thumbnail_url, duration_sec, etc.}
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_msgs_channel ON chat_messages(channel_id, created_at DESC);

-- ============================================
-- ESCALATION RULES
-- ============================================
CREATE TABLE escalation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  context TEXT NOT NULL CHECK (context IN ('roll_call', 'incident', 'patrol')),
  escalation_level escalation_level NOT NULL,
  delay_minutes INT NOT NULL,
  action TEXT NOT NULL,         -- 'send_reminder', 'notify_buddy', 'alert_dispatcher', 'whatsapp_critical'
  notification_channels notification_channel[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NOTIFICATION LOGS
-- ============================================
CREATE TABLE notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  recipient_id UUID REFERENCES community_members(id),
  channel notification_channel NOT NULL,
  priority incident_severity DEFAULT 'medium',
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued','sent','delivered','read','failed')),
  external_message_id TEXT,    -- Telegram msg_id or WA msg_id
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_nl_community ON notification_logs(community_id, sent_at DESC);
CREATE INDEX idx_nl_recipient ON notification_logs(recipient_id);
```

### RLS policies — community isolation with role-based access

```sql
-- Helper: get user's community memberships (cached per statement)
CREATE OR REPLACE FUNCTION user_community_ids()
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT community_id FROM community_members
  WHERE user_id = (SELECT auth.uid()) AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION user_community_role(p_community_id UUID)
RETURNS community_role LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM community_members
  WHERE user_id = (SELECT auth.uid()) AND community_id = p_community_id
  LIMIT 1;
$$;

-- INCIDENTS: community members see their community's incidents
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents_read" ON incidents FOR SELECT TO authenticated
USING (community_id IN (SELECT user_community_ids()));

CREATE POLICY "incidents_insert" ON incidents FOR INSERT TO authenticated
WITH CHECK (community_id IN (SELECT user_community_ids()));

CREATE POLICY "incidents_update" ON incidents FOR UPDATE TO authenticated
USING (
  community_id IN (SELECT user_community_ids())
  AND user_community_role(community_id) IN ('admin', 'dispatcher', 'responder')
);

-- SENSITIVE DATA: only admin/dispatcher can read
ALTER TABLE member_sensitive_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sensitive_read" ON member_sensitive_data FOR SELECT TO authenticated
USING (
  community_id IN (SELECT user_community_ids())
  AND (
    CASE access_level
      WHEN 'admin' THEN user_community_role(community_id) = 'admin'
      WHEN 'dispatcher' THEN user_community_role(community_id) IN ('admin','dispatcher')
      WHEN 'responder' THEN user_community_role(community_id) IN ('admin','dispatcher','responder')
      ELSE false
    END
  )
);

-- CHAT MESSAGES: only channel members
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_channel_members ccm
    WHERE ccm.channel_id = chat_messages.channel_id
    AND ccm.member_id IN (
      SELECT id FROM community_members WHERE user_id = (SELECT auth.uid())
    )
  )
);
```

**Performance critical**: Always wrap `auth.uid()` in `(SELECT auth.uid())` to cache the function result per statement rather than per row — this yields **100x+ improvement** on large tables. Index every column referenced in RLS policies.

---

## Embedded real-time chat using Supabase Realtime

The chat system uses a **hybrid Broadcast + Presence architecture** rather than pure Postgres Changes. This is critical because Postgres Changes processes on a single thread — with 100 subscribers listening to a channel, each insert triggers 100 RLS evaluations. Broadcast avoids this bottleneck entirely.

**How it works:** When a user sends a message, the client inserts into the `chat_messages` table. A database trigger calls `realtime.send()` to broadcast the message to all subscribers on that channel's topic. Clients receive the broadcast instantly via WebSocket. Presence tracks who is online.

```sql
-- Database trigger: auto-broadcast new messages
CREATE OR REPLACE FUNCTION broadcast_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id, 'channel_id', NEW.channel_id,
      'sender_id', NEW.sender_id, 'content', NEW.content,
      'message_type', NEW.message_type, 'created_at', NEW.created_at
    ),
    'new_message',
    'chat:' || NEW.channel_id::text,
    true  -- private channel: RLS enforced on subscription
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION broadcast_chat_message();
```

**Client-side pattern in Next.js:**

```typescript
const channel = supabase.channel(`chat:${channelId}`, {
  config: { private: true }  // enforces RLS on join
})

channel
  .on('broadcast', { event: 'new_message' }, ({ payload }) => {
    setMessages(prev => [...prev, payload])
  })
  .on('presence', { event: 'sync' }, () => {
    setOnlineUsers(channel.presenceState())
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: currentUser.id, status: 'online' })
    }
  })
```

**Realtime does not guarantee delivery.** The client must fetch missed messages on reconnect by querying `chat_messages` for anything after the last received timestamp. Use Supabase's Pro plan (500 base connections, scalable to **10,000 concurrent connections** and **2,500 msg/sec**) — more than sufficient for hundreds of active communities. RLS authorization on private channels is evaluated at join time and when the JWT refreshes, so changes to `chat_channel_members` take effect on the next connection.

---

## Messaging architecture across three tiers

The three-tier messaging strategy balances cost, reliability, and reach. Each tier serves a distinct purpose with clear boundaries.

**Tier 1 — In-app chat (Supabase Realtime):** The primary operational command center. Dispatchers and active members use the web dashboard for all coordination. Channels auto-create for each incident, patrol, and community-wide operations. Zero per-message cost. Requires internet connectivity.

**Tier 2 — Telegram Bot (daily operations):** The mobile fallback for daily ops. Roll call notifications, patrol updates, routine check-ins, and incident reports flow through a Telegram bot. **Completely free** — no per-message charges. Commands include `/checkin`, `/report`, `/patrol`, `/sos`, `/status`. The bot uses inline keyboards for quick one-tap responses. Rate limits (30 msg/sec globally) are sufficient for communities of 500+ members.

**Tier 3 — WhatsApp Business API (critical alerts only):** Reserved exclusively for alarm activations, escalations after missed welfare checks, and emergency broadcasts. Using **Meta's Cloud API directly** at **$0.0076 per utility message** to South African numbers — the cheapest option with zero platform fees. Pre-approved template messages trigger via n8n when escalation rules fire.

**Cost estimate for a typical community (~300 members):**

| Channel | Monthly Volume | Cost |
|---|---|---|
| In-app chat | Unlimited | $0 (included in Supabase plan) |
| Telegram | All daily ops (~2,000+ messages) | **$0** |
| WhatsApp (critical alerts) | ~20-50 alerts × targeted recipients | **$15–60/month** |
| WhatsApp (optimized with service windows) | Replies within 24h = free | **$10–30/month** |

WhatsApp template messages must be pre-approved by Meta. Three essential templates for Elijah: `emergency_alert` (🚨 incident notification with response options), `welfare_check` (timed check-in request), and `escalation_notice` (missed check-in critical alert). Categorize as **Utility** messages, not Marketing, to get the lower $0.0076 rate.

---

## AI agent architecture with Claude API

The AI layer operates entirely asynchronously through n8n. No AI calls block the user-facing request path. The end-to-end pipeline from voice note received to classified incident in dashboard takes **5–15 seconds**.

### Voice note processing pipeline

A language-routed dual-STT approach handles South Africa's bilingual reality:

1. Voice note arrives via WhatsApp/Telegram webhook → n8n downloads the OGG/Opus file
2. Quick language detection (Whisper's auto-detect or first-pass classifier)
3. **English → OpenAI Whisper API** ($0.006/min, excellent SA English accuracy)
4. **Afrikaans → Google Cloud STT Chirp model** ($0.016/min, native Afrikaans support — Whisper misidentifies Afrikaans as Dutch with unusable output)
5. Transcription feeds into Claude for structured incident creation

**Monthly STT cost for a community of 200 members processing ~30 voice notes/day at 30 seconds average: approximately $5.** Both WhatsApp and Telegram voice notes use OGG/Opus format, simplifying the pipeline.

### Incident triage with Claude Haiku

Claude Haiku 4.5 at **$1/$5 per MTok** handles all real-time classification. The system prompt containing the classification taxonomy and community context is cached using Anthropic's **prompt caching** (reads at 0.1x input cost after initial write), saving ~40% on input token costs across thousands of monthly calls.

**System prompt** (cached, ~500 tokens): Defines the 16 incident types, 4 severity levels, and South African farm safety context. Includes instructions for structured JSON output.

**Structured output schema** enforces guaranteed JSON compliance via `output_config.format`:

```json
{
  "incident_type": "suspicious_vehicle",
  "severity": "MEDIUM",
  "summary": "Unknown white bakkie circling farm perimeter on R44",
  "suggested_actions": ["Alert patrol on R44 sector", "Request registration check"],
  "sop_lookup_recommended": true,
  "sop_category": "suspicious_vehicle",
  "follow_up_required": true,
  "follow_up_timeframe_minutes": 30,
  "confidence": 0.87
}
```

**Model selection by task:**

| Task | Model | Frequency | Cost/Month |
|---|---|---|---|
| Incident triage | Haiku 4.5 | ~1,500 calls | ~$3.50 |
| Roll call monitoring | Haiku 4.5 | ~2,880 calls | ~$4.30 |
| SOP recommendations | Haiku 4.5 | ~300 calls | ~$1.35 |
| Pattern analysis (weekly) | Sonnet 4.5 Batch (50% off) | ~30 calls | ~$0.80 |
| **Total AI per community** | | | **~$10–15/month** |

**Graceful degradation is non-negotiable for a safety system.** If Claude API is unreachable, n8n defaults: log the incident with raw text, auto-assign HIGH severity for keyword matches ("gun", "fire", "attack", "help"), flag for manual review, and alert the admin that AI is offline.

---

## n8n workflow architecture for safety operations

All workflows run on self-hosted n8n in **queue mode** (with Redis + PostgreSQL) for resilience. The VPS should be **2+ vCPUs, 4GB+ RAM** for production supporting 5-15 communities. Set `GENERIC_TIMEZONE=Africa/Johannesburg` for correct SAST scheduling.

### Roll call escalation — the most critical workflow

The escalation system uses a **polling architecture** (not per-member Wait nodes) for scalability and resilience. Two workflows cooperate:

**Workflow A — Roll Call Dispatcher** (Schedule Trigger, cron per community):
Fires at configured time (e.g., 6:00 AM SAST) → queries active community members → creates `roll_call_responses` records with `status=pending` → sends Telegram messages with inline keyboard "✅ Check In" button → records `sent_at` timestamp.

**Workflow B — Escalation Monitor** (Schedule Trigger, every 5 minutes):
Queries all pending roll call responses → calculates elapsed time → routes through escalation tiers:

- **T+30 min**: Reminder sent via Telegram to member
- **T+45 min**: Buddy system — designated buddy receives Telegram alert
- **T+60 min**: Dispatcher dashboard alert (Supabase insert triggers Realtime notification)
- **T+90 min**: WhatsApp critical alert to emergency contacts

Each tier checks whether the member has responded before escalating further. All state lives in Supabase (`roll_call_responses.escalation_level`, timestamp columns), making workflows stateless, restartable, and debuggable. This approach **survives n8n restarts** cleanly, unlike per-member Wait node chains that create hundreds of suspended executions.

**Workflow C — Check-In Handler** (Telegram Trigger, callback query):
Parses inline button callback → updates `roll_call_responses` to `status=safe` → edits original Telegram message to show "✅ Checked in at 06:14" → halts further escalation for that member.

### Incident lifecycle automation

```
Incoming report (Webhook / Telegram / WhatsApp)
  → Normalize to standard schema (Code node)
  → Insert into incidents table (Supabase node)
  → Download voice note if present (HTTP Request)
  → Transcribe via STT API (HTTP Request to Whisper/Google)
  → Classify via Claude Haiku (HTTP Request with structured output)
  → Update incident with AI triage results (Supabase)
  → Switch by severity:
      CRITICAL/HIGH → WhatsApp + Telegram + in-app (all channels)
      MEDIUM → Telegram + in-app
      LOW → in-app only
  → Auto-assign to on-duty dispatcher (Supabase)
```

A separate **SLA Monitor workflow** (every 5 minutes) checks open incidents against configurable thresholds: acknowledge within 15 min for HIGH, 30 min for MEDIUM. Breached SLAs trigger escalation to supervisors.

### Multi-channel notification router (reusable sub-workflow)

Every notification in Elijah routes through a single sub-workflow that accepts `recipient_id`, `message_content`, `priority`, and `metadata`. It determines channels based on priority, retrieves recipient contact details from Supabase, and sends via each channel with **fallback logic**: if Telegram fails → try WhatsApp for high-priority → always log to `notification_logs`. WhatsApp sends are gated behind `IF priority == 'critical'` to enforce cost control. Every send attempt logs delivery status for audit and debugging.

### Critical n8n constraints

**Single webhook per bot**: Telegram and WhatsApp each support only ONE webhook URL per bot/app. Use a **single Telegram Trigger workflow** that routes to sub-workflows via Switch node based on message type and command. Same pattern for WhatsApp.

**Retry strategy**: Enable "Retry on Fail" (3 attempts, 2-second delay) on all HTTP Request, Telegram, and WhatsApp nodes. Set "On Error = Continue" so a failed channel doesn't block other notifications. A Global Error Handler workflow captures all failures and alerts the ops Telegram channel.

---

## POPIA compliance is a launch blocker

South Africa's Protection of Personal Information Act carries penalties up to **ZAR 10 million or 10% of annual turnover**, with up to 10 years imprisonment for serious offenses. Elijah processes several high-risk data categories that demand careful handling.

**Voice notes qualify as biometric/special personal information** under POPIA Section 26. Processing requires explicit consent AND one of the conditions in Sections 27-33. Before sending voice notes to external STT APIs (Whisper, Google), obtain specific informed consent from each member for this processing. Consider applying to the Information Regulator for prior authorization under Section 57.

**Cross-border data transfer is the highest compliance risk.** Supabase cloud hosting stores data outside South Africa. POPIA Section 72 prohibits transfer unless the recipient country has adequate protection laws, or the data subject consents. South Africa has issued **no formal adequacy decisions** about any country. Mitigation options ranked by preference:

1. Self-host Supabase or use regional hosting to keep data in South Africa
2. Implement binding data processing agreements providing "substantially similar" POPIA protection
3. Obtain explicit informed consent for cross-border transfer during registration
4. At minimum, encrypt special personal information (medical, firearms, voice) client-side before it reaches Supabase

**The private security exemption does not apply.** POPIA Section 6(1)(c) exempts public bodies processing data for national security. DraggonnB is a private company; community watch groups are not official law enforcement. Use consent + legitimate interests (community safety) as the dual legal basis.

**Required before launch:** Register an Information Officer with the Information Regulator, publish a POPIA-compliant privacy policy, implement granular consent collection (separate opt-in for each special data type), prepare a data breach response plan with SCN1 notification template, and execute a data processing agreement with Supabase.

---

## Designing for rural South African connectivity

**Only ~1% of rural South African households have fixed internet.** Mobile broadband via Vodacom and MTN is the primary connectivity path, with 3G/4G covering 99% of population — but coverage maps don't reflect real-world reliability on remote farms. Load shedding compounds the problem, with telecoms spending R3.5 billion on backup power in 2023 alone.

The platform must operate gracefully under these constraints:

**Progressive Web App architecture**: The Next.js dashboard ships as an installable PWA with aggressive service worker caching. Cache-first for UI shell and static assets, stale-while-revalidate for incident lists and member data. The app shell loads from cache even with zero connectivity. Use the Background Sync API to queue incident reports and check-ins when offline, syncing automatically when connectivity returns.

**Telegram and WhatsApp are the resilience layer.** Both platforms handle low-connectivity environments natively — message queuing, compressed media, store-and-forward delivery. This is why Telegram serves as the daily ops channel, not just the web dashboard. A farmer with intermittent 3G can still check in via a single Telegram button tap.

**Image compression is mandatory.** Client-side compression to under 100KB before upload prevents failed uploads on slow connections. Voice notes are already compact (~10-120KB for 5-60 seconds in OGG/Opus).

**Data-saver mode**: Implement a toggle that disables auto-loading of images in feeds, reduces real-time update frequency, and batches API calls to minimize data consumption.

---

## Competitive positioning in the South African market

Elijah occupies a distinct niche. **Namola** (now acquired by Community Wolf) focuses on consumer emergency response with a nationwide AURA network of 3,000+ responders. **Community Wolf** is WhatsApp-native community intelligence and crime reporting with AI classification. **The CPF App** provides basic GPS incident reporting for Community Policing Forums. **AfriForum** runs 177 safety structures with proprietary communication networks.

**None of these platforms provide operations management.** No one offers structured roll call automation, patrol coordination with checkpoint verification, incident lifecycle management through resolution, or AI-powered pattern detection across historical data. Elijah positions as **"the operating system for community safety"** — not competing with response networks or reporting tools, but providing the coordination layer that makes community safety structures run professionally.

The strongest early adoption path is farm watch communities. They currently rely on fragmented WhatsApp groups, manual radio check-ins, and no historical data analysis. Key unmet needs Elijah addresses: automated roll calls that detect and escalate missed check-ins (currently done manually by a coordinator texting each farm), structured incident tracking for CPF meetings (currently paper or WhatsApp screenshots), and pattern detection across weeks of data that human coordinators miss.

---

## Phased implementation roadmap

### Phase 1 — MVP: "Get safe fast" (weeks 1–6)

Build the minimum feature set that replaces fragmented WhatsApp coordination with structured safety operations. **Target: first pilot community live by week 6.**

**Deliver:** Member registration with POPIA consent flow, Telegram bot with `/checkin` and `/report` commands, automated roll calls with escalation chain (Telegram-only initially), basic incident reporting and tracking, simple dispatcher dashboard showing roll call status and active incidents, basic RLS policies for community isolation.

**Technical build:** 8 Supabase tables (communities, members, incidents, incident_responses, roll_call_sessions, roll_call_responses, notification_logs, escalation_rules), 3 n8n workflows (roll call dispatcher, escalation monitor, Telegram command router), 4 Next.js pages (dashboard, incidents list, members list, settings). **No AI, no WhatsApp, no chat yet.**

**Success metrics:** 80%+ roll call response rate, under 2 minutes from incident report to dispatcher notification, 50+ active members onboarded.

### Phase 2 — Core operations (weeks 7–12)

Full incident lifecycle, patrol management, WhatsApp critical alerts, and the embedded chat system.

**Deliver:** Incident status workflow (reported → acknowledged → responding → resolved → closed) with assignment, patrol scheduling with route checkpoints and Telegram-based verification, WhatsApp Business API integration for critical escalations only, in-app Supabase Realtime chat (community channels + incident-specific channels), member profiles with encrypted sensitive data, photo/document attachments on incidents, PDF report generation for CPF meetings.

**Key risk:** WhatsApp Business API approval takes 2-4 weeks. Apply during Phase 1 development. Telegram remains the reliable fallback.

### Phase 3 — Intelligence layer (weeks 13–16)

AI transforms raw data into actionable intelligence.

**Deliver:** Claude-powered incident triage and classification, voice note transcription (Whisper + Google STT), intelligent SOP recommendations based on incident type, roll call pattern detection (same farm repeatedly missing check-ins), smart escalation with AI-monitored timelines, threat level dashboard based on recent activity patterns.

**POPIA note:** Processing voice notes through external AI APIs constitutes cross-border transfer of special personal information. Require explicit additional consent before enabling voice features. Consider anonymizing transcriptions before sending to Claude (strip names, replace with identifiers).

### Phase 4 — Scale and integrate (weeks 17+)

Advanced analytics with heatmaps and trend analysis, full PWA offline capability with background sync, multi-community management from a single admin view, API for third-party integrations (CCTV systems, vehicle tracking), predictive analytics (high-risk period identification), inter-community alert sharing for threats moving between areas.

---

## Monthly cost model per community

| Component | Low (100 members) | Typical (300 members) | High (500 members) |
|---|---|---|---|
| WhatsApp (critical alerts) | $10–20 | $30–60 | $80–190 |
| Telegram | $0 | $0 | $0 |
| STT (Whisper + Google) | $2–3 | $5 | $8–10 |
| Claude API (Haiku + Sonnet) | $7–10 | $10–15 | $15–25 |
| Supabase (shared across communities) | ~$3–5 share | ~$5–8 share | ~$8–12 share |
| n8n VPS (shared) | ~$2–3 share | ~$3–5 share | ~$4–6 share |
| **Total per community** | **~$24–41** | **~$53–93** | **~$115–243** |

At 10 communities on the platform, total infrastructure runs approximately **$150–250/month** in AI and messaging API costs, plus the fixed Supabase Pro plan (~$25/month) and VPS (~$15–20/month). This SaaS model is economically viable with community subscriptions in the **R500–R2,000/month** range per community, depending on size and features enabled.

## Conclusion

Elijah's architecture leverages every component of the existing CRMM stack while adding precisely the capabilities that South African safety communities need. Three decisions define the platform's economics: Telegram for daily ops eliminates the single largest potential cost center; Claude Haiku's structured output makes AI triage reliable enough for safety-critical classification at ~$10/month per community; and the polling-based escalation architecture in n8n ensures no missed check-in ever falls through the cracks, even if the automation engine restarts.

The **highest-priority pre-development actions** are engaging a POPIA specialist to draft the consent framework and data processing agreements, applying for WhatsApp Business API approval (2-4 week lead time), and identifying 2-3 pilot farm watch communities willing to test the Phase 1 MVP. The sensitive data architecture — separate tables, application-layer encryption, role-gated RLS — addresses both POPIA's requirements and the practical reality that medical conditions and firearms data must never leak into community chat feeds.

The gap in the South African market is clear: existing solutions handle alerting or reporting, but **no platform manages the daily operational rhythm** of community safety — the morning roll calls, the patrol handovers, the escalation chains, the pattern detection that spots a farm going silent before it becomes a crisis. That operational layer is what Elijah builds.