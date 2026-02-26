# DraggonnB Restaurant + Events — Claude Code Recommendation Spec (Phase 1 MVP)

Date: 2026-02-25  
Prepared for: Chris / DraggonnB  
Prepared by: XcaB (OpenClaw)

## 0) Purpose
This document converts the Restaurant + Events vision into a **Claude Code build-ready spec** that:
- stays aligned to DraggonnB platform decisions (CRMM spine, shared Supabase, RLS, n8n)
- avoids overscope
- produces a sellable Phase 1 MVP

---

## 1) North Star (Product)
Build a South African, WhatsApp/Telegram-native restaurant operations platform that nails daily execution:
- staff scheduling + shift comms
- digital SOPs/checklists with audit trails
- basic reservations + guest comms
- food safety temperature logging (manual MVP)

Events is delivered as **Events Lite** in Phase 1 (pipeline + timeline + checklists + deposit links).

---

## 2) Critical Architecture Decisions (must follow)
### 2.1 Single platform spine
- Implement Restaurant + Events as workspaces/modules inside the existing DraggonnB CRMM platform (monorepo preferred).
- Reuse: Auth, Contacts, Comms Timeline, Payments, Feature gates.

### 2.2 Multi-tenant: standardize on `organization_id`
- Use `organization_id` everywhere (replace `tenant_id` in the vision spec).
- Every table must include `organization_id uuid not null` + index.

### 2.3 RLS pattern (membership-based for MVP)
Avoid relying on JWT custom tenant claims for MVP. Use:
- `organizations`
- `memberships(user_id, organization_id, role)`

RLS checks membership:
```sql
exists (
  select 1 from memberships m
  where m.user_id = auth.uid()
    and m.organization_id = table.organization_id
)
```

### 2.4 Messaging providers must be abstracted
- WhatsApp: choose one provider for MVP, but implement a `WhatsAppProvider` adapter.
- Telegram: Bot API direct.

### 2.5 Offline-first scope (strict)
Offline MUST work for:
- checklist completions (incl photos queued)
- temperature logs (queued)
- SOP viewing (cached)
- time clock entries (queued)

Offline MUST NOT promise:
- reservation availability locking
- payments

---

## 3) Phase 1 MVP Scope (hard cut line)
### 3.1 Restaurant (MVP)
**A) Staff & Scheduling**
- staff profiles + roles
- weekly schedule view + create shifts
- shift confirm/decline via Telegram DM

**B) Checklists (core ops)**
- checklist templates (opening/closing/cleaning)
- checklist instances created per day/shift
- completion with photo requirement
- overdue alerts to Telegram

**C) SOP Library (lightweight)**
- SOP CRUD (markdown + images)
- role-based visibility
- acknowledgment tracking
- Telegram command to search titles (semantic search later)

**D) Reservations (basic)**
- reservation CRUD (manual + WhatsApp intake later)
- status flow: pending/confirmed/cancelled/no_show/completed
- reminder sending (n8n cron)

**E) Digital Menu (basic)**
- menu categories + items + availability toggle
- public QR menu page (read-only)

**F) Food Safety (manual temperature logs)**
- equipment registry
- manual temp logging
- excursion alert to Telegram

### 3.2 Events Lite (MVP)
- event pipeline stages
- vendor list + assignments (minimal)
- timeline/run sheet as list (no gantt)
- event checklists (setup/breakdown)
- PayFast deposit link generation

---

## 4) Data Model (Phase 1)
> Keep tables minimal; add later.

### Shared (if not already existing in CRMM)
- `organizations`
- `memberships`
- `contacts` (shared across modules)
- `comms_timeline` (or `communications`)

### Restaurant tables
- `restaurant_locations` (or `restaurants`)
- `restaurant_staff_profiles` (if staff isn’t already represented in CRMM)
- `restaurant_shifts`
- `restaurant_time_entries` (optional Phase 1 if time clock is included)
- `restaurant_sop`
- `restaurant_sop_ack`
- `restaurant_checklist_template`
- `restaurant_checklist_instance`
- `restaurant_checklist_item_instance` (or JSON responses in instance)
- `restaurant_equipment`
- `restaurant_temperature_log`
- `restaurant_menu_category`
- `restaurant_menu_item`
- `restaurant_reservation`

### Events Lite tables
- `events`
- `event_vendor`
- `event_vendor_assignment`
- `event_timeline_item`
- `event_checklist`

### Audit
- `sensitive_access_audit` (optional Phase 1, recommended)

---

## 5) RLS Policy Requirements
For every table with `organization_id`:
- SELECT: member of org
- INSERT: member of org AND org_id matches
- UPDATE/DELETE: member of org; optionally admin-only on destructive actions

For webhook/service operations:
- use server-side `SUPABASE_SERVICE_ROLE_KEY`

---

## 6) n8n Workflows (Phase 1)
### WF-R01 — Shift Notifications
- Trigger: schedule publish or daily cron
- Send DM to staff: shift summary + Confirm/Decline buttons
- Escalate unconfirmed shifts to manager

### WF-R02 — Checklist Overdue Alerts
- Trigger: cron every 30 min
- Query incomplete required checklists past due
- Notify assigned role/staff + manager

### WF-R03 — Reservation Reminders
- Trigger: cron every 15 min
- Send reminders 2 hours before reservation
- Handle C(confirm)/X(cancel) replies in v2

### WF-R04 — Temperature Excursion Alerts
- Trigger: Supabase row insert where `is_in_range=false`
- Alert manager with required corrective action

### WF-E01 — Event Deposit Reminder
- Trigger: event stage changes / cron
- If deposit unpaid, send PayFast link + reminder

---

## 7) UI Preview (screens to build in Phase 1)
Restaurant workspace:
- Dashboard (today: shifts, checklist completion, reservations, alerts)
- Staff (list + profile)
- Schedule (week view)
- Checklists (today + templates)
- SOPs (library + editor)
- Reservations (list + create)
- Menu (categories/items)
- Food Safety (equipment + temp logs)

Events workspace:
- Events pipeline list
- Event detail (timeline + checklists + vendor assignments + deposit status)

---

## 8) Implementation Order (recommended)
1) Org primitives + RLS baseline (memberships)
2) Restaurant shifts + schedule UI
3) Telegram bot: shift confirm
4) Checklists templates + completion UI
5) n8n overdue alerts
6) Reservations CRUD + reminders
7) Equipment + temp logs + excursion alerts
8) Events Lite pipeline + deposit links

---

## 9) Definition of Done (Phase 1)
- A restaurant can schedule staff and get confirmations via Telegram.
- Daily opening/closing/cleaning checklists are completed with audit trail and overdue alerts.
- Basic reservations exist with reminders.
- Manual temperature logs exist with excursion alerts.
- Events Lite supports pipeline + timeline + deposit links.
- All data is isolated by org via RLS.

---

## 10) Inputs Claude Code needs (from Chris)
- Confirm existing CRMM table names for org/memberships/contacts/comms
- Choose WhatsApp provider for MVP (Meta Cloud API vs 360dialog)
- Define pilot scope: single location or multi-location

---

## 11) Claude Code Tasking Pattern (how to execute)
Use small verifiable tasks. Example:
- “Create Supabase migration for restaurant_shifts + RLS policies + minimal schedule UI page + test plan.”
- “Implement n8n workflow JSON export for checklist overdue alerts.”

Require each task to output:
- file diffs
- migration SQL
- test steps

