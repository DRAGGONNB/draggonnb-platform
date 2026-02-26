# ELIJAH — Community Safety Operations Platform

## Project Specification for Claude Code

> **Owner:** DraggonnB Business Automation
> **Module:** Vertical SaaS module extending existing CRMM platform
> **Version:** 1.0 — February 2026

---

## 1. PROJECT OVERVIEW

Elijah is an AI-powered community safety operations platform for South African farm watch, neighborhood watch, and rural safety communities. It replaces fragmented WhatsApp groups and manual processes with structured incident management, automated roll calls, patrol coordination, and intelligent escalation chains.

### 1.1 Core Value Proposition

- **Automated Roll Calls** — scheduled check-ins with multi-tier escalation (reminder → buddy → dispatcher → emergency WhatsApp)
- **Incident Management** — AI-triaged incident reporting from voice, text, or web with full lifecycle tracking
- **Patrol Coordination** — shift scheduling, GPS checkpoint verification, handover management
- **Embedded Real-Time Chat** — Slack-like operational chat within the SaaS (no external dependency)
- **Three-Tier Messaging** — in-app chat (free), Telegram bot (free daily ops), WhatsApp API (critical alerts only)
- **AI Intelligence** — Claude-powered triage, pattern detection, SOP recommendations, voice note transcription

### 1.2 Target Users

| Role | Description |
|------|-------------|
| **Admin** | Community leader. Full access. Manages members, SOPs, escalation rules, billing. |
| **Dispatcher** | On-duty coordinator. Dashboard view. Assigns incidents, monitors roll calls, coordinates patrols. |
| **Responder** | Active patrol/response member. Can acknowledge, respond to incidents. Field-level access. |
| **Member** | Household member. Checks in via roll calls, reports incidents, receives alerts. |

---

## 2. TECHNOLOGY STACK

### 2.1 Existing CRMM Stack (DO NOT MODIFY)

```
├── Frontend:     Next.js 14+ (App Router) → deployed on Vercel
├── Database:     Supabase (PostgreSQL + Auth + Realtime + Storage)
├── Automation:   n8n (self-hosted on VPS, queue mode with Redis)
├── AI:           Claude API (already integrated in CRMM)
├── Payments:     PayFast (South African gateway)
└── Auth:         Supabase Auth (email + magic link)
```

### 2.2 New Dependencies for Elijah

```
├── Telegram Bot API        — daily operations messaging (FREE)
├── WhatsApp Cloud API      — critical alerts only (Meta direct, ~$0.0076/msg SA)
├── OpenAI Whisper API      — English speech-to-text ($0.006/min)
├── Google Cloud STT Chirp  — Afrikaans speech-to-text ($0.016/min)
├── Claude Haiku 4.5        — real-time AI triage ($1/$5 per MTok)
├── Claude Sonnet 4.5       — batch pattern analysis (50% off via Batch API)
└── Supabase Realtime       — embedded chat (Broadcast + Presence)
```

### 2.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  USERS: Farmers, Patrol Members, Dispatchers, Admins    │
│  Channels: PWA Dashboard │ Telegram Bot │ WhatsApp      │
└────────┬──────────────────┬───────────────┬─────────────┘
         │                  │               │
         ▼                  ▼               ▼
┌─────────────────┐  ┌───────────┐  ┌──────────────────┐
│  Next.js on     │  │  n8n on   │  │  Supabase        │
│  Vercel (PWA)   │  │  VPS      │  │  (PostgreSQL +   │
│  - Dashboard    │◄─┤  - Cron   │─►│   Auth + RT +    │
│  - Chat (RT)    │  │  - Webhooks│  │   Storage)       │
│  - Incident UI  │  │  - Claude │  │  - RLS policies  │
│  - Patrol view  │  │  - STT    │  │  - Realtime      │
│  - PWA offline  │  │  - Escal. │  │    broadcast     │
└─────────────────┘  └─────┬─────┘  └──────────────────┘
                           │
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

---

## 3. PROJECT STRUCTURE

```
elijah/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    # Sidebar + topbar shell
│   │   │   ├── page.tsx                      # Dispatcher dashboard (default)
│   │   │   ├── incidents/
│   │   │   │   ├── page.tsx                  # Incident list with filters
│   │   │   │   ├── [id]/page.tsx             # Incident detail + activity log
│   │   │   │   └── new/page.tsx              # Report incident form
│   │   │   ├── roll-call/
│   │   │   │   ├── page.tsx                  # Roll call sessions list
│   │   │   │   ├── [id]/page.tsx             # Session detail + response grid
│   │   │   │   └── configure/page.tsx        # Schedule + escalation rules
│   │   │   ├── patrols/
│   │   │   │   ├── page.tsx                  # Active + scheduled patrols
│   │   │   │   ├── [id]/page.tsx             # Patrol detail + checkpoint log
│   │   │   │   ├── routes/page.tsx           # Route management
│   │   │   │   └── new/page.tsx              # Create patrol session
│   │   │   ├── members/
│   │   │   │   ├── page.tsx                  # Member directory
│   │   │   │   ├── [id]/page.tsx             # Member profile
│   │   │   │   └── invite/page.tsx           # Invite + POPIA consent
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx                  # Channel list
│   │   │   │   └── [channelId]/page.tsx      # Chat room (Realtime)
│   │   │   ├── sops/
│   │   │   │   ├── page.tsx                  # SOP library
│   │   │   │   ├── [id]/page.tsx             # SOP detail/edit
│   │   │   │   └── new/page.tsx              # Create SOP
│   │   │   └── settings/
│   │   │       ├── page.tsx                  # General community settings
│   │   │       ├── escalation/page.tsx       # Escalation rule builder
│   │   │       ├── messaging/page.tsx        # Telegram/WhatsApp config
│   │   │       └── popia/page.tsx            # POPIA consent management
│   │   └── api/
│   │       ├── webhooks/
│   │       │   ├── telegram/route.ts         # Telegram bot webhook handler
│   │       │   └── whatsapp/route.ts         # WhatsApp webhook handler
│   │       ├── incidents/
│   │       │   ├── route.ts                  # CRUD
│   │       │   └── [id]/
│   │       │       ├── route.ts              # Get/update incident
│   │       │       ├── respond/route.ts      # Add response/update status
│   │       │       └── triage/route.ts       # Trigger AI triage
│   │       ├── roll-call/
│   │       │   ├── route.ts                  # Create/list sessions
│   │       │   ├── [id]/route.ts             # Session detail
│   │       │   └── check-in/route.ts         # Process check-in (from any channel)
│   │       ├── patrols/
│   │       │   ├── route.ts                  # CRUD
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── checkpoint/route.ts   # Log checkpoint
│   │       ├── chat/
│   │       │   ├── channels/route.ts         # Create/list channels
│   │       │   └── messages/route.ts         # Send message (persists + broadcasts)
│   │       ├── ai/
│   │       │   ├── triage/route.ts           # Claude incident classification
│   │       │   ├── transcribe/route.ts       # Voice note STT pipeline
│   │       │   └── analyze/route.ts          # Pattern analysis endpoint
│   │       └── notifications/
│   │           └── route.ts                  # Multi-channel notification router
│   ├── components/
│   │   ├── ui/                               # shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── KPICards.tsx                   # Active incidents, missed check-ins, etc.
│   │   │   ├── IncidentFeed.tsx              # Live incident list (Realtime)
│   │   │   ├── RollCallStatus.tsx            # Current session status grid
│   │   │   ├── PatrolMap.tsx                 # Active patrols on map
│   │   │   └── ThreatLevelBanner.tsx         # Community threat level indicator
│   │   ├── incidents/
│   │   │   ├── IncidentCard.tsx
│   │   │   ├── IncidentForm.tsx
│   │   │   ├── IncidentTimeline.tsx          # Activity log timeline
│   │   │   ├── SeverityBadge.tsx
│   │   │   └── AITriagePanel.tsx             # Shows AI classification + confidence
│   │   ├── roll-call/
│   │   │   ├── ResponseGrid.tsx              # Visual grid of check-in status
│   │   │   ├── EscalationTimeline.tsx
│   │   │   └── RollCallScheduler.tsx
│   │   ├── patrols/
│   │   │   ├── PatrolCard.tsx
│   │   │   ├── CheckpointList.tsx
│   │   │   ├── RouteEditor.tsx               # Drag-and-drop checkpoint ordering
│   │   │   └── ShiftHandover.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx                # Main chat container
│   │   │   ├── MessageList.tsx               # Virtual scrolling message list
│   │   │   ├── MessageInput.tsx              # Text + voice + image input
│   │   │   ├── ChannelSidebar.tsx            # Channel list with unread counts
│   │   │   ├── PresenceIndicator.tsx         # Online/offline dots
│   │   │   └── VoiceRecorder.tsx             # In-app voice note recording
│   │   ├── members/
│   │   │   ├── MemberCard.tsx
│   │   │   ├── MemberForm.tsx
│   │   │   ├── BuddySelector.tsx
│   │   │   └── SensitiveDataPanel.tsx        # Role-gated sensitive info
│   │   └── shared/
│   │       ├── Sidebar.tsx                   # Main navigation sidebar
│   │       ├── TopBar.tsx                    # Community selector + user menu
│   │       ├── MapView.tsx                   # Reusable map component
│   │       ├── NotificationToast.tsx         # Real-time notification toasts
│   │       ├── OfflineBanner.tsx             # Connectivity status
│   │       └── PrioritySelector.tsx          # Severity/priority picker
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                     # Browser Supabase client
│   │   │   ├── server.ts                     # Server Supabase client
│   │   │   ├── admin.ts                      # Service role client (bypasses RLS)
│   │   │   ├── realtime.ts                   # Realtime channel helpers
│   │   │   └── types.ts                      # Generated DB types (supabase gen types)
│   │   ├── ai/
│   │   │   ├── triage.ts                     # Claude triage prompt + structured output
│   │   │   ├── transcribe.ts                 # STT pipeline (Whisper + Google routing)
│   │   │   ├── analyze.ts                    # Pattern analysis prompts
│   │   │   └── sop-matcher.ts                # SOP recommendation logic
│   │   ├── messaging/
│   │   │   ├── telegram.ts                   # Telegram Bot API client
│   │   │   ├── whatsapp.ts                   # WhatsApp Cloud API client
│   │   │   └── router.ts                     # Multi-channel notification routing
│   │   ├── escalation/
│   │   │   ├── engine.ts                     # Escalation rule evaluation
│   │   │   └── actions.ts                    # Escalation action handlers
│   │   └── utils/
│   │       ├── crypto.ts                     # App-layer encryption for sensitive data
│   │       ├── geolocation.ts                # Distance calculations, geofencing
│   │       ├── timezone.ts                   # SAST helpers
│   │       └── offline.ts                    # Service worker + background sync
│   ├── hooks/
│   │   ├── useRealtimeChannel.ts             # Generic Realtime subscription hook
│   │   ├── usePresence.ts                    # Presence tracking hook
│   │   ├── useCommunity.ts                   # Current community context
│   │   ├── useIncidents.ts                   # Incident data + real-time updates
│   │   ├── useRollCall.ts                    # Roll call status + real-time
│   │   ├── useChat.ts                        # Chat messages + send + typing indicators
│   │   └── useNotifications.ts               # Push notification management
│   └── types/
│       ├── database.ts                       # Supabase generated types
│       ├── incidents.ts                      # Incident-specific types
│       ├── roll-call.ts
│       ├── patrols.ts
│       ├── chat.ts
│       └── ai.ts                             # AI triage response types
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_enums.sql
│   │   ├── 002_create_communities.sql
│   │   ├── 003_create_community_members.sql
│   │   ├── 004_create_member_sensitive_data.sql
│   │   ├── 005_create_incidents.sql
│   │   ├── 006_create_incident_responses.sql
│   │   ├── 007_create_roll_call_sessions.sql
│   │   ├── 008_create_roll_call_responses.sql
│   │   ├── 009_create_patrol_routes.sql
│   │   ├── 010_create_patrol_sessions.sql
│   │   ├── 011_create_patrol_checkpoint_logs.sql
│   │   ├── 012_create_sops.sql
│   │   ├── 013_create_checklists.sql
│   │   ├── 014_create_chat_channels.sql
│   │   ├── 015_create_chat_channel_members.sql
│   │   ├── 016_create_chat_messages.sql
│   │   ├── 017_create_escalation_rules.sql
│   │   ├── 018_create_notification_logs.sql
│   │   ├── 019_create_rls_helper_functions.sql
│   │   ├── 020_enable_rls_all_tables.sql
│   │   ├── 021_create_rls_policies.sql
│   │   ├── 022_create_realtime_triggers.sql
│   │   └── 023_create_indexes.sql
│   ├── seed.sql                              # Demo community + members for dev
│   └── config.toml
├── n8n-workflows/
│   ├── README.md                             # Workflow documentation
│   ├── roll-call-dispatcher.json             # Scheduled roll call send
│   ├── roll-call-escalation-monitor.json     # Polling escalation checker
│   ├── roll-call-checkin-handler.json         # Telegram callback handler
│   ├── incident-intake.json                  # Multi-channel incident processing
│   ├── incident-ai-triage.json               # Claude classification sub-workflow
│   ├── incident-sla-monitor.json             # SLA breach detection
│   ├── telegram-command-router.json          # Single webhook → command routing
│   ├── whatsapp-webhook-handler.json         # WA webhook → incident/check-in
│   ├── notification-router.json              # Multi-channel send sub-workflow
│   ├── voice-transcription.json              # STT pipeline with language routing
│   ├── weekly-pattern-analysis.json          # Claude Sonnet batch analysis
│   └── global-error-handler.json             # Error capture + ops alerting
├── public/
│   ├── manifest.json                         # PWA manifest
│   ├── sw.js                                 # Service worker for offline
│   └── icons/                                # PWA icons
├── .env.local.example
├── .env.production.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── ELIJAH-PROJECT.md                         # THIS FILE
```

---

## 4. DATABASE SCHEMA

### 4.1 Multi-Tenancy Model

**Shared database with Row-Level Security (RLS).** All Elijah tables include a `community_id` column. RLS policies restrict access to rows matching the authenticated user's community memberships. The `communities` table references the CRMM's existing `organizations` table via `organization_id`.

### 4.2 RLS Performance Rules (CRITICAL)

1. **Always wrap `auth.uid()` in `(SELECT auth.uid())`** — caches per statement, not per row. 100x+ improvement on large tables.
2. **Create helper functions** — `user_community_ids()` and `user_community_role(community_id)` as `SECURITY DEFINER STABLE` functions.
3. **Index every column referenced in RLS WHERE clauses** — especially `community_id`, `user_id`, `channel_id`.
4. **Use `EXISTS` subqueries over `IN`** for join-based policies (e.g., chat channel membership).

### 4.3 Custom Types

```sql
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

### 4.4 Table Definitions

#### communities

```sql
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  threat_level TEXT DEFAULT 'normal' CHECK (threat_level IN ('normal','elevated','high','critical')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_communities_org ON communities(organization_id);
```

#### community_members

```sql
CREATE TABLE community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role community_role NOT NULL DEFAULT 'member',
  display_name TEXT NOT NULL,
  phone TEXT,
  telegram_chat_id TEXT,
  whatsapp_number TEXT,
  property_name TEXT,
  property_location POINT,
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
```

#### member_sensitive_data

```sql
CREATE TABLE member_sensitive_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id),
  medical_conditions TEXT,       -- encrypt at app layer
  medical_notes TEXT,
  blood_type TEXT,
  firearms_registered JSONB,     -- encrypt: [{type, license_no, caliber}]
  vehicles JSONB,                -- [{make, model, color, registration}]
  access_level community_role DEFAULT 'dispatcher',
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_msd_member ON member_sensitive_data(member_id);
```

#### incidents

```sql
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
  ai_triage JSONB,
  ai_confidence NUMERIC(3,2),
  assigned_to UUID REFERENCES community_members(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  sla_acknowledge_by TIMESTAMPTZ,
  sla_resolve_by TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_incidents_community ON incidents(community_id);
CREATE INDEX idx_incidents_status ON incidents(community_id, status);
CREATE INDEX idx_incidents_severity ON incidents(community_id, severity);
CREATE INDEX idx_incidents_created ON incidents(community_id, created_at DESC);
```

#### incident_responses

```sql
CREATE TABLE incident_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  responder_id UUID REFERENCES community_members(id),
  action TEXT NOT NULL,  -- 'acknowledged','dispatched','arrived','note','escalated','resolved'
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ir_incident ON incident_responses(incident_id, created_at);
```

#### roll_call_sessions

```sql
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
```

#### roll_call_responses

```sql
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
```

#### patrol_routes

```sql
CREATE TABLE patrol_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  name TEXT NOT NULL,
  description TEXT,
  checkpoints JSONB NOT NULL DEFAULT '[]',
  estimated_duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### patrol_sessions

```sql
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
```

#### patrol_checkpoint_logs

```sql
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
```

#### sops

```sql
CREATE TABLE sops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  severity_applicability incident_severity[],
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  created_by UUID REFERENCES community_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sops_community ON sops(community_id, category);
```

#### checklists

```sql
CREATE TABLE checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  sop_id UUID REFERENCES sops(id),
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  context TEXT CHECK (context IN ('patrol','incident','shift_handover','general')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### chat_channels

```sql
CREATE TABLE chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  name TEXT NOT NULL,
  channel_type channel_type DEFAULT 'general',
  linked_incident_id UUID REFERENCES incidents(id),
  linked_patrol_id UUID REFERENCES patrol_sessions(id),
  is_restricted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cc_community ON chat_channels(community_id);
```

#### chat_channel_members

```sql
CREATE TABLE chat_channel_members (
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  member_id UUID REFERENCES community_members(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (channel_id, member_id)
);
```

#### chat_messages

```sql
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES community_members(id),
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_msgs_channel ON chat_messages(channel_id, created_at DESC);
```

#### escalation_rules

```sql
CREATE TABLE escalation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  context TEXT NOT NULL CHECK (context IN ('roll_call','incident','patrol')),
  escalation_level escalation_level NOT NULL,
  delay_minutes INT NOT NULL,
  action TEXT NOT NULL,
  notification_channels notification_channel[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### notification_logs

```sql
CREATE TABLE notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id),
  recipient_id UUID REFERENCES community_members(id),
  channel notification_channel NOT NULL,
  priority incident_severity DEFAULT 'medium',
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued','sent','delivered','read','failed')),
  external_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);
CREATE INDEX idx_nl_community ON notification_logs(community_id, sent_at DESC);
CREATE INDEX idx_nl_recipient ON notification_logs(recipient_id);
```

### 4.5 RLS Helper Functions

```sql
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
```

### 4.6 RLS Policy Patterns

Apply these patterns to ALL tables:

```sql
-- READ: community members see their community's data
CREATE POLICY "{table}_read" ON {table} FOR SELECT TO authenticated
USING (community_id IN (SELECT user_community_ids()));

-- INSERT: community members can insert into their community
CREATE POLICY "{table}_insert" ON {table} FOR INSERT TO authenticated
WITH CHECK (community_id IN (SELECT user_community_ids()));

-- UPDATE: admin/dispatcher/responder roles only
CREATE POLICY "{table}_update" ON {table} FOR UPDATE TO authenticated
USING (
  community_id IN (SELECT user_community_ids())
  AND user_community_role(community_id) IN ('admin', 'dispatcher', 'responder')
);

-- SENSITIVE DATA: role-gated access
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

-- CHAT: channel membership check
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

### 4.7 Realtime Broadcast Trigger

```sql
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
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION broadcast_chat_message();
```

---

## 5. AI AGENT SPECIFICATIONS

### 5.1 Incident Triage (Claude Haiku 4.5)

**System Prompt** (cache with prompt caching):

```
You are Elijah's incident triage AI for South African community safety operations.
You classify incoming incident reports from farm watch and neighborhood watch communities.

CONTEXT: Rural South Africa. Threats include farm attacks, livestock theft, cable theft,
suspicious vehicles, veld fires, and infrastructure damage. Communities are organized
as farm watches with dispersed properties.

Classify each report and respond ONLY with valid JSON matching this schema:
{
  "incident_type": one of [break_in, theft, suspicious_vehicle, suspicious_person,
    fire, medical_emergency, livestock_issue, fence_damage, road_blockage,
    power_outage, communication_failure, wildlife_threat, flooding,
    missing_person, gunshots_heard, other],
  "severity": one of [critical, high, medium, low],
  "summary": "concise 1-sentence summary",
  "suggested_actions": ["action1", "action2"],
  "sop_lookup_recommended": boolean,
  "sop_category": "category string or null",
  "follow_up_required": boolean,
  "follow_up_timeframe_minutes": number or null,
  "confidence": 0.0 to 1.0
}

SEVERITY RULES:
- CRITICAL: Active threat to life (gunshots, break-in in progress, fire near structures, medical emergency)
- HIGH: Imminent threat (suspicious persons on property, alarm activation, livestock attack in progress)
- MEDIUM: Potential threat (suspicious vehicle, fence cut discovered, unusual activity)
- LOW: Informational (power outage, road condition, wildlife sighting, non-urgent maintenance)
```

**API Call Pattern:**

```typescript
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 500,
  system: TRIAGE_SYSTEM_PROMPT, // cached
  messages: [{ role: "user", content: `Classify this incident report:\n\n${reportText}` }],
});
```

### 5.2 Voice Note Transcription Pipeline

```
Voice note received (OGG/Opus from Telegram/WhatsApp)
  │
  ├─ Quick language detection (Whisper auto-detect first 10 sec)
  │
  ├─ IF English → OpenAI Whisper API ($0.006/min)
  │
  └─ IF Afrikaans → Google Cloud STT Chirp ($0.016/min)
      (Whisper misidentifies Afrikaans as Dutch — unusable)
  │
  └─ Transcription text → Claude Haiku triage pipeline
```

### 5.3 Fallback When AI Unavailable

```typescript
// If Claude API fails, use keyword-based fallback
const CRITICAL_KEYWORDS = ['gun', 'shot', 'fire', 'attack', 'help', 'emergency', 'break-in', 'intruder'];
const HIGH_KEYWORDS = ['alarm', 'suspicious', 'theft', 'stolen', 'fence cut', 'trespass'];

function fallbackTriage(text: string): TriageResult {
  const lower = text.toLowerCase();
  if (CRITICAL_KEYWORDS.some(k => lower.includes(k))) {
    return { severity: 'critical', incident_type: 'other', confidence: 0.3, summary: text.slice(0, 100) };
  }
  if (HIGH_KEYWORDS.some(k => lower.includes(k))) {
    return { severity: 'high', incident_type: 'other', confidence: 0.3, summary: text.slice(0, 100) };
  }
  return { severity: 'medium', incident_type: 'other', confidence: 0.1, summary: text.slice(0, 100) };
}
```

---

## 6. N8N WORKFLOW SPECIFICATIONS

### 6.1 Environment Configuration

```env
GENERIC_TIMEZONE=Africa/Johannesburg
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=localhost
N8N_METRICS=true
```

### 6.2 Workflow Index

| # | Workflow | Trigger | Description |
|---|---------|---------|-------------|
| 1 | roll-call-dispatcher | Schedule (cron per community) | Sends roll call via Telegram, creates response records |
| 2 | roll-call-escalation-monitor | Schedule (every 5 min) | Polls pending responses, escalates by tier |
| 3 | roll-call-checkin-handler | Telegram Trigger (callback_query) | Processes ✅ button taps |
| 4 | incident-intake | Webhook (Telegram + WhatsApp) | Normalizes incoming reports from all channels |
| 5 | incident-ai-triage | Sub-workflow | Downloads voice → STT → Claude classify → update incident |
| 6 | incident-sla-monitor | Schedule (every 5 min) | Checks SLA breaches on open incidents |
| 7 | telegram-command-router | Telegram Trigger | Routes /checkin, /report, /patrol, /sos, /status |
| 8 | whatsapp-webhook-handler | Webhook | Processes incoming WA messages → incident or check-in |
| 9 | notification-router | Sub-workflow | Multi-channel send with fallback logic |
| 10 | voice-transcription | Sub-workflow | Language detection → Whisper/Google STT routing |
| 11 | weekly-pattern-analysis | Schedule (Sunday 8pm) | Claude Sonnet batch analysis of weekly data |
| 12 | global-error-handler | Error Trigger | Captures all workflow failures → alerts ops channel |

### 6.3 Roll Call Escalation Flow (Workflow #2 Detail)

```
Schedule Trigger (every 5 min)
  │
  ├─ Supabase: SELECT * FROM roll_call_responses
  │    WHERE status = 'pending' AND session.status = 'active'
  │
  ├─ FOR EACH pending response:
  │   │
  │   ├─ Calculate: elapsed = now() - sent_at
  │   │
  │   ├─ Switch by escalation_level:
  │   │
  │   │   ├─ 'none' AND elapsed > 30min:
  │   │   │   → Send Telegram reminder to member
  │   │   │   → UPDATE escalation_level = 'reminder', reminder_sent_at = now()
  │   │   │
  │   │   ├─ 'reminder' AND elapsed > 45min:
  │   │   │   → Send Telegram alert to buddy_member_id
  │   │   │   → UPDATE escalation_level = 'buddy', buddy_notified_at = now()
  │   │   │
  │   │   ├─ 'buddy' AND elapsed > 60min:
  │   │   │   → Insert incident (welfare_check, auto-created from missed roll call)
  │   │   │   → Supabase Realtime notification to dispatcher dashboard
  │   │   │   → UPDATE escalation_level = 'dispatcher', dispatcher_alerted_at = now()
  │   │   │
  │   │   └─ 'dispatcher' AND elapsed > 90min:
  │   │       → WhatsApp critical alert to member's emergency_contacts
  │   │       → WhatsApp alert to all community dispatchers
  │   │       → UPDATE escalation_level = 'critical', critical_alert_sent_at = now()
  │   │       → UPDATE status = 'escalated'
  │
  └─ Log all actions to notification_logs
```

### 6.4 Telegram Bot Commands

| Command | Description | Implementation |
|---------|-------------|----------------|
| `/start` | Register / link account | Stores telegram_chat_id on community_member |
| `/checkin` | Respond SAFE to active roll call | Updates roll_call_responses.status = 'safe' |
| `/checkin [note]` | Check in with situation note | Same + stores response_note |
| `/report [description]` | Report incident from Telegram | Creates incident, triggers AI triage |
| `/sos` | Emergency alert (CRITICAL) | Creates critical incident, alerts all dispatchers via all channels |
| `/patrol start` | Begin patrol shift | Updates patrol_session.status = 'active' |
| `/patrol checkpoint [n]` | Log checkpoint arrival | Creates patrol_checkpoint_log |
| `/patrol end [notes]` | End patrol shift | Updates status + handover_notes |
| `/status` | View personal status | Shows active incidents, next roll call, patrol schedule |

### 6.5 WhatsApp Template Messages (Pre-approved)

```
Template: emergency_alert
Category: UTILITY
Body: 🚨 EMERGENCY ALERT — {{community_name}}
  {{incident_type}}: {{summary}}
  Location: {{location}}
  Reply 1 to ACKNOWLEDGE | Reply 2 for DETAILS

Template: welfare_check
Category: UTILITY
Body: ⚠️ WELFARE CHECK — {{community_name}}
  {{member_name}} at {{property_name}} has not responded to roll call.
  Buddy system activated.
  Reply SAFE if you have confirmed their safety.

Template: escalation_notice
Category: UTILITY
Body: 🔴 CRITICAL ESCALATION — {{community_name}}
  {{member_name}} at {{property_name}} has not been reached after {{minutes}} minutes.
  Emergency contacts being notified.
  Reply if you have information.
```

---

## 7. REAL-TIME CHAT IMPLEMENTATION

### 7.1 Architecture Pattern

Use **Supabase Realtime Broadcast + Presence** (NOT Postgres Changes). Postgres Changes processes on a single thread — 100 subscribers × 1 insert = 100 RLS evaluations. Broadcast avoids this entirely.

**Flow:**
1. Client inserts message into `chat_messages` table
2. Database trigger calls `realtime.send()` to broadcast
3. All channel subscribers receive via WebSocket instantly
4. Presence tracks online/offline status

### 7.2 Client Hook Pattern

```typescript
// hooks/useChat.ts
export function useChat(channelId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const supabase = createClient();

  useEffect(() => {
    // Load initial messages
    loadMessages(channelId);

    // Subscribe to realtime
    const channel = supabase.channel(`chat:${channelId}`, {
      config: { private: true }
    });

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      })
      .on('presence', { event: 'sync' }, () => {
        setOnlineUsers(channel.presenceState());
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUser.id, status: 'online' });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  const sendMessage = async (content: string, type: message_type = 'text') => {
    await supabase.from('chat_messages').insert({
      channel_id: channelId,
      sender_id: currentMember.id,
      content,
      message_type: type,
    });
  };

  return { messages, onlineUsers, sendMessage };
}
```

### 7.3 Auto-Channel Creation

Automatically create chat channels for:
- Each new community → `#general` (all members) + `#dispatch` (admin/dispatcher only)
- Each new incident → `#incident-{id}` (assigned responders + dispatchers)
- Each new patrol session → `#patrol-{id}` (assigned patrol member + dispatchers)

### 7.4 Reconnection Handling

Realtime does NOT guarantee delivery. On reconnect, fetch missed messages:

```typescript
const lastMessageTime = messages[messages.length - 1]?.created_at;
const { data } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('channel_id', channelId)
  .gt('created_at', lastMessageTime)
  .order('created_at', { ascending: true });
```

---

## 8. ENVIRONMENT VARIABLES

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (Whisper STT)
OPENAI_API_KEY=sk-...

# Google Cloud (Afrikaans STT)
GOOGLE_CLOUD_PROJECT_ID=elijah-stt
GOOGLE_CLOUD_KEY_JSON={"type":"service_account",...}

# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABC...
TELEGRAM_WEBHOOK_SECRET=random-secret-string

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify-token
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321

# n8n
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://elijah.draggonnb.com
ENCRYPTION_KEY=32-byte-hex-key-for-sensitive-data
```

---

## 9. UI/UX DESIGN SYSTEM

### 9.1 Design Tokens

Based on the Elijah UI preview HTML. Dark theme, dispatcher-optimized.

```css
:root {
  --bg: #0b1220;
  --panel: #0f1a2e;
  --panel2: #0c1528;
  --text: #e8eefc;
  --muted: #9db0d0;
  --line: #1c2a46;
  --accent: #7dd3fc;
  --danger: #fb7185;
  --warn: #fbbf24;
  --ok: #34d399;
  --chip: #162545;
  --radius: 14px;
}
```

### 9.2 Tailwind Config Extension

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        elijah: {
          bg: '#0b1220',
          panel: '#0f1a2e',
          panel2: '#0c1528',
          text: '#e8eefc',
          muted: '#9db0d0',
          line: '#1c2a46',
          accent: '#7dd3fc',
          danger: '#fb7185',
          warn: '#fbbf24',
          ok: '#34d399',
          chip: '#162545',
        }
      },
      borderRadius: {
        'elijah': '14px',
      }
    }
  }
}
```

### 9.3 Component Library

Use **shadcn/ui** components with the Elijah dark theme applied. Key customizations:
- All cards: `bg-elijah-panel border-elijah-line rounded-elijah`
- Severity badges: danger (red), warn (amber), ok (green), neutral (accent blue)
- Mobile-first: sidebar collapses to bottom nav on mobile
- Touch targets: minimum 44x44px for all interactive elements

### 9.4 Dashboard Layout

```
┌──────────┬────────────────────────────────────────┐
│          │  Dispatcher Dashboard                   │
│  S       │  [Community] · [Section]                │
│  I       ├────────────────────────────────────────┤
│  D       │  KPI Cards (4-up grid)                 │
│  E       │  [Active] [Missed] [Patrols] [Avg ACK] │
│  B       ├──────────────────┬─────────────────────┤
│  A       │  Active Incidents│  Roll Call Exceptions│
│  R       │  (live feed)     │  (live status grid)  │
│          │                  │                      │
│  Nav     │                  │                      │
│          ├──────────────────┴─────────────────────┤
│          │  Recent Activity Feed (timeline)        │
└──────────┴────────────────────────────────────────┘
```

---

## 10. PHASED BUILD PLAN

### Phase 1 — MVP: "Get Safe Fast" (Weeks 1–6)

**Goal:** Replace fragmented WhatsApp coordination. First pilot community live by week 6.

**Week 1–2: Foundation**
- [ ] Supabase migrations: enums, communities, community_members, incidents, incident_responses, roll_call_sessions, roll_call_responses, escalation_rules, notification_logs
- [ ] RLS helper functions + policies for all Phase 1 tables
- [ ] Seed data for development
- [ ] Next.js project setup with Elijah route group
- [ ] Supabase client/server/admin lib setup
- [ ] Auth flow: login + community selection
- [ ] Sidebar + layout shell with navigation

**Week 3–4: Core Features**
- [ ] Member management: list, view, invite with POPIA consent
- [ ] Incident reporting: form + list + detail view
- [ ] Telegram bot setup: `/start`, `/checkin`, `/report`, `/sos`
- [ ] n8n workflow: telegram-command-router
- [ ] n8n workflow: roll-call-dispatcher (Telegram send)
- [ ] n8n workflow: roll-call-escalation-monitor (polling)
- [ ] n8n workflow: roll-call-checkin-handler (callback)

**Week 5–6: Dashboard + Polish**
- [ ] Dispatcher dashboard with KPI cards
- [ ] Live incident feed (Supabase Realtime Postgres Changes — simple for Phase 1)
- [ ] Roll call status grid with real-time updates
- [ ] n8n workflow: notification-router (Telegram only in Phase 1)
- [ ] n8n workflow: global-error-handler
- [ ] Mobile responsive polish
- [ ] Pilot community onboarding

**Phase 1 Success Metrics:**
- 80%+ roll call response rate
- < 2 minutes from incident report to dispatcher notification
- 50+ active members onboarded

---

### Phase 2 — Core Operations (Weeks 7–12)

**Goal:** Full incident lifecycle, patrols, WhatsApp, embedded chat.

- [ ] Incident lifecycle: status workflow (reported → acknowledged → responding → resolved → closed)
- [ ] Incident assignment + SLA monitoring
- [ ] n8n workflow: incident-sla-monitor
- [ ] Patrol tables migration: routes, sessions, checkpoint_logs
- [ ] Patrol UI: scheduling, route management, checkpoint logging
- [ ] Telegram patrol commands: `/patrol start`, `/patrol checkpoint`, `/patrol end`
- [ ] WhatsApp Business API setup + template approval
- [ ] n8n workflow: whatsapp-webhook-handler
- [ ] WhatsApp critical alert integration in escalation chain
- [ ] Chat tables migration: channels, members, messages
- [ ] Embedded chat: Supabase Realtime Broadcast + Presence
- [ ] Chat UI: channel list, message list, input, presence indicators
- [ ] Auto-channel creation for incidents and patrols
- [ ] Member sensitive data: encrypted storage, role-gated access
- [ ] Photo/document attachments on incidents
- [ ] PDF report generation for CPF meetings

---

### Phase 3 — Intelligence Layer (Weeks 13–16)

**Goal:** AI transforms raw data into actionable intelligence.

- [ ] Claude Haiku triage integration
- [ ] n8n workflow: incident-ai-triage
- [ ] AI triage panel in incident detail UI
- [ ] Voice note transcription pipeline (Whisper + Google STT)
- [ ] n8n workflow: voice-transcription
- [ ] SOP table migration + CRUD UI
- [ ] AI SOP recommendation based on incident type
- [ ] Roll call pattern detection (AI identifies at-risk members)
- [ ] Smart escalation with AI-monitored timelines
- [ ] Threat level dashboard based on recent activity
- [ ] n8n workflow: weekly-pattern-analysis (Sonnet Batch)

---

### Phase 4 — Scale & Integrate (Weeks 17+)

- [ ] Full PWA offline mode with service worker + background sync
- [ ] Analytics: heatmaps, trend analysis, incident frequency charts
- [ ] Multi-community admin view
- [ ] API for third-party integrations (CCTV, vehicle tracking)
- [ ] Inter-community alert sharing
- [ ] Predictive analytics (high-risk period identification)
- [ ] Data-saver mode for rural connectivity
- [ ] Checklist execution UI linked to SOPs

---

## 11. POPIA COMPLIANCE REQUIREMENTS

### 11.1 Launch Blockers

- [ ] Register Information Officer with Information Regulator
- [ ] Publish POPIA-compliant privacy policy
- [ ] Granular consent collection during member registration:
  - Basic data processing consent
  - Cross-border data transfer consent (Supabase cloud)
  - Voice note processing consent (STT via external APIs)
  - Special personal information consent (medical, firearms)
- [ ] Data processing agreement with Supabase
- [ ] Data breach response plan with SCN1 notification template
- [ ] App-layer encryption for sensitive data (medical, firearms)

### 11.2 Consent Collection Flow

During member registration:
1. POPIA notice explaining data processing purposes
2. Checkbox: consent to basic data processing
3. Checkbox: consent to cross-border transfer (explain: cloud hosting)
4. Checkbox: consent to sensitive data (medical/firearms) — OPTIONAL
5. Checkbox: consent to voice note AI processing — OPTIONAL
6. Store consent records with timestamps in `member_consents` table

### 11.3 Data Retention

- Incident data: retain for 3 years (CPF reporting requirements)
- Chat messages: retain for 1 year, then archive
- Voice note audio files: delete after transcription + 30 day review period
- Notification logs: retain for 6 months
- Personal data: delete within 30 days of member deactivation request

---

## 12. TESTING REQUIREMENTS

### 12.1 Critical Path Tests

- [ ] Roll call → missed check-in → escalation through all tiers → WhatsApp critical alert
- [ ] Telegram `/report` → incident created → AI triage → dispatcher notified
- [ ] Voice note → STT transcription → AI classification → structured incident
- [ ] Chat message sent → broadcast received by all channel members
- [ ] RLS: member A cannot see community B's data
- [ ] RLS: member cannot see dispatcher-level sensitive data
- [ ] Offline: incident report queued → synced on reconnect
- [ ] n8n restart: escalation monitor resumes correctly from database state

### 12.2 Load Testing

- 500 concurrent Realtime subscribers on a single community
- 100 simultaneous roll call check-ins via Telegram
- 50 concurrent chat messages across 10 channels

---

## 13. DEPLOYMENT

### 13.1 Vercel (Frontend)

```
Framework: Next.js
Build Command: next build
Output Directory: .next
Node.js Version: 20.x
Environment Variables: all NEXT_PUBLIC_* + server-side keys
Domain: elijah.draggonnb.com
```

### 13.2 Supabase

- Project: shared with existing CRMM
- Run migrations in order: `supabase db push`
- Enable Realtime on: `chat_messages`, `incidents`, `roll_call_responses`
- Configure Realtime authorization policies

### 13.3 n8n (Self-Hosted VPS)

```
VPS: 2+ vCPUs, 4GB+ RAM
Mode: Queue (Redis + PostgreSQL)
Timezone: Africa/Johannesburg
Webhook URL: https://n8n.yourdomain.com
Import workflows from: /n8n-workflows/*.json
```

### 13.4 Telegram Bot Setup

1. Create bot via @BotFather
2. Set webhook: `POST https://api.telegram.org/bot{token}/setWebhook?url={n8n_webhook_url}`
3. Set bot commands via @BotFather for menu display
4. Enable inline keyboard support

### 13.5 WhatsApp Business API Setup

1. Create Meta Business account + WhatsApp Business app
2. Add phone number + verify
3. Submit template messages for approval (utility category)
4. Configure webhook URL pointing to n8n
5. Subscribe to messages webhook field

---

## 14. KEY TECHNICAL DECISIONS LOG

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenancy | Shared DB + RLS | Simpler ops, existing CRMM pattern, good enough for <100 communities |
| Chat architecture | Broadcast + Presence (not Postgres Changes) | Avoids per-subscriber RLS evaluation bottleneck |
| Escalation pattern | Polling (5-min cron) not Wait nodes | Stateless, survives n8n restarts, debuggable |
| WhatsApp provider | Meta Cloud API direct | Zero platform fees, cheapest per-message, native n8n node |
| Afrikaans STT | Google Cloud not Whisper | Whisper misidentifies Afrikaans as Dutch |
| AI model for triage | Haiku 4.5 not Sonnet | Fast enough, 5x cheaper, structured output reliable |
| Sensitive data | Separate table + app-layer encryption | POPIA compliance, role-gated RLS |
| Daily ops channel | Telegram not WhatsApp | Zero cost, rich bot API, inline keyboards |
| `auth.uid()` pattern | Always wrap in `(SELECT ...)` | 100x RLS performance improvement |

---

*This document is the single source of truth for building Elijah. All code should conform to the patterns, schemas, and architecture defined here. When in doubt, refer to this spec.*
