# DraggonnB Restaurant & Events Modules — Claude.md

> **Project:** DraggonnB Business Automation — Hospitality Vertical SaaS
> **Modules:** Restaurant Operations + Events Management (Add-on)
> **Stack:** Next.js 14 · React 18 · TypeScript · TailwindCSS · Supabase · n8n · Claude AI API
> **Author:** DraggonnB (Chris Terblanche)
> **Version:** 1.0
> **Date:** February 2026

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Existing DraggonnB Ecosystem](#2-existing-draggonnb-ecosystem)
3. [Architecture & Tech Stack](#3-architecture--tech-stack)
4. [Restaurant Module — Feature Specification](#4-restaurant-module--feature-specification)
5. [Events Module — Feature Specification](#5-events-module--feature-specification)
6. [Database Schema (Supabase)](#6-database-schema-supabase)
7. [n8n Workflow Automations](#7-n8n-workflow-automations)
8. [WhatsApp Guest AI](#8-whatsapp-guest-ai)
9. [Telegram Staff AI](#9-telegram-staff-ai)
10. [Claude AI Integration Points](#10-claude-ai-integration-points)
11. [Cross-Module Integration](#11-cross-module-integration)
12. [South African Compliance & Context](#12-south-african-compliance--context)
13. [Load Shedding Resilience](#13-load-shedding-resilience)
14. [Pricing & Subscription Tiers](#14-pricing--subscription-tiers)
15. [Build Phases & Roadmap](#15-build-phases--roadmap)
16. [Project Structure](#16-project-structure)
17. [Environment Variables](#17-environment-variables)
18. [Deployment](#18-deployment)
19. [Development Guidelines](#19-development-guidelines)

---

## 1. PROJECT OVERVIEW

DraggonnB Business Automation is a South African vertical SaaS platform delivering modular, AI-driven business automation to SMEs. The Restaurant Module and Events Module expand our hospitality vertical alongside the existing CRMM and Accommodation modules.

### What We Are Building

**Restaurant Module** — A complete restaurant operations platform covering staff management, SOPs, digital checklists, food safety/temperature monitoring, inventory, menu/table/reservation management, WhatsApp guest AI, and Telegram staff AI. Purpose-built for the South African market with R638 food safety compliance, BCEA labor law compliance, and load shedding resilience.

**Events Module** — A cross-cutting add-on that attaches to either the Restaurant or Accommodation module (or both). Covers event pipeline management, vendor/supplier coordination, timelines/run sheets, location checklists, staff planning, budget tracking, guest lists/RSVPs, and client engagement/email management.

### Why This Matters

No SA platform combines staff scheduling, SOPs, food safety, inventory, reservations, and WhatsApp-native guest communication in one product. SA restaurants currently cobble together 3–7 separate tools at prohibitive USD pricing. DraggonnB delivers it all integrated, ZAR-priced, mobile-first, and WhatsApp-native.

### Core Differentiators

- **WhatsApp-native guest interface** (96% SA adoption — this IS the primary channel)
- **Telegram-native staff interface** (free, no message limits, bot-driven operations)
- **R638 food safety compliance** baked in (not bolted on)
- **Load shedding resilience** (offline-first PWA, local queuing, sync-on-reconnect)
- **Cross-module integration** (guest books lodge → gets dinner reservation → attends event → receives marketing)
- **Claude AI throughout** (SOP generation, menu engineering, sentiment analysis, scheduling suggestions, content creation)
- **ZAR pricing** — 50–70% cheaper than cobbling together global tools

---

## 2. EXISTING DRAGGONNB ECOSYSTEM

The Restaurant and Events modules MUST integrate with these existing modules. They share the same Supabase infrastructure, auth system, contact database, and n8n instance.

### Module Map

```
DraggonnB Business Automation Platform
├── CRMM Module (EXISTING — C:\Dev\Draggonnb_CRMM)
│   ├── CRM (contacts, leads, pipeline)
│   ├── AI Content Generation (Claude API)
│   ├── Social Media Automation
│   ├── Email Marketing
│   ├── Analytics Dashboard
│   └── PayFast Recurring Billing
│
├── Accommodation Module (EXISTING)
│   ├── Property/Lodge Management
│   ├── Booking Engine (availability, create-booking, check-availability)
│   ├── Guest Dashboard
│   ├── Guest Communications
│   ├── Supabase Edge Functions
│   └── Client: Swa-Zulu Safari Lodges (Lion View, Farmstead, Maroela)
│
├── VDJ White-Label Client (EXISTING)
│   ├── Accounting Practice Management
│   ├── Client Portal
│   ├── Document Management
│   └── Pastel Integration (via n8n)
│
├── Restaurant Module (THIS BUILD) ← ← ←
│   ├── Staff Management & Scheduling
│   ├── SOPs & Checklists
│   ├── Food Safety & Temperature Monitoring
│   ├── Menu & Table Management
│   ├── Reservations
│   ├── Inventory & Suppliers
│   ├── Guest Feedback & CRM
│   ├── WhatsApp Guest AI Bot
│   └── Telegram Staff AI Bot
│
└── Events Module (THIS BUILD) ← ← ←
    ├── Event Pipeline & CRM
    ├── Vendor/Supplier Management
    ├── Timeline & Run Sheets
    ├── Location Checklists
    ├── Staff Planning & Allocation
    ├── Budget Tracking
    ├── Guest List & RSVP Management
    └── Cross-module links (Accommodation + Restaurant + CRMM)
```

### Shared Resources Across All Modules

- **Supabase Project** — shared PostgreSQL database with RLS per tenant
- **Supabase Auth** — shared authentication (magic links + OAuth)
- **Supabase Storage** — shared file storage (photos, documents, menus)
- **n8n Instance** — self-hosted on VPS, shared workflow engine
- **Claude AI API** — shared AI backend
- **PayFast** — shared billing/subscription management
- **Vercel** — shared hosting/deployment
- **contacts table** — THE universal entity shared across ALL modules

---

## 3. ARCHITECTURE & TECH STACK

### Frontend

```
Framework:       Next.js 14 (App Router)
Language:        TypeScript (strict mode)
Styling:         TailwindCSS + shadcn/ui components
State:           React Server Components + zustand for client state
Forms:           react-hook-form + zod validation
Charts:          Recharts
Floor Plans:     react-konva (canvas-based table layout editor)
PWA:             next-pwa (offline-first for load shedding)
Mobile:          Responsive PWA — NO native app. Mobile-first design.
```

### Backend

```
Database:        Supabase (PostgreSQL 15+)
Auth:            Supabase Auth (JWT with custom claims: tenant_id, role)
Storage:         Supabase Storage (photos, documents, menus)
Edge Functions:  Supabase Edge Functions (Deno) for real-time operations
Vector Store:    pgvector extension (SOP semantic search)
Realtime:        Supabase Realtime (live dashboard updates)
```

### Automation & AI

```
Workflows:       n8n (self-hosted on VPS)
AI:              Claude API (claude-sonnet-4-20250514)
WhatsApp:        WhatsApp Business Cloud API via 360dialog BSP
Telegram:        Telegram Bot API (direct, no BSP needed)
```

### Infrastructure

```
Hosting:         Vercel (Edge Network)
VPS:             Self-hosted n8n + optional IoT relay
DNS/Domain:      Vercel managed
CI/CD:           GitHub → Vercel auto-deploy
Monitoring:      Vercel Analytics + Sentry
```

### Multi-Tenant Architecture

```
Pattern:         Shared database with Row Level Security (RLS)
Tenant ID:       UUID in JWT custom claims (auth.jwt() ->> 'tenant_id')
Isolation:       Every table has tenant_id column + RLS policy
Data Sharing:    Cross-module via shared tables (contacts, staff, communications)
```

---

## 4. RESTAURANT MODULE — FEATURE SPECIFICATION

### 4.1 Staff Management & Scheduling

**Purpose:** Replace paper rosters, reduce scheduling conflicts, enforce SA labor law compliance automatically.

**Features:**

- Staff profiles: name, role, contact details, Telegram chat ID, WhatsApp number, hourly rate, employment type (full-time/part-time/casual), active status
- Roles: Manager, Head Chef, Sous Chef, Line Cook, Server, Bartender, Host, Barista, Cleaner, Runner — configurable per restaurant
- Availability management: recurring weekly availability + specific date overrides
- Drag-and-drop schedule builder with shift templates
- Shift types: morning, afternoon, evening, split, double — customizable
- Open shifts: unassigned shifts visible to eligible staff via Telegram
- Shift swapping: staff request via Telegram → eligible staff notified → manager approves via Telegram inline button
- Time clock: mobile clock-in/out with GPS geofencing (within X meters of restaurant)
- Break tracking: mandatory 60-min break after 5 hours (BCEA compliance)
- Overtime tracking: automatic alerts at 45hrs/week (BCEA standard), 1.5x rate calculation
- Weekly hours dashboard per staff member
- Payroll export: CSV with hours, overtime, rates for external payroll processing
- Labor cost forecasting: projected cost per shift/day/week based on schedule

**SA Labor Law (BCEA) Rules Built In:**

```
- Maximum 45 ordinary hours per week
- Maximum 9 hours per day (5-day week) or 8 hours (6-day week)
- Overtime: max 10 hours per week, paid at 1.5x
- Mandatory 60-minute meal break after 5 hours continuous work
- Minimum 12 consecutive hours daily rest between shifts
- Minimum 36 consecutive hours weekly rest (must include Sunday unless agreed)
- Public holiday work: double rate
- Night shift (18:00–06:00): additional allowance per agreement
- Sunday work: 1.5x unless normally scheduled
```

The system MUST flag violations before they happen (during scheduling) and log actual violations from time entries.

### 4.2 SOPs (Standard Operating Procedures)

**Purpose:** Digitize tribal knowledge, ensure consistency, enable AI-powered training.

**Features:**

- SOP categories: Food Safety, Cleaning & Hygiene, Service Standards, Emergency Procedures, Equipment Operation, Admin, Custom
- Rich text SOP editor (markdown-based with image support)
- Version control: drafts → published → archived, with version history
- Role-based visibility: SOPs tagged to applicable roles (e.g., "Closing Procedure" visible to Servers + Managers only)
- Acknowledgment tracking: staff must acknowledge reading new/updated SOPs
- Training module: SOPs grouped into training programs for new hires
- Multi-language support: English + Afrikaans + Zulu (future: Xhosa, Sotho)
- **AI SOP Generation**: Manager describes a procedure in plain language → Claude generates formatted SOP with steps, safety notes, and images placeholders
- **AI SOP Search via Telegram**: Staff sends question to Telegram bot → Claude searches SOP vector store (pgvector) → returns relevant procedure excerpt with images

**SOP Templates (Pre-Built):**

```
- Opening Procedure (FOH)
- Opening Procedure (Kitchen)
- Closing Procedure (FOH)
- Closing Procedure (Kitchen)
- Food Receiving & Storage
- Allergen Handling Protocol
- Fire Emergency Procedure
- Armed Robbery Procedure
- Load Shedding Protocol
- Customer Complaint Handling
- Cash Handling Procedure
- Liquor Service Responsible Service
- Equipment Cleaning Schedules
- HACCP Critical Control Points
- Staff Hygiene & Health Requirements (R638)
```

### 4.3 Digital Checklists

**Purpose:** Replace paper checklists with accountable, photo-verified, timestamped digital checklists.

**Features:**

- Checklist types: Opening, Closing, Cleaning, Food Prep, Safety Inspection, Health & Hygiene, Equipment, Custom
- Checklist builder: drag-and-drop items, set requirements per item (text response, yes/no, photo required, temperature reading required, numeric value)
- Assignment: by role or specific staff member
- Frequency: daily, per-shift, weekly, monthly, one-off
- Photo verification: items can require timestamped photo proof (stored in Supabase Storage)
- Temperature items: integrate with temperature logging system (see 4.4)
- Completion tracking: dashboard showing completion rates by checklist, staff member, date range
- Flagged items: incomplete or non-compliant items auto-flag for manager review
- Notifications: overdue checklists trigger Telegram alerts to assigned staff + manager
- Historical records: all completions stored for compliance audits (R638 requires records)

**Pre-Built Checklist Templates (R638 Aligned):**

```
DAILY:
- Kitchen Opening Checklist (equipment check, temp verification, prep area sanitization)
- Kitchen Closing Checklist (equipment shutdown, deep clean, waste disposal, temp log)
- FOH Opening Checklist (table setup, POS check, restroom check, signage)
- FOH Closing Checklist (cash reconciliation, lock-up, alarm set)
- Restroom Cleaning Log (hourly check with sign-off)

PER-SHIFT:
- Handwashing Station Check (soap, paper towels, signage, water temp)
- Cold Storage Temperature Log (fridge, freezer, walk-in — every 4 hours)
- Hot Holding Temperature Log (bain marie, soup station — every 2 hours)
- Allergen Station Verification

WEEKLY:
- Deep Cleaning Schedule (by area: kitchen, FOH, storage, restrooms)
- Equipment Maintenance Check
- Pest Control Inspection Points
- First Aid Kit Inventory
- Fire Extinguisher Visual Check

MONTHLY:
- Full Inventory Count
- Equipment Calibration (thermometers)
- Staff Training Record Review
- Compliance Document Expiry Check
```

### 4.4 Food Safety & Temperature Monitoring

**Purpose:** Digital R638 compliance, eliminate paper temp logs, catch excursions before they become food safety incidents.

**Features:**

- Temperature logging dashboard: visual display of all monitored equipment (fridges, freezers, hot-holding, prep areas)
- Manual temp entry: staff enters reading via mobile app or Telegram bot
- Bluetooth probe support: compatible with ThermoWorks BlueDOT, Monnit wireless sensors — auto-logs via Web Bluetooth API or n8n relay
- **Visual/photo verification**: out-of-range readings require a corrective action note AND a timestamped photo (following Jolt's model to prevent "pencil whipping")
- R638 threshold enforcement:

```
FROZEN STORAGE:     ≤ -18°C (alert at -15°C)
CHILLED STORAGE:    ≤ 5°C (alert at 4°C)
HOT HOLDING:        ≥ 60°C (alert at 63°C)
DANGER ZONE:        5°C to 60°C — 4-hour maximum exposure rule
COOKING TEMPS:      Poultry ≥ 74°C, Minced meat ≥ 70°C, Reheating ≥ 70°C
COOLING:            70°C → 21°C within 2 hours, 21°C → 5°C within 4 hours
```

- Excursion alerts: out-of-range readings immediately notify on-duty manager via Telegram with equipment name, reading, threshold, and required action
- Corrective action logging: mandatory when excursion detected — what happened, what was done, follow-up temp confirmation
- Danger zone timer: when food enters danger zone, 4-hour countdown starts with progressive alerts at 2hr, 3hr, 3.5hr, and 4hr (discard advisory)
- **Load shedding integration**: power outage triggers enhanced monitoring mode (see Section 13)
- Compliance reports: exportable temp logs for health inspector audits
- Equipment registry: name, type, location, calibration date, next calibration due
- HACCP documentation: CCP monitoring linked to menu items and processes

### 4.5 Menu Management

**Purpose:** Single source of truth for menus — drives digital menus, WhatsApp ordering, recipe costing, allergen communication.

**Features:**

- Menu categories with drag-and-drop ordering
- Menu items: name, description, price, cost (from recipe), image, allergens, dietary tags, availability toggle
- Allergen tracking: 14 major allergens (gluten, dairy, eggs, nuts, peanuts, soy, fish, shellfish, celery, mustard, sesame, sulphites, lupin, molluscs)
- Dietary tags: Vegan, Vegetarian, Halal, Kosher, Gluten-Free, Dairy-Free, Banting/Keto
- Real-time availability: 86 an item → immediately reflected on digital menu + WhatsApp bot informed
- QR code generation: per-table or general — links to mobile-friendly digital menu
- Multi-menu support: Breakfast, Lunch, Dinner, Drinks, Specials, Kids
- Pricing tiers: standard, happy hour, event pricing
- Menu item performance: link to sales data for menu engineering (Star/Puzzle/Plowhorse/Dog classification via Claude AI)

### 4.6 Table & Reservation Management

**Purpose:** Visual floor plan management, reservation handling, capacity control, pacing for kitchen.

**Features:**

- Visual floor plan editor (react-konva canvas):
  - Drag-and-drop table placement
  - Table shapes: round, square, rectangular, bar seats
  - Zones: indoor, outdoor, bar, private dining, terrace
  - Table capacity: min/max covers
  - Table combining for large parties
- Reservation management:
  - Create via: WhatsApp (AI bot), website widget, phone (manual), walk-in
  - Fields: guest name, phone, party size, date, time, duration, special requests, linked contact
  - Status flow: Pending → Confirmed → Seated → Completed / No-Show / Cancelled
  - Double-booking prevention with configurable turn times
  - Waitlist with estimated wait times
  - Pacing: limit reservations per time slot to prevent kitchen overload
- Notifications:
  - Guest: WhatsApp confirmation on booking, reminder 2 hours before, follow-up feedback request post-visit
  - Staff: Telegram notification for new bookings, VIP alerts, large party alerts, special request flags
- No-show tracking: flag repeat no-shows, optionally require deposit for known offenders (PayFast)
- Walk-in management: queue with wait time estimates
- Analytics: covers per service, average table turn time, no-show rate, revenue per available seat hour (RevPASH)

### 4.7 Inventory Management

**Purpose:** Basic stock control, par-level alerts, purchase ordering, waste tracking, food cost visibility.

**NOTE:** This is NOT a full ERP inventory system. It provides 80/20 value — the critical 20% of inventory features that deliver 80% of the cost-saving benefit. We are NOT building POS integration in Phase 1.

**Features:**

- Item catalog: name, category (protein, produce, dairy, dry goods, beverage, cleaning, packaging), unit of measure, cost per unit, supplier, par level, min level
- Categories: Protein, Produce, Dairy, Dry Goods, Beverages (alcoholic), Beverages (non-alcoholic), Cleaning Supplies, Packaging/Disposables, Spices & Condiments
- Stock count: mobile-friendly count sheets, count by category or full count
- Par levels: configurable optimal stock levels with reorder triggers
- Low stock alerts: n8n webhook fires when qty drops below min_level → Telegram alert to manager
- Supplier management: contact details, delivery days, payment terms, WhatsApp number for ordering
- Purchase orders: create PO from low-stock items → manager approves → send to supplier via WhatsApp or email → mark received with variance notes
- Waste logging: quantity, reason code (expired, spoiled, overproduction, load shedding, damaged, customer return), photo evidence, value calculation
- Recipe costing: link ingredients to menu items → calculate theoretical food cost per item → food cost percentage
- Reports: actual vs. theoretical food cost, waste by category, waste by reason, supplier spend, stock movement

### 4.8 Guest Feedback & CRM

**Purpose:** Capture feedback at the moment it matters, route to the right action, build guest profiles.

**Features:**

- Post-dining WhatsApp survey (triggered 1–2 hours after reservation completed):
  - Overall rating (1–5 stars)
  - Category ratings: Food, Service, Ambiance, Value
  - Free-text comment
  - Photo upload option
- Routing logic:
  - Rating ≥ 4 → thank you message + "Would you mind leaving us a Google Review?" with direct link
  - Rating ≤ 2 → immediate Telegram alert to manager with full details for recovery outreach
  - Rating 3 → logged for review, optional follow-up
- Sentiment analysis: Claude AI analyzes free-text comments, tags sentiment (positive/neutral/negative) and topics (food quality, wait time, cleanliness, staff attitude, pricing)
- Guest CRM (extends shared contacts table):
  - Visit history: dates, party size, spend (when POS integrates), table preferences
  - Dietary preferences / allergies (persisted from reservations)
  - Feedback history
  - Communication log (all WhatsApp + email interactions)
  - VIP tagging: automatic (>5 visits) or manual
  - Birthday/anniversary tracking for automated offers
- Integration: guest data shared with CRMM module for marketing campaigns

---

## 5. EVENTS MODULE — FEATURE SPECIFICATION

The Events Module is a **cross-cutting add-on** — it can be enabled on top of the Restaurant Module, the Accommodation Module, or both. It shares contacts, staff, venues, and communication infrastructure.

### 5.1 Event Pipeline & CRM

**Features:**

- Event types: Wedding, Corporate Function, Birthday/Celebration, Conference, Product Launch, Tasting/Wine Pairing, Private Dining, Festival, Custom
- Pipeline stages: Inquiry → Proposal → Contracted → Planning → Execution → Post-Event → Archived
- Lead capture:
  - Web form (embeddable Next.js component)
  - WhatsApp inquiry flow
  - Manual entry
  - Referral from CRMM contacts
- Event record: name, type, status, client contact (from shared contacts), venue (restaurant OR accommodation OR external), date/time, expected guests, budget, revenue, notes
- Proposal generation: Claude AI generates event proposal from event details, venue capabilities, and menu options → exports to PDF or email
- Contract management: upload signed contracts, track deposit status
- Follow-up automation: n8n sequences for inquiry follow-up (3 days), proposal follow-up (7 days), post-event thank you (24 hours)
- Event calendar: visual calendar showing all events across all venues with status color-coding

### 5.2 Vendor/Supplier Management

**Features:**

- Vendor database: name, category (catering, décor, photography, videography, entertainment/DJ/band, flowers, AV/sound/lighting, transport, cake, stationery, security, custom), contact details, WhatsApp number
- Per-event vendor assignment: vendor + service description + quoted amount + actual amount + deposit paid + status + contract upload
- Vendor communication log: all interactions tracked
- Vendor rating system: post-event rating per vendor for future reference
- Preferred vendor lists: per venue, per event type

### 5.3 Timeline & Run Sheets

**Purpose:** The minute-by-minute operational backbone of event execution. This is the feature most competitors handle poorly.

**Features:**

- Timeline builder: chronological list of time-stamped activities
- Per item: time, duration, title, description, assigned staff, assigned vendor, location/area, equipment needed, status
- Multiple views: timeline (chronological), Gantt-style, kanban (by status), print-ready run sheet
- Template library: pre-built timelines for common event types (wedding ceremony + reception, corporate conference, birthday dinner)
- BEO (Banquet Event Order) generation: auto-generate from event details + menu + timeline → PDF export
- Real-time status tracking: during event execution, staff update item status via Telegram → dashboard shows live progress
- Alerts: upcoming items notify assigned staff via Telegram 15 minutes before

### 5.4 Location Checklists

**Features:**

- Venue-specific setup checklists tied to floor plan / room configurations
- Checklist types: Pre-Event Setup, During Event, Post-Event Breakdown, Equipment Check
- Photo verification for completed setup items
- Equipment inventory per venue space (tables, chairs, AV equipment, linens, décor items)
- Assigned staff per checklist
- Due time integration with event timeline

### 5.5 Staff Planning & Allocation

**Features:**

- Draw from Restaurant Module's staff_members table (shared pool)
- Event-specific shift creation with role requirements (coordinator, servers, bartenders, chefs, setup crew, security)
- Conflict detection: checks against regular restaurant schedule before assignment
- Staff confirmation via Telegram (inline button: Accept/Decline)
- Labor cost projection per event (hours × rate per assigned staff)
- Post-event hours logging for payroll
- External/freelance staff support: temporary staff entries not in regular pool

### 5.6 Budget Tracking

**Features:**

- Budget categories: Venue Hire, Catering/F&B, Décor, Entertainment, Photography/Video, Flowers, Transport, Stationery/Printing, Staffing, Equipment Hire, Miscellaneous
- Per category: estimated amount, actual amount, variance
- Vendor costs auto-linked from vendor assignments
- Staff costs auto-calculated from staff planning
- Revenue tracking: package price, per-head charge, ticket sales, bar revenue
- Payment tracking: deposits received, milestone payments, final balance
- PayFast integration: generate payment links for deposits and milestones
- Profit margin calculation: revenue – total actual costs
- Budget vs. actual dashboard with variance highlighting

### 5.7 Guest List & RSVP Management

**Features:**

- Guest list per event: name, email, phone, RSVP status, dietary requirements, meal choice, table assignment, plus-ones, notes
- RSVP collection via WhatsApp Flow: send invite → guest responds with attendance + dietary needs + meal choice → auto-update record
- Seating management: table assignments with visual layout (shares restaurant floor plan editor)
- Check-in: QR code per guest (generated and sent via WhatsApp) → scan at door → mark checked in with timestamp
- Integration with Accommodation Module: link event guests to accommodation bookings (for multi-day events at lodges, e.g., bush weddings)
- Guest count tracking: confirmed vs. declined vs. pending, with alerts for response rate thresholds
- Dietary summary: auto-generated count of dietary requirements for kitchen

### 5.8 Client Engagement & Email Manager

**Features:**

- Email templates: inquiry response, proposal, contract, save-the-date, invitation, reminder, thank you, review request
- Claude AI email generation: generate personalized emails from event context
- Email tracking: sent, opened, clicked (via n8n + email service integration)
- WhatsApp message templates: parallels email templates for WhatsApp delivery
- Automated sequences (n8n workflows):
  - Post-inquiry: day 1 (confirmation), day 3 (follow-up if no response), day 7 (final follow-up)
  - Pre-event: 30 days (checklist reminder), 7 days (final details), 1 day (tomorrow summary)
  - Post-event: day 1 (thank you), day 3 (feedback request), day 14 (review request + referral ask)

---

## 6. DATABASE SCHEMA (SUPABASE)

### Design Principles

1. Every table has `tenant_id UUID NOT NULL` with RLS policy
2. RLS uses JWT custom claim: `(auth.jwt() ->> 'tenant_id')::uuid`
3. Shared tables (contacts, staff_members, communications) bridge all modules
4. UUIDs for all primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
5. Timestamps: `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
6. Soft deletes where needed: `deleted_at TIMESTAMPTZ` (null = active)
7. JSONB for flexible/nested data (checklist items, settings, metadata)
8. pgvector for SOP embeddings (semantic search)

### RLS Policy Template (Apply to ALL tables)

```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON {table_name}
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

### 6.1 Shared Core Tables

```sql
-- ============================================================
-- TENANTS (exists in CRMM — extend if needed)
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter', -- 'starter','professional','premium'
  modules_enabled TEXT[] DEFAULT '{}', -- ['crmm','accommodation','restaurant','events']
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONTACTS — THE universal entity across ALL modules
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  tags JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}', -- dietary, seating, language, etc.
  source TEXT, -- 'restaurant','accommodation','event','crmm','whatsapp','website'
  notes TEXT,
  is_vip BOOLEAN DEFAULT false,
  visit_count INT DEFAULT 0,
  total_spend DECIMAL(12,2) DEFAULT 0,
  birthday DATE,
  anniversary DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_whatsapp ON contacts(tenant_id, whatsapp_number);
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email);

-- ============================================================
-- STAFF MEMBERS — shared across Restaurant + Events
-- ============================================================
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID, -- nullable for non-restaurant staff
  display_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'manager','head_chef','sous_chef','line_cook','server','bartender','host','barista','cleaner','runner'
  hourly_rate DECIMAL(10,2),
  employment_type TEXT DEFAULT 'full_time', -- 'full_time','part_time','casual','freelance'
  phone TEXT,
  telegram_chat_id TEXT,
  whatsapp_number TEXT,
  skills JSONB DEFAULT '[]', -- ['grill','pastry','cocktails','events','setup']
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COMMUNICATIONS LOG — all channels, all modules
-- ============================================================
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  channel TEXT NOT NULL, -- 'whatsapp','email','telegram','sms','phone'
  direction TEXT NOT NULL, -- 'inbound','outbound'
  content TEXT,
  metadata JSONB DEFAULT '{}', -- message IDs, delivery status, template name
  module_source TEXT, -- 'restaurant','accommodation','events','crmm'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 Restaurant Module Tables

```sql
-- ============================================================
-- RESTAURANTS / LOCATIONS
-- ============================================================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  operating_hours JSONB DEFAULT '{}', -- {monday: {open: "08:00", close: "22:00"}, ...}
  capacity INT,
  settings JSONB DEFAULT '{}', -- reservation_duration, pacing_limits, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SCHEDULING
-- ============================================================
CREATE TABLE staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  day_of_week INT, -- 0=Monday ... 6=Sunday; NULL for specific date
  specific_date DATE, -- for one-off availability
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  notes TEXT
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  staff_member_id UUID REFERENCES staff_members(id), -- NULL = open/unassigned shift
  role TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled', -- 'scheduled','confirmed','in_progress','completed','no_show','swapped','cancelled'
  break_minutes INT DEFAULT 60,
  actual_clock_in TIMESTAMPTZ,
  actual_clock_out TIMESTAMPTZ,
  overtime_minutes INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shifts_date ON shifts(tenant_id, restaurant_id, start_time);

CREATE TABLE shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  original_shift_id UUID NOT NULL REFERENCES shifts(id),
  requesting_staff_id UUID NOT NULL REFERENCES staff_members(id),
  covering_staff_id UUID REFERENCES staff_members(id),
  status TEXT DEFAULT 'pending', -- 'pending','approved','rejected','cancelled'
  manager_id UUID REFERENCES staff_members(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id),
  shift_id UUID REFERENCES shifts(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_minutes INT DEFAULT 0,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  overtime_minutes INT DEFAULT 0,
  notes TEXT
);

-- ============================================================
-- SOPs
-- ============================================================
CREATE TABLE sop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category_id UUID REFERENCES sop_categories(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- markdown with image references
  version INT DEFAULT 1,
  status TEXT DEFAULT 'draft', -- 'draft','published','archived'
  applicable_roles TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en', -- 'en','af','zu'
  created_by UUID REFERENCES staff_members(id),
  published_at TIMESTAMPTZ,
  embedding VECTOR(1536), -- pgvector for semantic search
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sop_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  sop_id UUID NOT NULL REFERENCES sops(id),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id),
  acknowledged_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHECKLISTS
-- ============================================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'opening','closing','cleaning','food_prep','safety','hygiene','equipment','custom'
  frequency TEXT DEFAULT 'daily', -- 'daily','per_shift','weekly','monthly','once'
  assigned_role TEXT,
  items JSONB NOT NULL,
  -- items format: [
  --   { "id": "uuid", "description": "text", "requires_photo": bool,
  --     "requires_temp": bool, "requires_numeric": bool, "sort_order": int }
  -- ]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  checklist_id UUID NOT NULL REFERENCES checklists(id),
  completed_by UUID NOT NULL REFERENCES staff_members(id),
  shift_id UUID REFERENCES shifts(id),
  completed_at TIMESTAMPTZ DEFAULT now(),
  responses JSONB NOT NULL,
  -- responses format: [
  --   { "item_id": "uuid", "checked": bool, "photo_url": "text",
  --     "temp_value": decimal, "numeric_value": decimal, "notes": "text" }
  -- ]
  status TEXT DEFAULT 'complete', -- 'complete','incomplete','flagged'
  flagged_items JSONB DEFAULT '[]',
  reviewed_by UUID REFERENCES staff_members(id),
  reviewed_at TIMESTAMPTZ
);

-- ============================================================
-- FOOD SAFETY & TEMPERATURE
-- ============================================================
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL, -- 'Walk-in Fridge 1', 'Freezer A', 'Bain Marie'
  type TEXT NOT NULL, -- 'fridge','freezer','hot_holding','prep_area','display'
  location TEXT, -- 'Main Kitchen', 'Bar', 'Prep Area'
  threshold_min DECIMAL(5,2), -- min acceptable temp (e.g., 60 for hot-holding)
  threshold_max DECIMAL(5,2), -- max acceptable temp (e.g., 5 for fridge)
  alert_buffer DECIMAL(5,2) DEFAULT 1.0, -- alert before hitting threshold
  calibration_date DATE,
  next_calibration_date DATE,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  temperature DECIMAL(5,2) NOT NULL,
  is_in_range BOOLEAN NOT NULL,
  logged_by UUID NOT NULL REFERENCES staff_members(id),
  photo_url TEXT,
  corrective_action TEXT, -- required if is_in_range = false
  corrective_action_photo TEXT,
  source TEXT DEFAULT 'manual', -- 'manual','bluetooth_probe','iot_sensor'
  logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_temp_logs_date ON temperature_logs(tenant_id, restaurant_id, logged_at DESC);

CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  doc_type TEXT NOT NULL, -- 'coa','fire_cert','liquor_license','gas_cert','electrical_cert','health_cert'
  document_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  file_url TEXT,
  status TEXT DEFAULT 'active', -- 'active','expiring_soon','expired'
  reminder_days INT DEFAULT 30,
  notes TEXT
);

CREATE TABLE loadshedding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  stage INT, -- 1-8
  affected_equipment JSONB DEFAULT '[]',
  -- [{ "equipment_id": "uuid", "start_temp": decimal, "end_temp": decimal,
  --    "duration_minutes": int, "action_taken": "text" }]
  food_discarded JSONB DEFAULT '[]',
  -- [{ "item": "text", "quantity": "text", "estimated_value": decimal, "reason": "text" }]
  total_loss_value DECIMAL(10,2) DEFAULT 0,
  notes TEXT
);

-- ============================================================
-- MENU
-- ============================================================
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  menu_type TEXT DEFAULT 'main', -- 'main','breakfast','lunch','dinner','drinks','specials','kids'
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES menu_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2), -- calculated from recipe
  food_cost_pct DECIMAL(5,2), -- auto-calculated: cost/price * 100
  allergens JSONB DEFAULT '[]',
  dietary_tags JSONB DEFAULT '[]',
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  popularity_score INT DEFAULT 0, -- updated from sales/order data
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id),
  name TEXT NOT NULL,
  ingredients JSONB NOT NULL,
  -- [{ "inventory_item_id": "uuid", "name": "text", "quantity": decimal,
  --    "unit": "text", "cost_per_unit": decimal }]
  instructions TEXT, -- markdown
  prep_time_minutes INT,
  cook_time_minutes INT,
  yield_portions INT DEFAULT 1,
  total_cost DECIMAL(10,2), -- calculated from ingredients
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLES & RESERVATIONS
-- ============================================================
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  table_number TEXT NOT NULL,
  capacity_min INT DEFAULT 1,
  capacity_max INT NOT NULL,
  zone TEXT, -- 'indoor','outdoor','bar','private','terrace'
  position_x DECIMAL(6,2), -- floor plan x coordinate
  position_y DECIMAL(6,2), -- floor plan y coordinate
  shape TEXT DEFAULT 'square', -- 'round','square','rectangular','bar'
  is_combinable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  contact_id UUID REFERENCES contacts(id),
  table_id UUID REFERENCES tables(id),
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  party_size INT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INT DEFAULT 90,
  status TEXT DEFAULT 'confirmed',
  -- 'pending','confirmed','reminder_sent','seated','completed','no_show','cancelled'
  source TEXT DEFAULT 'whatsapp', -- 'whatsapp','website','phone','walk_in','event'
  special_requests TEXT,
  event_id UUID, -- FK to events table if part of an event
  deposit_amount DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  feedback_requested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reservations_date ON reservations(tenant_id, restaurant_id, date, time);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  delivery_days TEXT[] DEFAULT '{}', -- ['monday','wednesday','friday']
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  category TEXT, -- 'protein','produce','dairy','dry_goods','beverage_alc','beverage_soft','cleaning','packaging','spices'
  unit TEXT NOT NULL, -- 'kg','g','l','ml','each','case','bag','box'
  current_qty DECIMAL(10,2) DEFAULT 0,
  par_level DECIMAL(10,2),
  min_level DECIMAL(10,2),
  cost_per_unit DECIMAL(10,2),
  supplier_id UUID REFERENCES suppliers(id),
  storage_type TEXT, -- 'dry','chilled','frozen'
  last_counted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status TEXT DEFAULT 'draft', -- 'draft','sent','confirmed','received','partial','cancelled'
  items JSONB NOT NULL,
  -- [{ "inventory_item_id": "uuid", "name": "text", "quantity": decimal,
  --    "unit": "text", "unit_price": decimal }]
  total DECIMAL(10,2),
  ordered_at TIMESTAMPTZ,
  expected_delivery DATE,
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES staff_members(id),
  variance_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  item_name TEXT NOT NULL, -- denormalized for quick reporting
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  estimated_value DECIMAL(10,2),
  reason TEXT NOT NULL, -- 'expired','spoiled','overproduction','loadshedding','damaged','customer_return','theft'
  photo_url TEXT,
  logged_by UUID NOT NULL REFERENCES staff_members(id),
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- GUEST FEEDBACK
-- ============================================================
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id),
  event_id UUID, -- for event feedback
  reservation_id UUID REFERENCES reservations(id),
  contact_id UUID REFERENCES contacts(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  category_ratings JSONB, -- { "food": 4, "service": 5, "ambiance": 3, "value": 4 }
  comment TEXT,
  sentiment TEXT, -- 'positive','neutral','negative' (Claude-analyzed)
  sentiment_topics JSONB DEFAULT '[]', -- ['food_quality','wait_time','staff_friendly']
  source TEXT DEFAULT 'whatsapp', -- 'whatsapp','google','tripadvisor','manual'
  staff_response TEXT,
  responded_by UUID REFERENCES staff_members(id),
  responded_at TIMESTAMPTZ,
  google_review_prompted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.3 Events Module Tables

```sql
-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'wedding','corporate','birthday','conference','product_launch','tasting','private_dining','festival','custom'
  status TEXT DEFAULT 'inquiry',
  -- 'inquiry','proposal_sent','contracted','planning','execution','completed','cancelled','archived'
  client_contact_id UUID REFERENCES contacts(id),
  -- Venue can be restaurant, accommodation, or external:
  venue_restaurant_id UUID REFERENCES restaurants(id),
  venue_accommodation_id UUID, -- FK to accommodation module
  venue_custom_name TEXT,
  venue_custom_address TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  setup_time TIME, -- when setup crew arrives
  breakdown_time TIME, -- when breakdown starts
  expected_guests INT,
  confirmed_guests INT DEFAULT 0,
  budget_estimated DECIMAL(12,2),
  budget_actual DECIMAL(12,2) DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  deposit_required DECIMAL(10,2),
  deposit_received DECIMAL(10,2) DEFAULT 0,
  contract_url TEXT,
  contract_signed BOOLEAN DEFAULT false,
  notes TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES staff_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_date ON events(tenant_id, event_date);

-- ============================================================
-- EVENT TIMELINE / RUN SHEET
-- ============================================================
CREATE TABLE event_timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  time TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  title TEXT NOT NULL,
  description TEXT,
  assigned_staff_ids UUID[] DEFAULT '{}',
  assigned_vendor_id UUID,
  location_area TEXT,
  equipment_needed JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- 'pending','in_progress','completed','skipped','delayed'
  sort_order INT,
  notes TEXT
);

-- ============================================================
-- EVENT VENDORS
-- ============================================================
CREATE TABLE event_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  website TEXT,
  rating DECIMAL(3,2), -- average rating
  total_events INT DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_vendor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES event_vendors(id),
  service_description TEXT,
  quoted_amount DECIMAL(10,2),
  actual_amount DECIMAL(10,2),
  deposit_paid DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending','confirmed','deposit_paid','paid_full','cancelled'
  contract_url TEXT,
  rating INT, -- post-event rating 1-5
  notes TEXT
);

-- ============================================================
-- EVENT BUDGET
-- ============================================================
CREATE TABLE event_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_amount DECIMAL(10,2),
  actual_amount DECIMAL(10,2) DEFAULT 0,
  vendor_assignment_id UUID REFERENCES event_vendor_assignments(id),
  is_paid BOOLEAN DEFAULT false,
  payment_date DATE,
  payment_method TEXT,
  receipt_url TEXT
);

-- ============================================================
-- EVENT GUESTS
-- ============================================================
CREATE TABLE event_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  guest_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  rsvp_status TEXT DEFAULT 'pending', -- 'pending','accepted','declined','tentative'
  rsvp_responded_at TIMESTAMPTZ,
  dietary_requirements TEXT,
  meal_choice TEXT,
  table_assignment TEXT,
  seat_number TEXT,
  plus_ones INT DEFAULT 0,
  accommodation_booking_id UUID, -- FK to accommodation module booking
  qr_code_url TEXT, -- for check-in
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_guests ON event_guests(tenant_id, event_id);

-- ============================================================
-- EVENT CHECKLISTS
-- ============================================================
CREATE TABLE event_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 'setup','during','breakdown','equipment'
  items JSONB NOT NULL,
  assigned_to UUID REFERENCES staff_members(id),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending','in_progress','completed','overdue'
  photo_verification_urls JSONB DEFAULT '[]'
);

-- ============================================================
-- EVENT STAFF ASSIGNMENTS
-- ============================================================
CREATE TABLE event_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id),
  role TEXT NOT NULL, -- 'coordinator','server','bartender','chef','setup_crew','security','photographer','dj'
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  hourly_rate DECIMAL(10,2),
  confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  actual_hours DECIMAL(5,2),
  notes TEXT
);

-- ============================================================
-- EVENT ↔ ACCOMMODATION BLOCKS
-- ============================================================
CREATE TABLE event_accommodation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  accommodation_id UUID NOT NULL, -- FK to accommodation module lodge/property
  room_type TEXT,
  rooms_blocked INT,
  check_in_date DATE,
  check_out_date DATE,
  rate_override DECIMAL(10,2),
  notes TEXT
);
```

### 6.4 Supabase Edge Functions Required

```
Functions to build:
├── restaurant-whatsapp-webhook     — receives WhatsApp messages, routes to n8n
├── restaurant-telegram-webhook     — receives Telegram messages, routes to n8n
├── check-table-availability        — real-time table availability check
├── create-reservation              — create reservation with validation
├── update-reservation-status       — status transitions with notifications
├── log-temperature                 — temp entry with threshold validation + alerts
├── clock-in-out                    — time entry with GPS verification
├── generate-digital-menu           — public menu endpoint from menu_items
├── event-rsvp-webhook              — process RSVP responses from WhatsApp
├── event-guest-checkin             — QR code validation + check-in
├── generate-beo                    — create BEO PDF from event data
└── payfast-webhook                 — process deposit/payment confirmations
```

---

## 7. N8N WORKFLOW AUTOMATIONS

All workflows run on the self-hosted n8n instance. Each workflow is described with its trigger, steps, and integration points.

### 7.1 Restaurant Workflows

#### WF-R01: WhatsApp Reservation Bot

```
Trigger:     WhatsApp webhook (guest sends message)
Flow:
  1. Receive message → extract text
  2. Claude AI intent detection:
     - "book", "reserve", "table" → RESERVATION flow
     - "menu", "what do you serve" → MENU flow
     - "order", "takeaway" → ORDER flow
     - "feedback", "complaint" → FEEDBACK flow
     - Other → GENERAL response
  3. RESERVATION flow:
     a. Claude extracts: date, time, party size, name (asks if missing)
     b. Call check-table-availability Edge Function
     c. If available → create reservation → send confirmation
     d. If unavailable → suggest alternatives → loop
     e. Schedule reminder (WF-R02)
  4. Store all messages in communications table
```

#### WF-R02: Reservation Reminders

```
Trigger:     Cron (runs every 15 minutes)
Flow:
  1. Query reservations WHERE date = today AND time - 2 hours <= now
     AND status = 'confirmed' AND reminder_sent = false
  2. For each: send WhatsApp reminder with details + "Reply C to confirm or X to cancel"
  3. Update status to 'reminder_sent'
  4. Handle responses: C → keep confirmed, X → cancel + free table
```

#### WF-R03: Post-Dining Feedback

```
Trigger:     Cron (every 30 minutes)
Flow:
  1. Query reservations WHERE status = 'completed'
     AND completed_at > (now - 2hr) AND feedback_requested = false
  2. For each: send WhatsApp Flow (rating + comment form)
  3. On response:
     a. Store in feedback table
     b. Claude API → sentiment analysis → update record
     c. Rating ≥ 4 → send Google Reviews link
     d. Rating ≤ 2 → Telegram alert to manager
  4. Mark feedback_requested = true
```

#### WF-R04: Shift Notification Cycle

```
Trigger:     Cron (Sunday 18:00)
Flow:
  1. Query shifts for upcoming week
  2. Group by staff_member
  3. For each staff member with Telegram:
     a. Generate schedule summary
     b. Send Telegram message with inline buttons [Confirm All | View Details]
  4. Sub-workflow: Individual shift reminder (8hr before)
     a. Send Telegram with shift details
     b. If not confirmed by 4hr before → escalate to manager
```

#### WF-R05: Shift Swap Handler

```
Trigger:     Telegram inline button "Request Swap"
Flow:
  1. Staff requests swap on specific shift
  2. Query eligible staff (same role, available, not scheduled)
  3. Send Telegram to eligible staff: "Can you cover [shift details]?" [Accept | Decline]
  4. First acceptance → notify manager [Approve | Reject]
  5. On manager approval → update shift → notify both staff
```

#### WF-R06: Temperature Excursion Alert

```
Trigger:     Supabase webhook (temperature_logs INSERT WHERE is_in_range = false)
Flow:
  1. Get equipment details + on-duty manager
  2. Send Telegram to manager:
     "⚠️ TEMP ALERT: [Equipment] at [X°C] (should be [threshold])
      Action required. Reply with corrective action."
  3. Wait 15 minutes
  4. Check if corrective_action logged
  5. If not → escalate to owner
  6. If logged → verify follow-up temp reading
```

#### WF-R07: Load Shedding Protocol

```
Trigger:     Manual trigger OR EskomSePush API webhook
Flow:
  1. Create loadshedding_event record
  2. Get all active cold storage equipment
  3. Send Telegram broadcast: "⚡ LOAD SHEDDING ACTIVATED - Stage [X]"
  4. For each equipment item:
     a. Log starting temperature
     b. Start countdown timer (4 hours)
     c. At 2hr → Telegram: "Check [equipment] temperature now"
     d. At 3hr → Telegram: "URGENT: [equipment] approaching limit"
     e. At 3.5hr → Telegram: "CRITICAL: Prepare to discard if needed"
     f. At 4hr → Telegram: "⛔ 4HR LIMIT: Discard items in danger zone"
  5. On power restore → prompt final temp readings → close event
```

#### WF-R08: Daily Operations Digest

```
Trigger:     Cron (06:00 daily)
Flow:
  1. Pull from Supabase:
     - Yesterday: revenue (if POS), covers, avg feedback rating, waste value,
       staff hours/overtime, checklist completion rate
     - Today: reservation count, events scheduled, staff on duty, low-stock items,
       expiring compliance docs
  2. Claude AI → generate natural-language summary with insights
  3. Send to management Telegram group
```

#### WF-R09: Inventory Reorder

```
Trigger:     Supabase webhook (inventory_items UPDATE WHERE current_qty < min_level)
Flow:
  1. Get item details + supplier
  2. Generate draft PO in Supabase
  3. Telegram to manager: "[Item] below minimum. PO draft created for [Supplier]. [Approve | Edit | Skip]"
  4. On approve → send PO to supplier via WhatsApp or email
  5. Update PO status to 'sent'
```

### 7.2 Events Workflows

#### WF-E01: Event Inquiry Response

```
Trigger:     Web form submission OR WhatsApp inquiry
Flow:
  1. Create event record (status: inquiry)
  2. Create/link contact record
  3. Claude AI → generate acknowledgment email/WhatsApp
  4. Send response
  5. Schedule follow-ups: Day 3, Day 7
  6. Telegram notify event coordinator
```

#### WF-E02: Event Countdown Automation

```
Trigger:     Cron (daily 08:00)
Flow:
  1. Query events within next 30 days
  2. For each event, check:
     a. Contract unsigned → WhatsApp/email client
     b. Deposit unpaid → payment reminder
     c. Vendors unconfirmed → alert coordinator
     d. Checklists incomplete → notify assigned staff
     e. RSVPs pending (>50%) → bulk WhatsApp reminders to guests
     f. Dietary summary not generated → auto-generate for kitchen
  3. At 7 days: send final details summary to client
  4. At 1 day: send detailed run sheet to all assigned staff via Telegram
```

#### WF-E03: RSVP Collection

```
Trigger:     WhatsApp message from event guest
Flow:
  1. Match guest to event_guests record (by phone)
  2. WhatsApp Flow: Attending? [Yes | No | Maybe]
  3. If Yes → dietary requirements? → meal choice? → accommodation needed?
  4. Update event_guests record
  5. If accommodation → check availability in Accommodation Module
  6. Send confirmation with QR code for check-in
  7. Update guest count → Telegram to coordinator
```

#### WF-E04: Event Day Live Updates

```
Trigger:     Telegram bot commands during event
Flow:
  1. Staff marks timeline item as "started" or "completed"
  2. Update event_timeline_items status
  3. If item delayed → notify coordinator + adjust subsequent items
  4. 15 minutes before next item → Telegram reminder to assigned staff/vendor
  5. Client dashboard updates in real-time via Supabase Realtime
```

---

## 8. WHATSAPP GUEST AI

### Architecture

```
Guest WhatsApp Message
  ↓
WhatsApp Business Cloud API (360dialog BSP)
  ↓
Webhook → Supabase Edge Function (restaurant-whatsapp-webhook)
  ↓
n8n Workflow (WF-R01)
  ↓
Claude API (intent detection + response generation)
  ↓
Supabase (data operations)
  ↓
WhatsApp reply to guest
```

### Supported Intents

| Intent | Trigger Words | Action |
|--------|--------------|--------|
| Reservation | "book", "table", "reserve", "reservation" | Check availability → book → confirm |
| Menu | "menu", "what do you serve", "specials" | Send digital menu link or catalog |
| Hours | "open", "hours", "when", "closed" | Return operating hours |
| Location | "where", "address", "directions", "parking" | Send location + Google Maps link |
| Order | "order", "takeaway", "delivery" | Walk through menu → cart → PayFast link |
| Feedback | "feedback", "complaint", "manager", "unhappy" | Trigger feedback form or escalate |
| Loyalty | "loyalty", "rewards", "points" | Return visit count + available offers |
| Event Inquiry | "event", "function", "wedding", "birthday venue" | Route to Events Module |
| General | anything else | Claude responds naturally from restaurant context |

### WhatsApp Flows (Interactive Forms)

Build these as WhatsApp Flows (JSON-defined screens):

1. **Reservation Flow**: Date picker → Time picker → Party size → Name → Special requests → Confirm
2. **Feedback Flow**: Star rating → Category ratings → Comment → Submit
3. **RSVP Flow**: Attending? → Dietary needs → Meal choice → Accommodation? → Confirm
4. **Order Flow**: Browse categories → Select items → Customize → Review cart → Payment

### Cost Management

```
Service messages (guest-initiated):        FREE (since Nov 2024)
Utility templates (within 24hr window):    FREE
Marketing templates (proactive outreach):  ~R0.45/message
BSP fee (360dialog):                       €0.005/conversation or flat monthly

Strategy: Keep most communication within service windows (free).
Only use marketing templates for reservation reminders and post-event follow-ups.
Estimated cost per restaurant: R200-R500/month for 100-300 proactive messages.
```

---

## 9. TELEGRAM STAFF AI

### Architecture

```
Staff Telegram Message
  ↓
Telegram Bot API (direct, no BSP)
  ↓
Webhook → n8n OR Supabase Edge Function
  ↓
Claude API (for SOP queries, analytics)
  ↓
Supabase (data operations)
  ↓
Telegram reply to staff
```

### Bot Commands

| Command | Action |
|---------|--------|
| /schedule | Show my upcoming shifts |
| /today | Today's briefing (reservations, events, tasks) |
| /swap [shift_id] | Request shift swap |
| /temp [equipment] [value] | Log temperature reading |
| /checklist | Show pending checklists |
| /sop [query] | Search SOPs with Claude AI |
| /86 [item] | Mark menu item as unavailable |
| /stock [item] | Check current stock level |
| /help | List all commands |

### Inline Buttons (Used in Notifications)

```
Shift notification:     [Confirm ✅] [Swap 🔄] [Decline ❌]
Swap request:           [Accept ✅] [Decline ❌]
Manager approval:       [Approve ✅] [Reject ❌] [Details 📋]
Temp excursion:         [Log Action 📝] [Dismiss ⚠️]
PO approval:            [Approve ✅] [Edit ✏️] [Skip ⏭️]
Event timeline:         [Started ▶️] [Completed ✅] [Delayed ⏰]
```

### Telegram Group Structure

```
Restaurant Operations Bot
├── #management (owner + managers — daily digest, alerts, approvals)
├── #kitchen (chefs + cooks — menu updates, 86s, prep lists)
├── #floor (servers + hosts — reservations, VIP alerts, table status)
├── #events (coordinators + event staff — event updates, timelines)
└── Direct messages (individual shifts, personal schedules, SOP queries)
```

### Why Telegram (Not WhatsApp) for Staff

```
✅ Completely free — no per-message cost (vs. WhatsApp API fees)
✅ No 24-hour messaging windows — send anytime
✅ 2GB file sharing (vs. 100MB on WhatsApp)
✅ Forum topics for departmental threading
✅ Rich bot capabilities with inline keyboards
✅ No BSP needed — direct API integration
✅ Groups + channels + bot in one platform
✅ Pin messages, scheduled messages, polls
✅ Desktop + mobile client (staff can use either)
```

---

## 10. CLAUDE AI INTEGRATION POINTS

All AI features use **claude-sonnet-4-20250514** via the Anthropic API. Key integration points:

### 10.1 Guest Communication (via n8n)

- Intent detection from WhatsApp messages
- Natural language reservation handling
- Menu recommendations based on dietary preferences
- Feedback sentiment analysis
- Automated response generation for common queries

### 10.2 SOP Intelligence

- **SOP Generation**: Manager provides brief description → Claude generates full formatted SOP
- **SOP Search**: Staff question → embed with text-embedding-3-small → pgvector similarity search → Claude generates contextual answer from relevant SOPs
- **Training Quiz Generation**: Claude generates quiz questions from published SOPs

### 10.3 Operations Analytics

- **Daily Digest**: Claude summarizes operational data into natural-language insights
- **Menu Engineering**: Classify items (Star/Puzzle/Plowhorse/Dog) based on popularity + profitability
- **Feedback Insights**: Monthly sentiment trends, topic extraction, actionable recommendations
- **Scheduling Suggestions**: Analyze historical data → suggest optimal staffing levels per shift

### 10.4 Content Generation (via CRMM Module)

- Event proposals and emails
- Social media posts for restaurant specials/events
- Marketing campaign content
- Review response drafts

### 10.5 Technical Implementation

```typescript
// Claude AI service (shared across modules)
// Location: src/lib/ai/claude.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Intent detection for WhatsApp messages
export async function detectIntent(message: string, context: object) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `You are a restaurant AI assistant. Detect intent from guest messages.
             Return JSON: { "intent": "reservation|menu|order|feedback|hours|location|event|general",
                           "extracted": { ...relevant data... } }`,
    messages: [{ role: 'user', content: `Context: ${JSON.stringify(context)}\n\nMessage: ${message}` }],
  });
  return JSON.parse(response.content[0].text);
}

// SOP semantic search
export async function searchSOPs(query: string, tenantId: string) {
  // 1. Generate embedding
  // 2. pgvector similarity search on sops table
  // 3. Pass top results to Claude for contextual answer
}

// Sentiment analysis
export async function analyzeSentiment(feedback: string) {
  // Returns: { sentiment, score, topics[] }
}
```

---

## 11. CROSS-MODULE INTEGRATION

### Integration Map

```
                    ┌──────────────┐
                    │   CONTACTS   │ ← Universal entity
                    │   (shared)   │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │    CRMM     │ │ RESTAURANT  │ │ACCOMMODATION│
    │             │ │             │ │             │
    │ Marketing   │ │ Guest CRM   │ │ Bookings    │
    │ Social      │◄─► Feedback   │◄─► Availability│
    │ Email       │ │ Menus       │ │ Guest Dash  │
    │ Analytics   │ │ Staff       │ │ Lodge Mgmt  │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                    ┌──────▼──────┐
                    │   EVENTS    │
                    │  (add-on)   │
                    │             │
                    │ Links to    │
                    │ all three   │
                    │ modules     │
                    └─────────────┘
```

### Specific Integration Points

**Restaurant ↔ CRMM:**
- Guest contacts sync bidirectionally
- Restaurant feedback feeds CRMM analytics dashboard
- CRMM social media automation promotes restaurant specials
- CRMM email campaigns target restaurant guests (by visit history, preferences)
- Claude AI content generation shared

**Restaurant ↔ Accommodation:**
- Lodge guest gets WhatsApp offering dinner reservation at lodge restaurant
- Accommodation booking can auto-create restaurant reservation (via n8n)
- Shared guest profile: dietary preferences captured in restaurant available for lodge
- Unified communications log

**Events ↔ Restaurant:**
- Event catering uses restaurant menu items + recipe costing
- Event staffing draws from restaurant staff pool (with conflict detection)
- Event food safety uses restaurant R638 checklists
- Event feedback uses restaurant feedback system

**Events ↔ Accommodation:**
- Event accommodation blocks reserve lodge rooms
- Event guests linked to accommodation bookings
- Multi-day events (bush weddings, retreats) managed across both modules

**Events ↔ CRMM:**
- Event leads/contacts sync to CRMM
- Claude AI generates event marketing content via CRMM pipeline
- Social media event promotion via CRMM automation

---

## 12. SOUTH AFRICAN COMPLIANCE & CONTEXT

### R638 Food Safety Regulations

The Regulations Governing General Hygiene Requirements for Food Premises (R638) under the Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972. The system must help restaurants achieve and maintain compliance.

**Key Requirements Built Into the System:**

```
1. Certificate of Acceptability (CoA)
   - Required before opening any food premises
   - Valid for 24 months (track + renewal reminders)
   - Application to local municipality health department

2. Temperature Control (Annexure 2)
   - Frozen: ≤ -18°C
   - Chilled: ≤ 5°C
   - Hot holding: ≥ 60°C
   - Danger zone: 5°C – 60°C (max 4 hours)
   - Cooking: poultry ≥74°C, minced ≥70°C, reheating ≥70°C
   - Cooling: 70→21°C within 2hr, 21→5°C within 4hr

3. Record Keeping (Section 4)
   - Temperature logs (our temp monitoring system)
   - Cleaning schedules (our checklists)
   - Pest control records
   - Staff health certificates
   - Training records

4. Staff Health (Section 11.2.b)
   - Food handlers must have valid health certificates
   - System tracks certificate expiry per staff member
   - Staff illness reporting workflow

5. Premises Requirements
   - Handwashing facilities (checked in checklists)
   - Separate storage areas
   - Adequate ventilation
   - Pest control measures

6. Food Handler Training
   - All food handlers must be trained
   - System tracks SOP acknowledgments as training evidence
   - Training programs with completion records
```

### BCEA (Basic Conditions of Employment Act) — Labor

See Section 4.1 for full BCEA rules built into scheduling.

### Other Compliance

```
- Liquor License: type, number, expiry, display requirements
- Fire Certificate: annual renewal, extinguisher checks
- Gas Certificate: if applicable, annual inspection
- Electrical Certificate of Compliance
- POPI Act: data privacy for guest information
- Consumer Protection Act: pricing display, allergen disclosure
```

---

## 13. LOAD SHEDDING RESILIENCE

This is a CRITICAL differentiator. No global competitor addresses this.

### Frontend (PWA Offline-First)

```
Implementation:
- next-pwa service worker with workbox
- Cache critical pages: schedule, checklists, menu, SOP viewer
- IndexedDB for offline data:
  - Checklist completions queue
  - Temperature log queue
  - Time clock entries queue
- Background sync: when connectivity returns, batch-upload queued data
- Visual indicator: "Offline Mode" banner when disconnected

Priority pages for offline:
1. Checklist completion (staff must continue regardless of power)
2. Temperature logging (CRITICAL during outage)
3. Staff schedule viewer
4. SOP viewer (cached SOPs)
5. Time clock (clock in/out stored locally)
```

### Backend (n8n Workflows)

```
Load shedding workflow (WF-R07):
- Triggered manually or via EskomSePush API
- Activates enhanced monitoring mode
- Sends Telegram broadcasts (Telegram works on mobile data)
- 4-hour countdown timers per cold storage unit
- Decision support: discard vs. keep based on elapsed time + starting temp
- All actions logged for insurance/compliance purposes
```

### Temperature Monitoring During Outage

```
Scenario: Power goes out at 14:00, Fridge was 3°C

14:00 - ⚡ Load shedding detected → enhanced mode activated
14:00 - 📱 Telegram: "Power out. Fridge at 3°C. DO NOT open unless necessary."
16:00 - 📱 Telegram: "2 HOURS: Check fridge temp now. Log via /temp"
17:00 - 📱 Telegram: "3 HOURS: URGENT check. Approaching danger zone."
17:30 - 📱 Telegram: "3.5 HOURS: If above 5°C, prepare discard list."
18:00 - 📱 Telegram: "⛔ 4 HOURS: Items above 5°C must be discarded. Log waste."

If power returns at 16:30:
16:30 - ⚡ Power restored → prompt all equipment temp readings
16:30 - ✅ If all in range → close event
16:30 - ⚠️ If any out of range → flag for corrective action
```

---

## 14. PRICING & SUBSCRIPTION TIERS

### Restaurant Module

| Tier | Monthly | Annual (15% off) | Target |
|------|---------|-------------------|--------|
| **Starter** | R799 | R679/mo | Single café/takeaway, ≤15 staff |
| **Professional** | R1,999 | R1,699/mo | Mid-size restaurant, ≤3 locations, ≤40 staff |
| **Premium** | R3,999 | R3,399/mo | Restaurant groups, hotel restaurants, unlimited |

### Events Module (Add-on)

| Add-on to | Monthly |
|-----------|---------|
| Restaurant Professional | +R799 |
| Restaurant Premium | Included |
| Standalone (venue-only) | R1,499 |

### What's Included Per Tier

**Starter (R799):**
- 1 location, up to 15 staff
- Basic scheduling (shifts, time clock)
- 5 digital checklists (templates included)
- Basic temperature logging (manual)
- WhatsApp reservation bot (100 reservations/month)
- Digital menu with QR code
- Basic guest feedback
- Telegram notifications
- Email support

**Professional (R1,999):**
- Up to 3 locations, 40 staff
- Full scheduling with swap management + BCEA compliance alerts
- Unlimited checklists with photo verification
- Full temperature monitoring (Bluetooth probe support)
- Load shedding mode
- SOP management with AI search
- Table management with floor plan editor
- Basic inventory (stock counts, par levels, waste logging)
- Guest CRM with visit history
- Unlimited WhatsApp reservations
- Claude AI Telegram SOP queries
- Analytics dashboard
- Priority email + WhatsApp support

**Premium (R3,999):**
- Unlimited locations + staff
- Everything in Professional
- AI auto-scheduling suggestions
- Full inventory with recipe costing + POs
- Claude AI menu engineering + feedback analysis
- Advanced analytics (labor %, food cost %, forecasting)
- API access (POS integration)
- CRMM module integration
- Accommodation module integration
- Events module included
- Custom SOP generation via Claude
- Multi-language support
- Dedicated account manager

### PayFast Integration

```
- All subscriptions via PayFast recurring billing
- Monthly or annual billing cycles
- 14-day free trial (full Professional features)
- Upgrade/downgrade mid-cycle (prorated)
- Module add-ons as separate subscription items
```

---

## 15. BUILD PHASES & ROADMAP

### Phase 1: Operations Foundation (Weeks 1–8)

**Goal:** Solve the #1 daily pain — scheduling, checklists, and staff communication.

```
Week 1-2: Project setup + database
  - Next.js 14 project scaffold (App Router, TypeScript, Tailwind, shadcn/ui)
  - Supabase project setup (all Restaurant + Events tables, RLS policies, indexes)
  - Auth setup (magic link + tenant JWT claims)
  - Tenant onboarding flow

Week 3-4: Staff management + scheduling
  - Staff CRUD (profiles, roles, availability)
  - Schedule builder (drag-and-drop weekly view)
  - Shift templates
  - Time clock (mobile, GPS geofencing)
  - BCEA violation detection

Week 5-6: Checklists + Telegram bot
  - Checklist builder
  - Checklist completion (mobile-first, photo capture)
  - Pre-built templates (R638 aligned)
  - Telegram bot setup (commands: /schedule, /today, /checklist)
  - Shift notification workflow (WF-R04)

Week 7-8: Testing + pilot
  - PWA setup (offline support for checklists + schedules)
  - Integration testing
  - Pilot with first restaurant client
  - Iterate based on feedback
```

### Phase 2: Food Safety & Compliance (Weeks 9–14)

**Goal:** R638 compliance, temperature monitoring, load shedding resilience.

```
Week 9-10: Temperature monitoring
  - Equipment registry
  - Manual temperature logging (mobile form)
  - Threshold validation + excursion alerts (WF-R06)
  - Photo verification for corrective actions
  - Temperature dashboard

Week 11-12: Compliance + load shedding
  - Compliance document tracker (CoA, fire cert, liquor license)
  - Expiry reminders
  - Load shedding mode (WF-R07)
  - Offline-first PWA enhancements
  - Load shedding event logging
  - Waste logging tied to loadshedding events

Week 13-14: SOP management
  - SOP editor (markdown + images)
  - Categories, roles, versioning
  - Acknowledgment tracking
  - pgvector embeddings for semantic search
  - Claude AI SOP search via Telegram (/sop command)
  - Claude AI SOP generation
```

### Phase 3: Guest Experience (Weeks 15–22)

**Goal:** WhatsApp-native reservations, digital menu, feedback loop — the growth engine.

```
Week 15-16: Menu management
  - Menu CRUD (categories, items, allergens, dietary tags)
  - Digital menu viewer (public, mobile-friendly)
  - QR code generation
  - 86 functionality (real-time availability)

Week 17-18: Table & reservation management
  - Floor plan editor (react-konva)
  - Table CRUD
  - Reservation CRUD (manual creation)
  - Availability engine

Week 19-20: WhatsApp integration
  - 360dialog BSP setup
  - WhatsApp webhook → n8n
  - Reservation bot (WF-R01)
  - Reminder workflow (WF-R02)
  - WhatsApp Flows (reservation form, feedback form)

Week 21-22: Guest feedback + CRM
  - Post-dining feedback workflow (WF-R03)
  - Claude sentiment analysis
  - Google Review routing
  - Guest CRM (visit history, preferences, VIP)
  - Contact sync with CRMM module
```

### Phase 4: Inventory & Intelligence (Weeks 23–30)

**Goal:** Food cost visibility, AI-powered insights, full intelligence layer.

```
Week 23-24: Inventory basics
  - Item catalog, categories, suppliers
  - Stock count (mobile-friendly)
  - Par levels + low-stock alerts (WF-R09)
  - Purchase order generation + WhatsApp to supplier

Week 25-26: Recipe costing + waste
  - Recipe builder (link ingredients to menu items)
  - Food cost calculation per item
  - Waste logging with reason codes + photos
  - Food cost reports (actual vs. theoretical)

Week 27-28: Claude AI analytics
  - Menu engineering (Star/Puzzle/Plowhorse/Dog)
  - Daily operations digest (WF-R08)
  - Feedback sentiment trending
  - Scheduling suggestions based on historical patterns

Week 29-30: Polish + Events Module MVP
  - Advanced analytics dashboard
  - API endpoints for future POS integration
  - Begin Events Module: event CRUD, pipeline, timeline builder
  - Events + Accommodation Module cross-linking
```

### Phase 5: Events Module Full Build (Weeks 31–40)

```
Week 31-32: Event CRM + pipeline
Week 33-34: Vendor management + budget tracking
Week 35-36: Timeline/run sheets + BEO generation
Week 37-38: Guest list + RSVP (WhatsApp Flows)
Week 39-40: Staff planning + checklists + cross-module testing
```

---

## 16. PROJECT STRUCTURE

```
draggonnb-restaurant/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── Claude.md                          ← THIS FILE
│
├── public/
│   ├── manifest.json                  ← PWA manifest
│   └── sw.js                          ← Service worker
│
├── src/
│   ├── app/                           ← Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                   ← Landing / login
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (dashboard)/               ← Protected routes
│   │   │   ├── layout.tsx             ← Sidebar + nav
│   │   │   ├── dashboard/             ← Overview dashboard
│   │   │   ├── schedule/              ← Staff scheduling
│   │   │   │   ├── page.tsx           ← Weekly schedule view
│   │   │   │   ├── builder/           ← Schedule builder
│   │   │   │   └── availability/      ← Staff availability
│   │   │   ├── staff/                 ← Staff management
│   │   │   │   ├── page.tsx           ← Staff list
│   │   │   │   ├── [id]/             ← Staff profile
│   │   │   │   └── time-clock/        ← Clock in/out
│   │   │   ├── checklists/            ← Checklists
│   │   │   │   ├── page.tsx           ← Active checklists
│   │   │   │   ├── builder/           ← Create/edit
│   │   │   │   ├── complete/[id]/     ← Complete a checklist
│   │   │   │   └── history/           ← Completion history
│   │   │   ├── food-safety/           ← Temperature + compliance
│   │   │   │   ├── temperature/       ← Temp dashboard + logging
│   │   │   │   ├── equipment/         ← Equipment registry
│   │   │   │   ├── compliance/        ← Document tracker
│   │   │   │   └── loadshedding/      ← Load shedding events
│   │   │   ├── sops/                  ← SOP management
│   │   │   │   ├── page.tsx           ← SOP library
│   │   │   │   ├── editor/            ← Create/edit SOP
│   │   │   │   └── training/          ← Training programs
│   │   │   ├── menu/                  ← Menu management
│   │   │   │   ├── page.tsx           ← Menu overview
│   │   │   │   ├── editor/            ← Menu item CRUD
│   │   │   │   └── recipes/           ← Recipe costing
│   │   │   ├── tables/                ← Floor plan + tables
│   │   │   │   ├── page.tsx           ← Floor plan view
│   │   │   │   └── editor/            ← Floor plan editor
│   │   │   ├── reservations/          ← Reservations
│   │   │   │   ├── page.tsx           ← Calendar view
│   │   │   │   └── [id]/             ← Reservation detail
│   │   │   ├── inventory/             ← Stock management
│   │   │   │   ├── page.tsx           ← Stock levels
│   │   │   │   ├── count/             ← Stock count
│   │   │   │   ├── suppliers/         ← Supplier management
│   │   │   │   ├── purchase-orders/   ← PO management
│   │   │   │   └── waste/             ← Waste logging
│   │   │   ├── guests/                ← Guest CRM
│   │   │   │   ├── page.tsx           ← Guest list
│   │   │   │   ├── [id]/             ← Guest profile
│   │   │   │   └── feedback/          ← Feedback dashboard
│   │   │   ├── events/                ← Events module
│   │   │   │   ├── page.tsx           ← Event calendar/pipeline
│   │   │   │   ├── [id]/             ← Event detail
│   │   │   │   ├── [id]/timeline/     ← Run sheet builder
│   │   │   │   ├── [id]/guests/       ← Guest list + RSVPs
│   │   │   │   ├── [id]/budget/       ← Budget tracker
│   │   │   │   ├── [id]/staff/        ← Staff assignments
│   │   │   │   ├── [id]/vendors/      ← Vendor assignments
│   │   │   │   ├── [id]/checklists/   ← Event checklists
│   │   │   │   └── vendors/           ← Vendor database
│   │   │   ├── analytics/             ← Reports + insights
│   │   │   └── settings/              ← Restaurant settings
│   │   └── api/                       ← API routes
│   │       ├── whatsapp/webhook/      ← WhatsApp webhook
│   │       ├── telegram/webhook/      ← Telegram webhook
│   │       ├── menu/public/           ← Public digital menu
│   │       ├── reservations/          ← Reservation API
│   │       ├── payfast/webhook/       ← Payment webhook
│   │       └── cron/                  ← Vercel cron triggers
│   │
│   ├── components/                    ← Shared components
│   │   ├── ui/                        ← shadcn/ui primitives
│   │   ├── layout/                    ← Sidebar, nav, header
│   │   ├── schedule/                  ← Schedule components
│   │   ├── checklists/                ← Checklist components
│   │   ├── temperature/               ← Temp monitoring components
│   │   ├── floor-plan/                ← react-konva floor plan
│   │   ├── menu/                      ← Menu display components
│   │   ├── events/                    ← Event-specific components
│   │   └── shared/                    ← Data tables, forms, modals
│   │
│   ├── lib/                           ← Core utilities
│   │   ├── supabase/
│   │   │   ├── client.ts              ← Browser client
│   │   │   ├── server.ts              ← Server client
│   │   │   ├── admin.ts               ← Service role client
│   │   │   └── types.ts               ← Generated types
│   │   ├── ai/
│   │   │   ├── claude.ts              ← Claude API wrapper
│   │   │   ├── intents.ts             ← Intent detection
│   │   │   ├── sentiment.ts           ← Sentiment analysis
│   │   │   └── embeddings.ts          ← SOP vector embeddings
│   │   ├── whatsapp/
│   │   │   ├── client.ts              ← 360dialog API client
│   │   │   ├── flows.ts               ← WhatsApp Flow definitions
│   │   │   └── templates.ts           ← Message templates
│   │   ├── telegram/
│   │   │   ├── bot.ts                 ← Telegram Bot API client
│   │   │   ├── commands.ts            ← Bot command handlers
│   │   │   └── keyboards.ts           ← Inline keyboard builders
│   │   ├── payfast/
│   │   │   ├── client.ts              ← PayFast API
│   │   │   └── webhooks.ts            ← Webhook validation
│   │   ├── compliance/
│   │   │   ├── r638.ts                ← R638 rules engine
│   │   │   ├── bcea.ts                ← BCEA labor law rules
│   │   │   └── thresholds.ts          ← Temperature thresholds
│   │   └── utils/
│   │       ├── dates.ts               ← SA timezone handling
│   │       ├── currency.ts            ← ZAR formatting
│   │       └── offline.ts             ← Offline queue manager
│   │
│   ├── hooks/                         ← React hooks
│   │   ├── useSupabase.ts
│   │   ├── useRealtime.ts
│   │   ├── useOfflineQueue.ts
│   │   └── useTenant.ts
│   │
│   └── types/                         ← TypeScript types
│       ├── database.ts                ← Supabase generated types
│       ├── restaurant.ts
│       ├── events.ts
│       └── api.ts
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                    ← SQL migrations
│   │   ├── 001_core_tables.sql
│   │   ├── 002_restaurant_tables.sql
│   │   ├── 003_events_tables.sql
│   │   ├── 004_rls_policies.sql
│   │   ├── 005_indexes.sql
│   │   ├── 006_functions.sql          ← DB functions + triggers
│   │   └── 007_seed_templates.sql     ← Pre-built checklists, SOPs
│   └── functions/                     ← Edge Functions
│       ├── restaurant-whatsapp-webhook/
│       ├── restaurant-telegram-webhook/
│       ├── check-table-availability/
│       ├── create-reservation/
│       ├── log-temperature/
│       ├── clock-in-out/
│       ├── generate-digital-menu/
│       ├── event-rsvp-webhook/
│       ├── event-guest-checkin/
│       ├── generate-beo/
│       └── payfast-webhook/
│
└── n8n/                               ← Workflow export files
    ├── WF-R01-whatsapp-reservation.json
    ├── WF-R02-reservation-reminders.json
    ├── WF-R03-post-dining-feedback.json
    ├── WF-R04-shift-notifications.json
    ├── WF-R05-shift-swap-handler.json
    ├── WF-R06-temp-excursion-alert.json
    ├── WF-R07-loadshedding-protocol.json
    ├── WF-R08-daily-digest.json
    ├── WF-R09-inventory-reorder.json
    ├── WF-E01-event-inquiry.json
    ├── WF-E02-event-countdown.json
    ├── WF-E03-rsvp-collection.json
    └── WF-E04-event-live-updates.json
```

---

## 17. ENVIRONMENT VARIABLES

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# WhatsApp (360dialog)
WHATSAPP_API_URL=https://waba.360dialog.io/v1
WHATSAPP_API_KEY=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=xxx

# Telegram
TELEGRAM_BOT_TOKEN=xxx:yyy
TELEGRAM_WEBHOOK_SECRET=xxx

# PayFast
PAYFAST_MERCHANT_ID=xxx
PAYFAST_MERCHANT_KEY=xxx
PAYFAST_PASSPHRASE=xxx
PAYFAST_SANDBOX=true
NEXT_PUBLIC_PAYFAST_SANDBOX=true

# n8n
N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook
N8N_API_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://restaurant.draggonnb.app
NEXT_PUBLIC_APP_NAME=DraggonnB Restaurant
NODE_ENV=development

# EskomSePush (load shedding API)
ESP_API_TOKEN=xxx
```

---

## 18. DEPLOYMENT

### Vercel

```bash
# Auto-deploy from GitHub
# Branch: main → Production
# Branch: develop → Preview

# Vercel settings:
Framework: Next.js
Build Command: npm run build
Output Directory: .next
Node.js Version: 20.x

# Environment variables: set in Vercel dashboard
# Domain: restaurant.draggonnb.app
```

### Supabase

```bash
# Migrations
npx supabase db push

# Edge Functions
npx supabase functions deploy restaurant-whatsapp-webhook
npx supabase functions deploy restaurant-telegram-webhook
# ... deploy all functions

# Generate types
npx supabase gen types typescript --linked > src/types/database.ts
```

### n8n Workflows

```
Import workflow JSON files via n8n UI or API
Configure credentials:
  - Supabase (service role key)
  - Claude AI (API key)
  - WhatsApp (360dialog)
  - Telegram (bot token)
  - PayFast
  - Email (SMTP)
```

---

## 19. DEVELOPMENT GUIDELINES

### Code Standards

```
- TypeScript strict mode (no any types)
- ESLint + Prettier
- Conventional commits (feat:, fix:, chore:, docs:)
- Component naming: PascalCase
- File naming: kebab-case
- API routes: RESTful patterns
- Database: snake_case for columns/tables
- All monetary values in ZAR (DECIMAL(10,2) or DECIMAL(12,2))
- All timestamps in UTC, display in Africa/Johannesburg
- All phone numbers in E.164 format (+27...)
```

### Mobile-First Rules

```
- Design mobile-first, enhance for desktop
- Touch targets minimum 44x44px
- No hover-only interactions
- Bottom navigation for primary actions
- Pull-to-refresh where applicable
- Optimistic UI updates
- Max JavaScript bundle: monitor with next/bundle-analyzer
- Images: next/image with responsive srcset
- Fonts: system fonts or self-hosted (no Google Fonts CDN — load shedding)
```

### Offline-First Rules

```
- Critical paths MUST work offline: checklists, temp logging, schedule view, SOPs
- Use IndexedDB (via idb library) for offline data queue
- Service worker caches all critical route shells
- Background sync uploads queued data when online
- Visual "Offline Mode" indicator
- Never lose user data due to connectivity loss
```

### Security

```
- All tables: RLS enabled + tenant isolation policy
- JWT claims include tenant_id and role
- API routes: validate auth + tenant access
- File uploads: validate mime type + size limits
- WhatsApp webhook: verify signature
- Telegram webhook: verify secret token
- PayFast webhook: verify signature + IP whitelist
- No secrets in client-side code (use server components / API routes)
- Rate limiting on public endpoints
```

---

## END OF DOCUMENT

This Claude.md serves as the single source of truth for building the DraggonnB Restaurant & Events modules. All development should reference this document. Update it as decisions are made and features are refined.

**Next steps:**
1. Set up Next.js project with this structure
2. Run Supabase migrations (Section 6)
3. Begin Phase 1: Staff management + scheduling + checklists + Telegram bot
4. Pilot with first restaurant client after Phase 1 completion
