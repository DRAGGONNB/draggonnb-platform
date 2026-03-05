# DraggonnB OS -- Tier Testing Checklist

Manual testing guide for validating operational design across all 3 subscription tiers.
Use 3 separate accounts (one per tier) to walk through each section.

## Test Accounts Required

| Tier | Account | Expected Price | Subdomain |
|------|---------|---------------|-----------|
| Core (Starter) | core-test@draggonnb.co.za | R1,500/mo | coretest.draggonnb.co.za |
| Growth (Professional) | growth-test@draggonnb.co.za | R3,500/mo | growthtest.draggonnb.co.za |
| Scale (Enterprise) | scale-test@draggonnb.co.za | R7,500/mo | scaletest.draggonnb.co.za |

---

## 1. Authentication Flow

For each account:
- [ ] Sign up with tier-specific email
- [ ] Verify email confirmation received
- [ ] Login redirects to /dashboard
- [ ] Logout clears session, redirects to /login
- [ ] Accessing /dashboard while logged out redirects to /login?redirect=/dashboard
- [ ] Login while already authenticated redirects to /dashboard

---

## 2. Module Access Matrix

Navigate to each module path. Verify access matches tier.

| Module Route | Core | Growth | Scale | What to Check |
|-------------|------|--------|-------|---------------|
| /dashboard | OK | OK | OK | Stats, quick actions |
| /crm | OK | OK | OK | Overview, stat cards |
| /crm/contacts | OK | OK | OK | Contact list, add contact |
| /crm/companies | OK | OK | OK | Company list, add company |
| /crm/deals | OK | OK | OK | Kanban board, add deal |
| /email | OK | OK | OK | Email hub overview |
| /email/campaigns | OK | OK | OK | Campaign list |
| /email/templates | OK | OK | OK | Template gallery |
| /email/sequences | OK | OK | OK | Sequence list |
| /email/analytics | OK | OK | OK | Email stats |
| /content-generator | OK | OK | OK | Content overview |
| /content-generator/social | OK | OK | OK | Social content gen |
| /content-generator/email | OK | OK | OK | Email content gen |
| /accommodation | BLOCKED | OK | OK | Should show 403 or redirect |
| /accommodation/properties | BLOCKED | OK | OK | Property list |
| /accommodation/inquiries | BLOCKED | OK | OK | Inquiry list |
| /accommodation/guests | BLOCKED | OK | OK | Guest list |
| /autopilot | OK | OK | OK | Calendar/profile setup |
| /autopilot/settings | OK | OK | OK | Autopilot config |
| /billing | OK | OK | OK | Plan card, usage bars |
| /settings/social | OK | OK | OK | Social account connections |

### Verify BLOCKED behavior:
- [ ] Core account on /accommodation shows upgrade message or redirects to /dashboard
- [ ] API call to /api/accommodation/* from core returns `{ "error": "...requires growth tier..." }` with status 403

---

## 3. CRUD Operations Per Module

For each tier account, perform these operations:

### 3A. CRM - Contacts
- [ ] Create contact: first_name, last_name, email, phone
- [ ] View contact in list
- [ ] Search contact by name
- [ ] Edit contact details
- [ ] Delete contact
- [ ] Verify contact NOT visible from different tier account (cross-tenant isolation)

### 3B. CRM - Companies
- [ ] Create company: name, industry
- [ ] View in list
- [ ] Verify industry filter works

### 3C. CRM - Deals
- [ ] Create deal: name, value (in R), stage (lead)
- [ ] View deal on kanban board
- [ ] Move deal between stages (if drag-drop works)
- [ ] Verify pipeline summary updates (total value, deal count)

### 3D. Email (if Resend configured)
- [ ] Create email template
- [ ] Create email campaign
- [ ] Send test email
- [ ] Verify usage counter increments

### 3E. Content Generation (if Anthropic key configured)
- [ ] Generate social content (select platform, enter prompt)
- [ ] Verify AI generations counter increments
- [ ] Test usage limit: keep generating until limit reached

### 3F. Accommodation (Growth + Scale only)
- [ ] Create property: name, type
- [ ] Create guest: name, email
- [ ] Create inquiry: linked to property
- [ ] Verify CRUD works end-to-end

---

## 4. Usage Limits Testing

### Limits by Tier

| Metric | Core | Growth | Scale |
|--------|------|--------|-------|
| Social Posts | 30/mo | 100/mo | Unlimited |
| AI Generations | 50/mo | 200/mo | Unlimited |
| Email Sends | 1,000/mo | 10,000/mo | Unlimited |
| Agent Invocations | 10/mo | 50/mo | 1,000/mo |
| Autopilot Runs | 2/mo | 4/mo | Unlimited |

### Tests
- [ ] Core: Generate content until 50 AI generations reached, verify 429 response
- [ ] Core: Verify error message includes "upgrade" suggestion with tier name
- [ ] Growth: Verify higher limits are applied (200 AI gens)
- [ ] Scale: Verify unlimited operations (no limit hit)
- [ ] Check /billing page usage bars reflect current counts

---

## 5. Feature Gate Testing

### Features by Minimum Tier

| Feature | Min Tier | Test Method |
|---------|----------|-------------|
| AB Testing | Growth | Look for AB test option in email campaigns |
| Smart Segmentation | Growth | Look for segment builder |
| Lead Pipeline | Growth | Verify lead stages available |
| Advanced Analytics | Growth | Check analytics depth |
| White Label | Scale | Check for white label settings |
| API Access | Scale | Try external API call |
| Custom Integrations | Scale | Check for integration builder |
| Accommodation Module | Growth | Navigate to /accommodation |

---

## 6. Cross-Tenant Isolation

Critical security test. Must verify no data leaks between organizations.

### Setup
1. Login as Core account, create:
   - Contact: "Core Test Contact" (core-contact@test.co.za)
   - Company: "Core Test Company"
   - Deal: "Core Deal" (R10,000)
2. Login as Growth account, create:
   - Contact: "Growth Test Contact" (growth-contact@test.co.za)
   - Company: "Growth Test Company"
   - Deal: "Growth Deal" (R25,000)

### Verification
- [ ] Core account: ONLY sees "Core Test Contact", NOT "Growth Test Contact"
- [ ] Growth account: ONLY sees "Growth Test Contact", NOT "Core Test Contact"
- [ ] Core account deals: ONLY "Core Deal"
- [ ] Growth account deals: ONLY "Growth Deal"
- [ ] Pipeline values: Core shows R10,000, Growth shows R25,000
- [ ] Dashboard stats: Each account shows only own data

### API Verification
- [ ] GET /api/crm/contacts from Core: returns only Core contacts
- [ ] GET /api/crm/contacts from Growth: returns only Growth contacts
- [ ] Attempt to access Growth contact ID from Core session: returns 404 or empty

---

## 7. Billing Page Verification

For each tier account:
- [ ] PlanCard shows correct tier name and price
- [ ] UsageBar shows correct limits for the tier
- [ ] Usage counts match actual usage (after CRUD tests above)
- [ ] Upgrade CTA visible for Core and Growth (not Scale)
- [ ] Invoice table renders (mock data)

---

## 8. Sidebar Navigation

For each tier account:
- [ ] All sidebar links navigate to correct pages
- [ ] Active state (blue highlight) matches current URL
- [ ] Emoji icons render correctly
- [ ] Usage bars at bottom show correct values
- [ ] "Upgrade Plan" button visible for Core/Growth

---

## 9. Dashboard Overview

For each tier account after creating test data:
- [ ] Welcome banner shows user's first name
- [ ] Date shown in South African format (en-ZA)
- [ ] Stat cards show correct counts (contacts, deals, posts, content)
- [ ] Pipeline summary shows correct stage counts and total value
- [ ] Quick action buttons work (New Contact, New Deal, etc.)
- [ ] Module cards show enabled modules

---

## 10. Responsive Testing

Test on 3 viewports: 1440px (desktop), 768px (tablet), 375px (mobile)

### Landing Page (/)
- [ ] Desktop: full layout, nav visible
- [ ] Tablet: sections stack, nav may collapse
- [ ] Mobile: single column, readable text, tappable CTAs

### Dashboard (/dashboard)
- [ ] Desktop: sidebar + content side by side
- [ ] Tablet: sidebar fixed, content partially hidden (known limitation)
- [ ] Mobile: sidebar covers viewport (known limitation)

---

## Bug Report Template

```
Tier: core | growth | scale
Page: /path
Action: What you did
Expected: What should happen
Actual: What happened
Severity: critical | major | minor | cosmetic
```

---

## Sign-off

| Test Area | Core | Growth | Scale | Tester | Date |
|-----------|------|--------|-------|--------|------|
| Auth Flow | | | | | |
| Module Access | | | | | |
| CRUD Operations | | | | | |
| Usage Limits | | | | | |
| Feature Gates | | | | | |
| Tenant Isolation | | | | | |
| Billing Display | | | | | |
| Sidebar Nav | | | | | |
| Dashboard | | | | | |
| Responsive | | | | | |
