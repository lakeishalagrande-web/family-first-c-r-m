
# AgentLifeline — Build Plan (Full MVP)

A complete CRM for independent insurance agents. Navy + gold professional design, mobile responsive.

## Build phases (one continuous build, delivered in this order)

1. **Foundation**: Lovable Cloud (database + auth), design system (navy #2D3082, gold #B8860B, white cards, professional typography), app shell with sidebar nav, auth pages (login/signup/forgot password/reset password), role-based routing.
2. **Database schema + security**: tables, Row Level Security, encryption for SSN/Medicare ID via pgsodium, audit log, user roles table.
3. **Household Intelligence**: households + family members with all fields you specified; create / edit / view / delete.
4. **Policies**: full policy record with beneficiaries (primary + contingent), term riders, two saved quote scenarios per client, auto-lapse logic.
5. **Dashboard**: summary cards, recent activity feed, quick-add client.
6. **Alerts & Deadlines**: auto-generated from policy dates, birthdays, follow-ups (in-app only for v1).
7. **Follow-Up Log**: per client + per policy.
8. **Agent Profile**: writing numbers per carrier, NPN, license states.
9. **Reports**: filtered client lists, export to PDF.
10. **CSV Import**: downloadable template + import wizard.
11. **Admin panel** (LaKeisha): view all agents, suspend/delete agents, reset passwords, platform reports, announcements, billing view, full data export.
12. **Settings + polish**: account settings, mobile QA, final design pass.

## Access model (the core rule)

- **Agent**: sees only rows where `agent_id = auth.uid()`. Enforced at the database via RLS, not just UI.
- **Admin**: bypasses agent scoping via a `has_role(auth.uid(), 'admin')` check inside each policy.
- Stored in a separate `user_roles` table (never on profiles) — required to prevent privilege escalation.
- First admin (LaKeisha) seeded by signing up and being granted the admin role.

## Encryption + audit (SSN, Medicare ID)

- pgsodium column encryption with a server-side key.
- Fields display as masked (`XXX-XX-1234`) by default.
- Reveal button calls a secure server function that:
  1. Verifies the caller is the owning agent or an admin.
  2. Decrypts the value.
  3. Inserts a row into `pii_access_log` (who, what record, what field, when, IP).
- Audit log viewable by admin.

## Pricing tiers

Stored as a `subscription_tier` enum on the agent profile (Starter / Professional / Agency). Tier limits enforced in UI + on server (Starter capped at 100 clients). No payment processing in v1 — admin sets tiers manually. Billing UI is a read-only placeholder until you're ready to wire Stripe.

## What is intentionally NOT in v1

- **Email sending** (deadline alerts, password reset emails): in-app alerts only. Password reset uses Lovable's built-in default email until you set up a custom email domain.
- **Real payment processing**: pricing tier system is in place, but no Stripe/Paddle checkout yet.
- **Multi-agent teams under one Agency account**: schema supports it (agents can have a `parent_admin_id`), but team management UI is admin-only for v1.
- **Quote PDF generation**: quote scenarios are saved and viewable side-by-side, but PDF quote sheets come later.

## Technical structure

```text
src/
  routes/
    __root.tsx                       (shell + sidebar layout)
    index.tsx                        (redirect to /dashboard or /auth)
    auth/                            (login, signup, forgot-password)
    reset-password.tsx
    _authenticated/
      dashboard.tsx
      households.index.tsx           (list)
      households.$id.tsx             (detail with members + policies)
      households.new.tsx
      policies.index.tsx
      policies.$id.tsx
      alerts.tsx
      follow-ups.tsx
      reports.tsx
      profile.tsx
      settings.tsx
      import.tsx
      admin/                         (admin-only subtree)
        agents.tsx
        announcements.tsx
        platform-reports.tsx
        audit-log.tsx
  lib/
    households.functions.ts          (server fns)
    policies.functions.ts
    alerts.functions.ts
    pii.functions.ts                 (encrypted reveal + audit)
    admin.functions.ts
    csv-import.functions.ts
```

Database tables (Supabase, all with RLS):
`profiles`, `user_roles`, `households`, `family_members`, `policies`, `beneficiaries`, `term_riders`, `quote_scenarios`, `follow_ups`, `alerts`, `carriers`, `agent_writing_numbers`, `pii_access_log`, `announcements`, `csv_imports`.

## Time / cost expectation

This is roughly the size of 5–8 normal app builds. I'll work straight through but it will use significant credits and span many tool calls. After each major phase I'll briefly confirm progress so you can redirect if something isn't right.

## Ready to start?

Reply **"go"** and I'll begin with the foundation (Cloud + design system + auth + sidebar). If you want to trim scope or change any tradeoff above (especially the v1 exclusions), tell me now.
