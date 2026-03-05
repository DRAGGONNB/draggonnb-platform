# Roadmap: DraggonnB OS

## Overview

DraggonnB OS is a production-deployed multi-tenant B2B operating system for South African SMEs. The v1 roadmap (7 phases) is complete. The platform has been restructured from per-client isolation to shared DB + RLS multi-tenant architecture. A full UI rebrand to the DraggonnB logo identity has been applied.

## Completed Work

### v1 Roadmap (All 7 Phases Complete)

| Phase | Title | Completed |
|-------|-------|-----------|
| 1 | Security & Auth Hardening | 2026-02-03 |
| 2 | Core Module Completion | 2026-02-04 |
| 3 | Landing Page & Public UI | 2026-02-09 |
| 4 | N8N Automation | 2026-02-09 |
| 5 | Social Media Integration | 2026-02-05 |
| 6 | Client Provisioning | 2026-02-05 |
| 7 | Testing & Hardening | 2026-02-05 |

### v2 BOS (Phases A-E Complete -- 2026-02-14)
- Phase A: CLAUDE.md hierarchy, error catalogue, module manifest
- Phase B: Provisioning steps 6-8, brand theming, manifest integration
- Phase C: Build reviewer agent, quality system
- Phase D: Ops dashboard schema (deferred until 5+ clients)
- Phase E: ClientOnboardingAgent, AI ops architecture

### Architecture Restructure (2026-02-14)
- Shared DB + RLS (replaces per-client Supabase)
- Single Vercel deployment with wildcard subdomain
- DB-backed module registry + tenant_modules
- Simplified provisioning (org row + modules)

### UI Rebrand (2026-03-01)
- Dashboard and CRM pages redesigned (6 pages + pipeline chart component)
- Brand-crimson/charcoal color palette applied to all pages
- Sidebar: Lucide icons, logo branding, AI Agents section
- Header: crimson buttons and focus rings
- Landing page: dark -> light theme conversion
- App title: "DraggonnB OS"

## Current Milestone: First Client Go-Live

**Goal:** Onboard first paying client end-to-end

| Task | Status |
|------|--------|
| Save actual logo PNG to public/ | Pending |
| Verify Vercel build with rebrand | Pending |
| Test login -> dashboard flow | Pending |
| Apply accommodation migrations to Supabase | Pending |
| Configure PayFast production passphrase | Pending |
| Configure Resend API key | Pending |
| First provisioning pipeline test | Pending |
| End-to-end test: signup -> provision -> dashboard | Pending |

## Next Milestones

### Milestone: Production Credentials & Integrations
- Configure Resend API key for email delivery
- Configure Facebook/Instagram OAuth (social publishing)
- Configure LinkedIn OAuth (social publishing)
- Switch PayFast from sandbox to production
- Self-host N8N on Hostinger VPS

### Milestone: First Hospitality Client
- Target: Swa-Zulu Safari Lodges (reference client)
- Apply accommodation migrations
- Complete accommodation API routes
- Configure client subdomain
- Onboarding sequence

### Milestone: Scale to 10+ Clients
- Apply ops dashboard migration (08_ops_dashboard.sql)
- Build ops dashboard UI for client management
- Automate provisioning pipeline end-to-end
- WhatsApp integration via Meta Cloud API + N8N

---
*Last updated: 2026-03-01*
