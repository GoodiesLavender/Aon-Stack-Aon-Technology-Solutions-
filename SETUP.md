# Aon Technology — Setup & Ops Guide

## What this app does
- Public marketing site with **50% deposit** Stripe Checkout (Live)
- Packages:
  - **Google Workspace Setup** — $59.00 · deposit $29.50
  - **Business Website + AI Chatbot Setup** — $599.00 · deposit **$299.50**
- After `checkout.session.completed`:
  1. Verify Stripe signature
  2. Re-fetch session from Stripe (amount source of truth)
  3. Create unique **Purchase ID** `AON-YYYY-XXXXXX`
  4. Save `orders` (+ legacy `deposit_requests`)
  5. Send customer confirmation + sales notification

Remaining balance is **never** charged automatically.

---

## Manual dashboard steps (you must complete)

### 1. Push Supabase schema
In the App Builder UI, click **Push to Supabase** so these tables/functions exist:
- `deposit_requests` (legacy)
- `purchase_id_counters`
- `orders`
- `order_status_history`
- `internal_notes`
- `admin_profiles`
- `phone_verify_attempts`
- Postgres function `next_purchase_id()`

RLS is enabled by the platform; no public policies are defined (service-role only via `/api/*`).

### 2. Stripe webhook (Live)
- Endpoint: `https://YOUR_DOMAIN/api/stripe-webhook`
- Event: `checkout.session.completed`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 3. Resend
- Create API key → `RESEND_API_KEY`
- Verify sending domain → `RESEND_FROM_EMAIL`  
  Example: `Aon Technology Solutions LLC <hello@aontechnology.com>`

### 4. Environment variables
See `.env.example`. Secrets stay server-side. Do **not** put the service role key in any `VITE_` / `NEXT_PUBLIC_` variable.

---

## Legal Pack & pre-payment agreement
- Eight legal pages at `/legal/*` (drafts — **attorney review required** before production publication)
- Flow: package request → **Review Your Order & Service Agreement** → Stripe (cannot skip)
- Agreement IDs: `AGR-YYYY-XXXXXX` linked to purchase `AON-YYYY-XXXXXX`
- New tables: `legal_documents`, `customer_agreements`, `agreement_id_counters`, `cookie_consents`, `legal_settings`
- Cookie banner: Accept All / Reject Non-Essential / Manage Preferences (footer reopen)
- Checkout requires saved agreement; Stripe metadata includes `agreement_id`, `agreement_reference`, `legal_terms_version`
- See `LEGAL_PACK_REPORT.md` for full delivery report and attorney-review list

### Stripe Dashboard (legal)
- Set Terms of Service URL to `https://YOUR_DOMAIN/legal/terms-of-service`
- Keep Live webhook on `checkout.session.completed`

## Admin UI (next phase)
Backend tables and webhook are ready. Protected `/admin/orders` + `/admin/legal` UI and Supabase Auth role gates ship next.

---

## Test checklist
- [ ] Website package shows **$599.00** full fee
- [ ] Deposit shows **$299.50**
- [ ] Stripe Checkout charges **exactly $299.50** (29950 cents)
- [ ] Remaining balance calculated **$299.50**
- [ ] Devs.ai marked separate / not included
- [ ] No custom AI Agent included (copy + flags)
- [ ] Google Workspace remains separate package at $59
- [ ] Customer cannot open Stripe without agreement step
- [ ] Required legal checkboxes default unchecked and block submit
- [ ] Typed signature required; mismatch needs confirmation
- [ ] Agreement saved before Stripe redirect (`AGR-…`)
- [ ] Webhook signature invalid → 400
- [ ] Duplicate webhook → no duplicate order (unique session id)
- [ ] Purchase ID format `AON-YYYY-XXXXXX`
- [ ] Order row in Supabase `orders`
- [ ] Agreement marked `payment_completed` after webhook
- [ ] Customer email contains Purchase ID + correct amounts
- [ ] Sales email to info@aontechnology.com
- [ ] Email failure keeps order, flags stay false for retry
- [ ] Success page shows deposit + agreement reference + PDF download
- [ ] All 8 legal footer links open
- [ ] Cookie preferences can be changed later
- [ ] No complete payment-card data stored
- [ ] No unresolved invented address/phone on public pages

---

## Do not deploy until
Package pricing checks and legal draft review gates you care about are done. Deploy only when you explicitly approve. Legal wording is **not** claimed attorney-approved.
