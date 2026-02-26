# Accommodation Module (DraggonnB / CRMM) — Proposal for Claude Code

Date: 2026-02-10  
Owner: Chris / DraggonnB  
Prepared by: XcaB (OpenClaw)

## 0) Goal
Ship a robust, opinionated **Accommodation Module** that supports lodges, guest houses, vacation rentals, and game lodges—covering the critical end-to-end flow:

- Inventory (properties/units/rooms/bedrooms)
- Booking + multi-location itinerary
- Flexible pricing + discounts + add-ons
- Guest portal (access pack, payments, rules/waivers, comms)
- Operations (readiness, SOP checklists, faults, staff notifications)
- AI-assisted onboarding + comms (bounded, auditable)

Platform stack:
- **DB/Auth/RLS:** Supabase
- **Automation:** n8n (self-hosted)
- **UI:** Vercel web app(s)
- **Dev:** Claude Code
- **Repos:** existing CRMM module / monorepo (per current setup)

Motto: cut fluff, ship the minimal system that actually runs accommodation operations.

---

## 1) Primary Personas / Roles
### 1.1 SaaS Business Admin (Accommodation Operator)
- Configure properties, units, rates, specials, staff, SOP checklists
- Monitor bookings, occupancy, payments, operational readiness
- Handle escalations and guest issues

### 1.2 Staff (Housekeeping / Maintenance / Ops)
- Daily task list (turnovers, inspections)
- Checklist completion (optional photo proof)
- Fault reporting (photo, priority)

### 1.3 Guest
- Book on the portal
- Receive/access **Access Pack** (wifi, gate codes, directions, rules)
- Pay, sign waiver, order add-ons, request service

### 1.4 Internal Ops / Human-in-the-loop
- Inbox of escalations from AI agents
- Approve/modify suggested replies
- Ensure SLA and safety

---

## 2) Core Domain Model (MVP)
### 2.1 Inventory
- **Business** (tenant)
- **Property** (location/site e.g., “Farm”, “Lodge A”)
- **Unit** (rentable object: house, chalet, room, campsite)
- **Room / Bedroom (optional layer)**
  - For "shared unit allocation" and "room assignment" use-cases.

### 2.2 Booking
- **Booking** (header: guest, dates, status)
- **BookingSegment** (ties a booking to one property/unit + date range)
  - enables multi-location itineraries (e.g., 3 lodges + 1 farm)
- **Party** (adults/children/senior categories; children age bands)

### 2.3 Money
- **RatePlan** (price basis + rule blocks)
- **Quote / PriceBreakdown** (deterministic line items)
- **ChargeLineItem** (accommodation, extras, fees, discounts, taxes)
- **Invoice** (simple, not full accounting)
- **Payment** (transactions + allocation)

### 2.4 Ops
- **Task** (turnover clean, inspection, maintenance)
- **ChecklistTemplate / ChecklistInstance** (editable per tenant)
- **Issue/Fault** (report, photos, priority, SLA)

### 2.5 Guest Experience
- **AccessPackTemplate** (per business / property)
- **AccessPackInstance** (per booking)
- **Waiver** (template + per-booking acceptance)
- **ServiceCatalog + AddOnOrder**
- **CommsTimeline** (all AI/human messages logged)

---

## 3) Shared Unit Allocation / Room Assignment (Game Lodge Scenario)
Problem: Guests book a **house/unit type** but operator wants to **assign rooms within the house**.

### 3.1 Proposed Approach
Model a “house” as a Unit that *may contain* internal allocatable capacity blocks:
- Unit (House A)
  - Room 1 (2p)
  - Room 2 (2p)
  - Room 3 (2p)

Booking flow:
- Guest books **House Type** (or the house unit) based on capacity and price basis.
- Operator can optionally assign **rooms** (room allocation) after booking, prior to arrival.

### 3.2 Constraints / Guardrails
- Room assignment is **optional**: don’t force for vacation rentals.
- If enabled, system must prevent over-allocation by room capacity.
- Pricing still driven by rate plan; room allocation is a logistics/ops layer unless explicitly configured to price per room/bedroom.

---

## 4) Pricing Engine (bounded rules)
### 4.1 Price Basis (selectable per RatePlan)
- Per person per night
- Per unit per night
- Per room per night
- Per bedroom allocation per night (for house-with-rooms)
- Per group per night (party size ranges)

### 4.2 Guest Categories
- Adult
- Child (age bands defined per tenant)
- Senior/Pensioner (age-based or flag)

### 4.3 Discount / Fee Rule Blocks
- Length-of-stay: 7+ nights = X%
- Occupancy: 4+ adults = fixed/percent adjustment
- Unit count: 3+ units = X%
- Date-range specials
- Promo codes
- Fees: cleaning, admin, tourism levy
- Deposit + cancellation policy templates

Output requirement: pricing must always produce deterministic **ChargeLineItems** so invoicing/refunds/reporting are stable.

---

## 5) Payments + Split Settlement (PayFast + platform commission)
Requirement: offer client payment solution and/or “our own payment solution” where booking through DraggonnB platforms (e.g., **www.go-x.co.za**) results in:
- immediate platform capture of **transaction costs + optional commission**
- remainder settled to accommodation operator

### 5.1 Modes
**Mode A — Client’s own gateway (merchant of record = client)**
- We redirect/charge using their PayFast/other credentials.
- We may charge SaaS subscription separately.
- Simplest compliance; least control.

**Mode B — Platform gateway (merchant of record = platform)**
- We charge guest via platform PayFast account.
- We automatically compute and retain:
  - transaction fee (actual)
  - platform commission (configurable, optional)
- We create a **Payable** to the operator for net amount.
- Settlement can be:
  - manual payouts (initial)
  - automated payouts (later) depending on provider capabilities.

### 5.2 Ledger Model (MVP)
We need minimal ledger-like primitives:
- `payment_transaction` (gateway id, amount, status)
- `payment_allocation` (allocates payment to invoice/segments)
- `platform_fee` (line item)
- `operator_payable` (net owed to operator)
- `payout` (records settlement to operator)

### 5.3 Key Functional Requirements
- Deposits and partial payments
- Refund support (full/partial)
- Audit trail
- Reconciliation exports

### 5.4 PayFast Notes
PayFast “split” depends on product capabilities (marketplace/split payments vs standard). If PayFast cannot natively split, we implement split as **internal accounting + payout** (Mode B) or default to Mode A.

Deliverable for Claude Code: implement abstraction layer:
- `PaymentProvider` interface
- `PayFastProvider` (initial)
- `MockProvider` for testing

---

## 6) Guest Portal (Access Pack + Add-ons + Requests)
Guest portal is the single place for:
- Booking confirmation + itinerary (incl multi-location)
- Pay balance / deposit
- View access instructions (time-gated)
- WiFi, directions, gate codes, photos, "turn left at gate"
- Rules + waiver acceptance tracking
- Add-on ordering (firewood, hunting service, transfers)
- Service requests (WhatsApp-driven + portal form)

### 6.1 Access Gating (policy engine)
Sensitive content unlock conditions:
- within X hours/days of arrival
- deposit paid (or pay-on-arrival allowed)
- waiver signed
- optional vehicle/person registration

Implement simple policies (configurable thresholds) rather than arbitrary scripting.

---

## 7) Operations + Staff Workflow
### 7.1 Readiness Pipeline
Per unit and per booking:
- Dirty → Cleaning scheduled → Cleaning in progress → Inspected → Ready
- Maintenance hold (blocks booking)

### 7.2 SOP Checklists
- Templates per business, editable
- Instances created from bookings/turnovers
- Optional: required photos per item
- Optional add-on: AI photo analysis (later)

### 7.3 Staff Comms (Telegram group)
- Task assignment notifications
- SLA reminders
- Fault escalation

All actions logged into `comms_timeline`.

---

## 8) AI Agents (bounded + auditable)
Two primary agents driven by OpenClaw:

### 8.1 Guest WhatsApp Agent
- Read-only scope: booking, access pack, services, FAQs for that guest
- Can create: service request tickets, add-on orders
- Escalation keywords: urgent, security, medical, access lockout
- Human-in-loop: approval queue for sensitive responses

### 8.2 Staff Ops Agent (Telegram)
- Reads tasks/issues/schedules
- Creates issues, updates tasks
- Escalates exceptions to admin dashboard

Non-negotiable:
- strict RLS / data scoping
- full audit logs
- ability to disable AI per tenant

---

## 9) AI-assisted Onboarding (web scrape + docs)
Workflow:
1) Tenant provides website/listing URLs + uploads docs (welcome pack, rules, rate sheet)
2) System scrapes public pages (with explicit permission)
3) AI extracts structured proposals:
   - properties/units/amenities
   - draft access pack
   - draft services
   - suggested rate plans
4) User reviews & approves
5) Persist to Supabase

Rule: AI proposes; human confirms.

---

## 10) Reporting (MVP)
- Occupancy: next 7/30/90 days
- Upcoming arrivals/departures
- Outstanding payments
- Readiness exceptions
- Faults by property/unit

Phase 2:
- Cost allocation & profitability

---

## 11) MVP Scope (Phase 1)
Ship first:
- Inventory (property/unit) + optional internal rooms layer (disabled by default)
- Booking + multi-segment itinerary
- Pricing: per unit + per person + guest categories + basic discounts
- Add-ons catalog + orders
- Guest portal: access pack + waiver + pay
- Ops readiness: tasks + checklists + fault reports
- Telegram staff notifications (basic)
- Payment provider abstraction + PayFast integration (Mode A + Mode B accounting if feasible)

---

## 12) Suggested Implementation Plan (Claude Code)
### 12.1 Supabase Tables (draft list)
- business, property, unit, unit_room
- rate_plan, rate_rule
- booking, booking_segment, booking_party_member
- quote, charge_line_item
- invoice, payment_transaction, payment_allocation, operator_payable, payout
- service_item, add_on_order, add_on_order_item
- access_pack_template, access_pack_instance, waiver_template, waiver_acceptance
- task, checklist_template, checklist_instance, checklist_item_instance
- issue_fault
- comms_timeline

### 12.2 RLS / Access Scopes
- Guest: only their booking + access pack + their invoices/payments
- Staff: tasks/issues for assigned properties
- Admin: all within business tenant

### 12.3 API Surface (Next.js / server actions)
- availability search + quote
- booking create/confirm
- payment init webhook verify
- guest portal endpoints
- staff ops endpoints

---

## 13) Open Questions / Decisions
1) PayFast split capability: native split vs internal net + payout.
2) Do we support OTA imports in v1? (recommend: later)
3) Deposit policy templates vs fully custom cancellation policies.
4) Room assignment: is it limited to internal ops or exposed to guests?

---

## 14) Acceptance Criteria (Phase 1)
- Create property + units; optionally define rooms
- Configure rate plan and a basic discount
- Guest can book multi-unit and (optionally) multi-location itinerary
- Pricing outputs deterministic line items; invoices generated
- PayFast payment can be initiated and recorded; booking status updates
- Guest portal provides time-gated wifi/directions and captures waiver acceptance
- Ops tasks/checklists created automatically around check-in/out
- Staff can complete tasks and report faults; admin sees dashboard exceptions

---

## 15) What to build next (Phase 2)
- Advanced pricing (seasonality, min nights, yield curves)
- AI comms + photo analysis as paid add-ons
- Cost allocation and profitability
- Automated payouts if provider supports
