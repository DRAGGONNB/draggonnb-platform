# DraggonnB OS -- AI-Powered Business Operating System

## What This Is

A production-ready multi-tenant B2B operating system targeting South African SMEs. DraggonnB OS provides CRM, email marketing, AI content generation, social media automation, accommodation management, AI agents, analytics, and payments -- all in one platform. All clients share a single Supabase project with RLS-based tenant isolation. Each client gets a subdomain on *.draggonnb.co.za with DB-backed module gating.

## Core Value

**A complete, working multi-tenant business automation platform where new clients are provisioned with a database row, a subdomain, and activated modules -- live in under an hour.** Every module works: CRM, email, content, payments, dashboard, accommodation, AI agents.

## Architecture

- **Multi-tenant:** Shared Supabase DB with RLS policies using `get_user_org_id()` (STABLE, cached per-query)
- **Routing:** Wildcard DNS on `*.draggonnb.co.za`, middleware resolves tenant from subdomain, injects `x-tenant-id`/`x-tenant-tier`/`x-tenant-modules` headers
- **Module gating:** `module_registry` (global catalog) + `tenant_modules` (per-tenant activation) tables
- **Provisioning:** 5-step saga: create-org -> n8n-webhooks -> deploy-automations -> onboarding-sequence -> qa-checks
- **AI ops:** N8N for deterministic automation, Claude API via BaseAgent for intelligent ops, build-time Claude Code

## Tech Stack

- Next.js 14.2.33 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (DB + Auth), Resend (email), PayFast (payments), N8N (workflows)
- Vercel (hosting), GitHub (code), Gitea (state docs)
- Recharts (charts), Lucide React (icons)

## Brand Identity

- **Primary:** Brand Crimson (HSL 348, 75%, 42%) -- buttons, active states, accents
- **Secondary:** Brand Charcoal (HSL 220) -- text, dark elements, secondary accents
- **Theme:** Light (white/gray-50 backgrounds, crimson accents)
- **Logo:** Charcoal + crimson split icon with "DRAGGONNB Operating System" text
- **Landing page:** Light theme with dark CTA section for contrast

## Modules

| Module | Status | Tier |
|--------|--------|------|
| CRM (contacts, companies, deals) | Complete | Core |
| Email Marketing (campaigns, sequences, templates, outreach) | Complete | Core |
| Content Studio (AI generation, social/email content) | Complete | Core |
| Social Media (scheduling, publishing) | Complete | Growth |
| Accommodation (properties, guests, inquiries) | Complete | Growth |
| AI Agents (Autopilot, workflows, settings) | Complete | Scale |
| Analytics (dashboard stats, pipeline charts) | Complete | Core |
| Payments (PayFast, 3 tiers) | Complete | Core |

## Infrastructure

- **Supabase project:** `psqfgzbjbgqrmjskdavs`
- **Vercel:** `draggonnb-mvp` auto-deploys from main
- **N8N:** draggonn-b.app.n8n.cloud (migrating to self-hosted on VPS)
- **VPS:** Hostinger with SSH access (`ssh hostinger-vps`)
- **Gitea:** git.draggonnb.online:3030 (state docs)
- **GitHub:** DRAGGONNB/draggonnb-platform

## Missing Credentials

- Resend API key (email delivery)
- Facebook/Instagram OAuth credentials (social publishing)
- LinkedIn OAuth credentials (social publishing)
- PayFast production passphrase (live payments)

## Completion Status

- v1 Roadmap: 7/7 phases complete (security, core modules, landing, N8N, social, provisioning, testing)
- v2 BOS: Phases A-E complete (CLAUDE.md hierarchy, error catalogue, provisioning hardening, build reviewer, AI ops)
- Architecture restructure: Shared DB + RLS migration complete
- UI Rebrand: Complete (all pages converted to DraggonnB OS brand identity)
- **Next milestone:** First end-to-end client provisioning test

## Constraints

- **Tech stack:** Next.js 14, Supabase, TailwindCSS, TypeScript -- locked
- **Payment:** PayFast only (SA market requirement)
- **Currency:** ZAR (South African Rand)
- **Hosting:** Vercel for app, Hostinger VPS for N8N
- **Compliance:** POPI Act (SA data protection) -- RLS-based tenant isolation
- **AI:** Claude API via N8N workflows + BaseAgent for per-call ops

---
*Last updated: 2026-03-01 after Session 26 UI rebrand*
