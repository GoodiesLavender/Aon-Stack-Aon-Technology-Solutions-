# Supabase Auth, RLS & Access Control Audit
**Project:** Aon Stack / Aon Technology Solutions LLC  
**Date:** 2026-07-29  
**Scope:** Authentication model, table inventory, RLS, API exposure, admin role model  
**Constraint:** No redesign, no pricing/checkout/Stripe flow changes, no table drops, no payment data mutation

---

## 1. Executive summary

| Area | Finding |
|------|---------|
| Customer Supabase Auth | **Not implemented.** There is no customer login, magic link, password auth, or `auth.users` linkage in the app. |
| Frontend Supabase client | **None.** No `@supabase/supabase-js` under `src/`. No `VITE_SUPABASE_*` secrets in client code. |
| DB access pattern | **Server-mediated only** via `api/*` using `SUPABASE_SERVICE_ROLE_KEY` (`api/_lib/supabase-admin.js`). |
| RLS today | Platform enables RLS on push. Schema declared **no policies**. With RLS on + no policies, `anon` / `authenticated` are denied by default; **service_role bypasses RLS**. |
| Critical API issue | **IDOR:** `GET /api/legal/agreements/[id]` returned full PII + agreement snapshot to anyone who knew `public_id` or `AGR-…` reference. |
| Admin auth | `admin_profiles` table exists for future admin UI; **no admin routes or role checks are implemented yet**. Role is server-side table (good), but must never be customer-writable. |

**Bottom line:** Private data is not exposed through a browser Supabase key today (good). Security still depended on “nobody calls the service role” and on unguessable IDs. The agreement receipt endpoint was enumerable/IDOR-capable. Customer “view my own orders via RLS” is not possible until rows are linked to `auth.uid()` and customers actually sign in.

---

## 2. Table inventory & data classification

| Table | Contains private/customer data? | Ownership column (before fix) | Intended accessor |
|-------|----------------------------------|-------------------------------|-------------------|
| `orders` | **Yes** — name, email, phone, company, domain, amounts, Stripe IDs, project status | **None** (only `customer_email`, `purchase_id`, `stripe_checkout_session_id`) | Server (webhook/fulfill) |
| `deposit_requests` | **Yes** — legacy mirror of paid deposits | **None** (`email`, `checkout_session_id`) | Server |
| `customer_agreements` | **Yes** — full legal snapshot, signature, PII, IP, UA | **None** (`customer_email`, `public_id`, `agreement_reference`) | Server + success page |
| `order_status_history` | **Yes** (project timeline by `order_id`) | `order_id` only | Server / future admin |
| `internal_notes` | **Yes — staff-only** | `order_id`, `created_by` | Server / future admin |
| `admin_profiles` | **Yes — privilege table** | `user_id` (intended Supabase auth uid), `role` | Server only |
| `phone_verify_attempts` | **Yes** (support verification / rate limit) | `purchase_id`, `ip_hash` | Server |
| `cookie_consents` | Mild (consent flags + ip_hash) | `consent_id` | Server |
| `legal_documents` | No (public legal text) | n/a | Server seed + public pages (content also in code) |
| `legal_settings` | Business config | `setting_key` | Server |
| `purchase_id_counters` | Internal sequence | `year` | Server / RPC |
| `agreement_id_counters` | Internal sequence | `year` | Server / RPC |

**There is no `profiles` or `customers` table and no uploaded-documents table.**

---

## 3. Relationship to `auth.users` (before fix)

| Link | Status |
|------|--------|
| `auth.users.id` → application row | **Missing** on all customer tables |
| `admin_profiles.user_id` | Text column intended to store auth uid; **no app code reads/writes it yet** |
| Session / JWT validation in `api/*` | **None** |

Because ownership is email/session-based rather than `auth.uid()`, a naive policy like `auth.uid() = id` would be **wrong** on every table (`id` is a serial surrogate key, not a user id).

---

## 4. Existing RLS status (before fix)

| Item | Status |
|------|--------|
| RLS enable on push | Platform injects `ENABLE ROW LEVEL SECURITY` for declared tables |
| Policies in `schema.ts` | **None declared** |
| Effective access for `anon` / `authenticated` | **Deny all** (RLS on, no grants/policies) — *if* tables were pushed with RLS |
| Effective access for `service_role` | **Full bypass** (used by all current API routes) |
| Explicit “customers can only see own rows” policies | **Absent** (and impossible without ownership column + login) |

---

## 5. API surface review

| Route | Auth | Risk |
|-------|------|------|
| `POST /api/create-checkout-session` | None (public checkout) | OK if agreement required; uses service role |
| `POST /api/stripe-webhook` | Stripe signature | OK |
| `POST /api/deposit-requests/fulfill` | None; verifies Stripe session paid | OK if session id unguessable + Stripe verifies |
| `POST /api/legal/agreements` | None (creates agreement pre-pay) | OK for checkout; returns secrets only once |
| `GET /api/legal/agreements/[id]` | **None** | **CRITICAL IDOR** — full PII + snapshot |
| `GET /api/legal/documents*` | None | Public legal content — OK |
| `POST /api/legal/cookie-consent` | None | Low risk |
| Admin order APIs | **Not built** | N/A |

**Secrets in frontend:** Not found. Service role stays in `api/_lib/supabase-admin.js` only.

---

## 6. Security problems discovered

1. **IDOR on agreement receipt** — unauthenticated GET by `public_id` or `AGR-…`.
2. **No customer ownership column** — cannot express safe customer RLS with `auth.uid()`.
3. **`admin_profiles.role` is application-controlled text** — if any future client write path allowed inserts/updates without server checks, privilege escalation. Must be service-role-only + no customer UPDATE policy.
4. **No admin API authorization layer yet** — table exists; routes do not. When admin UI is added, every route must verify JWT + `admin_profiles`.
5. **Unguessable ID reliance** — orders/fulfillment safety depends on Stripe session ids and server verification (acceptable for webhook/fulfill; not for open GET of PII).

---

## 7. Policies / fixes required (implementation plan)

### 7.1 Schema (non-destructive)
- Add nullable `auth_user_id text` on: `orders`, `deposit_requests`, `customer_agreements`.
- Add `access_token text unique` on `customer_agreements` (high-entropy; returned only at creation).
- Declare **pgPolicy** entries:
  - **Private tables:** no `anon` access; `authenticated` SELECT only when `auth_user_id = auth.uid()::text` (and not null).
  - **Admin read** on private tables: `exists (select 1 from admin_profiles where user_id = auth.uid()::text and is_active and role in ('admin','support','read_only'))`.
  - **Admin write** (update) only for `admin` / `support` roles where appropriate; **never** allow authenticated users to UPDATE `admin_profiles.role`.
  - **`admin_profiles`:** SELECT own row only; no INSERT/UPDATE/DELETE for `authenticated` or `anon`.
  - **`internal_notes`:** admin/support only; never customer.
  - **`legal_documents`:** optional public SELECT of active rows (non-sensitive).
  - **Counters / cookie_consents / phone_verify_attempts / legal_settings:** no client policies (service role only).

### 7.2 API
- Agreement create: generate `access_token`, return once to client.
- Agreement GET: require `access_token` query/header matching row; do not serve full snapshot on id alone.
- Success page: pass token from sessionStorage/return URL only after create/checkout (no listing endpoint).

### 7.3 Admin helper
- Add `api/_lib/admin-auth.js` that validates Bearer JWT via Supabase Auth and loads `admin_profiles` with service role (role never trusted from client body).

### 7.4 Explicit non-goals this pass
- Building full customer login UI / magic link (new product feature).
- Building `/admin` UI.
- Changing Stripe amounts, packages, legal copy, or checkout UX beyond token plumbing for security.

---

## 8. Implementation completed

### 8.1 Schema changes (`src/db/schema.ts`) — non-destructive

| Change | Detail |
|--------|--------|
| `orders.auth_user_id` | Nullable text; server may link to `auth.users.id` later |
| `deposit_requests.auth_user_id` | Same |
| `customer_agreements.auth_user_id` | Same |
| `customer_agreements.access_token` | Unique capability token (nullable only for legacy migration) |
| `is_staff(allowed_roles text[])` | SQL function used by policies |
| RLS policies | Declared via `pgPolicy(...)` on private tables |

### 8.2 Policies created

| Policy name | Table | Role | Command | Rule |
|-------------|-------|------|---------|------|
| `orders_select_own` | orders | authenticated | SELECT | `auth_user_id = auth.uid()::text` (and not null) |
| `orders_select_staff` | orders | authenticated | SELECT | `is_staff(['admin','support','read_only'])` |
| `orders_update_staff` | orders | authenticated | UPDATE | `is_staff(['admin','support'])` |
| `deposit_requests_select_own` | deposit_requests | authenticated | SELECT | own `auth_user_id` |
| `deposit_requests_select_staff` | deposit_requests | authenticated | SELECT | staff |
| `order_status_history_select_staff` | order_status_history | authenticated | SELECT | staff |
| `order_status_history_select_own_order` | order_status_history | authenticated | SELECT | parent of order with matching `auth_user_id` |
| `order_status_history_insert_staff` | order_status_history | authenticated | INSERT | admin/support |
| `internal_notes_select_staff` | internal_notes | authenticated | SELECT | admin/support only |
| `internal_notes_insert_staff` | internal_notes | authenticated | INSERT | admin/support |
| `internal_notes_update_staff` | internal_notes | authenticated | UPDATE | admin/support |
| `internal_notes_delete_admin` | internal_notes | authenticated | DELETE | admin only |
| `admin_profiles_select_self` | admin_profiles | authenticated | SELECT | `user_id = auth.uid()::text` only |
| *(none)* | admin_profiles | authenticated | INSERT/UPDATE/DELETE | **Denied** — blocks self-promotion |
| `customer_agreements_select_own` | customer_agreements | authenticated | SELECT | own `auth_user_id` |
| `customer_agreements_select_staff` | customer_agreements | authenticated | SELECT | staff |
| `legal_documents_select_active_public` | legal_documents | anon | SELECT | `is_active = true` |
| `legal_documents_select_active_auth` | legal_documents | authenticated | SELECT | `is_active = true` |
| `legal_settings_select_staff` | legal_settings | authenticated | SELECT | admin only |
| *(none)* | purchase_id_counters, agreement_id_counters, phone_verify_attempts, cookie_consents | client | ALL | **Denied** — service_role only |

**Explicitly avoided:** `auth.uid() = id` (serial PK is not a user id).

### 8.3 API / app security fixes

| File | Fix |
|------|-----|
| `api/_lib/tokens.js` | Capability token generate + timing-safe compare |
| `api/_lib/legal.js` | Store `access_token` + optional `auth_user_id` on create; return token once |
| `api/legal/agreements/[id].ts` | **IDOR fixed** — requires `access_token` (or staff Bearer JWT) |
| `api/_lib/admin-auth.js` | JWT validation + role from `admin_profiles` (never from body) |
| `src/components/AgreementReview.tsx` | Saves token to `sessionStorage` after create |
| `src/App.tsx` success hydrate | Sends `access_token` when loading agreement receipt |
| `scripts/security-rls-check.mjs` | Automated security regression checks |

### 8.4 What was NOT changed
- Website design, pricing, Stripe checkout amounts, package copy, legal document wording
- No tables dropped, no payment amounts altered, no column renames of existing business fields
- No full customer login UI (ownership column ready; login is a future feature)
- No `/admin` UI (helper ready for when admin routes are added)

---

## 9. Test results

### 9.1 Automated (`node scripts/security-rls-check.mjs`)
**Result: 0 failures**

- Token uniqueness / timing-safe match: PASS  
- Frontend never imports Supabase or service role: PASS  
- Agreement GET requires token + staff path: PASS  
- Schema policies present; no `auth.uid() = id` anti-pattern: PASS  
- `admin_profiles` has no client INSERT/UPDATE: PASS  
- Admin auth loads role from DB, not body: PASS  

### 9.2 Live HTTP (local dev)
| Case | Result |
|------|--------|
| `GET /api/legal/agreements/not-real` (no token) | **404** `Agreement not found.` |
| Production build `npm run build` | **Success** |

### 9.3 Multi-account matrix (policy logic + API rules)

| Scenario | Expected | Status |
|----------|----------|--------|
| Customer A cannot access Customer B orders (RLS) | DENY via `auth_user_id` mismatch | **PASS (policy)** — requires Push + linked `auth_user_id` for live Auth users |
| Customer B cannot access Customer A agreement without token | 401 | **PASS (API code)** |
| Customer cannot grant self admin | DENY insert/update on `admin_profiles` | **PASS (policy)** |
| Admin with `admin_profiles` can read orders | ALLOW `orders_select_staff` | **PASS (policy)** |
| Unauthenticated cannot read private tables | DENY (RLS, no anon policy) | **PASS (policy)** |
| Guest checkout without login still works | service_role writes; `auth_user_id` null OK | **PASS (design)** |

> **Note on live dual-customer Auth tests:** This app does not yet create Supabase Auth customer sessions in the UI. Full end-to-end “two JWT customers hit PostgREST directly” requires (1) Push to Supabase for policies/columns, (2) two Auth users, (3) rows with `auth_user_id` set. Until then, isolation is enforced by: service-role-only server paths + agreement access tokens + deny-by-default RLS for anon/authenticated on private tables.

---

## 10. Remaining security risks

1. **Push required:** Policies and new columns exist in `schema.ts` only until you click **Push to Supabase**.  
2. **Guest orders have `auth_user_id = null`:** Customers cannot use RLS “view my orders” until login + linking is built. Server paths remain the source of truth.  
3. **Agreement access tokens in `sessionStorage`:** Mitigates IDOR for success-page PDF; token is still a bearer secret — protect against XSS (no new HTML injection surfaces added).  
4. **Legacy agreements without `access_token`:** Public GET denied; staff JWT only.  
5. **Service role bypasses RLS:** Correct for webhooks; every future admin route **must** call `requireAdmin()`.  
6. **No customer Auth UI yet:** Requested “two customer accounts” live Auth test cannot be fully exercised in-product until login ships.  
7. **Admin bootstrap:** First `admin_profiles` row must be inserted via service role / dashboard — never via public API.

---

## 11. Required manual steps (you)

1. **Push to Supabase** (schema + `is_staff` + policies).  
2. Confirm in Supabase Dashboard → Authentication/Policies that private tables show the new policies.  
3. Optionally create two test Auth users and set `auth_user_id` on sample rows to re-run isolation with real JWTs.  
4. Insert your admin user into `admin_profiles` (`user_id` = Auth uid, `role` = `admin`, `is_active` = true) via service role only.

---

## 12. Stop

Security audit and RLS/API hardening complete. No new product features started.
