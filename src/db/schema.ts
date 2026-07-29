import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { pgFunction } from "./_pg-function";

// ---------------------------------------------------------------------------
// Legacy deposit_requests — kept for backward compatibility with existing rows.
// New paid deposits are written primarily to `orders` (see below).
// ---------------------------------------------------------------------------
export const deposit_requests = pgTable("deposit_requests", {
  id: serial("id").primaryKey(),
  reference_number: text("reference_number").notNull().unique(),
  customer_name: text("customer_name").notNull(),
  email: text("email").notNull(),
  business_name: text("business_name"),
  number_of_users: text("number_of_users"),
  selected_service: text("selected_service").notNull(),
  service_id: text("service_id").notNull(),
  business_needs: text("business_needs"),
  full_service_price_cents: integer("full_service_price_cents").notNull(),
  deposit_paid_cents: integer("deposit_paid_cents").notNull(),
  remaining_balance_cents: integer("remaining_balance_cents").notNull(),
  stripe_payment_id: text("stripe_payment_id"),
  checkout_session_id: text("checkout_session_id").notNull().unique(),
  status: text("status").notNull().default("deposit_paid"),
  sales_email_sent: boolean("sales_email_sent").notNull().default(false),
  customer_email_sent: boolean("customer_email_sent").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Purchase ID sequence counter — AON-YYYY-XXXXXX
// ---------------------------------------------------------------------------
export const purchase_id_counters = pgTable("purchase_id_counters", {
  id: serial("id").primaryKey(),
  year: text("year").notNull().unique(),
  last_seq: integer("last_seq").notNull().default(0),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Atomic next-id helper installed via Push to Supabase.
export const next_purchase_id = pgFunction("next_purchase_id", {
  args: "",
  returns: "text",
  language: "plpgsql",
  body: `
    DECLARE
      y text := to_char((NOW() AT TIME ZONE 'UTC'), 'YYYY');
      n integer;
    BEGIN
      INSERT INTO purchase_id_counters (year, last_seq, updated_at)
      VALUES (y, 1, NOW())
      ON CONFLICT (year) DO UPDATE
        SET last_seq = purchase_id_counters.last_seq + 1,
            updated_at = NOW()
      RETURNING last_seq INTO n;
      RETURN 'AON-' || y || '-' || lpad(n::text, 6, '0');
    END;
  `,
});

// ---------------------------------------------------------------------------
// orders — source of truth for paid deposits / customer projects
// Amounts stored in integer cents. Public/anon have no RLS policies
// (service-role only via /api/*).
// ---------------------------------------------------------------------------
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  // Public UUID-style id for external references (text for platform compatibility)
  public_id: text("public_id").notNull().unique(),
  // Official purchase reference: AON-YYYY-XXXXXX
  purchase_id: text("purchase_id").notNull().unique(),
  stripe_checkout_session_id: text("stripe_checkout_session_id").notNull().unique(),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  customer_name: text("customer_name").notNull(),
  customer_email: text("customer_email").notNull(),
  customer_phone: text("customer_phone"),
  customer_company: text("customer_company"),
  customer_domain: text("customer_domain"),
  number_of_users: text("number_of_users"),
  business_needs: text("business_needs"),
  service_id: text("service_id").notNull(),
  service_name: text("service_name").notNull(),
  package_name: text("package_name").notNull(),
  // Integer cents
  total_service_price_cents: integer("total_service_price_cents").notNull(),
  deposit_amount_paid_cents: integer("deposit_amount_paid_cents").notNull(),
  remaining_balance_cents: integer("remaining_balance_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  payment_status: text("payment_status").notNull().default("Deposit Paid"),
  project_status: text("project_status").notNull().default("Deposit Received"),
  appdirect_quote_status: text("appdirect_quote_status").notNull().default("Not Started"),
  devs_ai_quote_status: text("devs_ai_quote_status").notNull().default("Pending Review"),
  appdirect_quote_sent_at: timestamp("appdirect_quote_sent_at", { withTimezone: true }),
  appdirect_subscription_activated_at: timestamp("appdirect_subscription_activated_at", {
    withTimezone: true,
  }),
  remaining_balance_paid_at: timestamp("remaining_balance_paid_at", { withTimezone: true }),
  expected_start_date: text("expected_start_date"),
  expected_completion_date: text("expected_completion_date"),
  stripe_receipt_url: text("stripe_receipt_url"),
  // Feature flags captured at order time
  devs_ai_subscription_included: boolean("devs_ai_subscription_included").notNull().default(false),
  custom_ai_agent_included: boolean("custom_ai_agent_included").notNull().default(false),
  google_workspace_included: boolean("google_workspace_included").notNull().default(false),
  third_party_costs_included: boolean("third_party_costs_included").notNull().default(false),
  assigned_admin_id: text("assigned_admin_id"),
  sales_email_sent: boolean("sales_email_sent").notNull().default(false),
  customer_email_sent: boolean("customer_email_sent").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// order_status_history — timeline of project_status changes
// ---------------------------------------------------------------------------
export const order_status_history = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").notNull(),
  previous_status: text("previous_status"),
  new_status: text("new_status").notNull(),
  note: text("note"),
  changed_by: text("changed_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// internal_notes — staff-only notes (never sent to customers)
// ---------------------------------------------------------------------------
export const internal_notes = pgTable("internal_notes", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").notNull(),
  note: text("note").notNull(),
  created_by: text("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// admin_profiles — role-based access for /admin/*
// Roles: admin | support | read_only
// ---------------------------------------------------------------------------
export const admin_profiles = pgTable("admin_profiles", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull().unique(),
  email: text("email").notNull(),
  display_name: text("display_name"),
  role: text("role").notNull().default("read_only"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// phone_verify_attempts — basic rate limiting for support verification
// ---------------------------------------------------------------------------
export const phone_verify_attempts = pgTable("phone_verify_attempts", {
  id: serial("id").primaryKey(),
  purchase_id: text("purchase_id").notNull(),
  ip_hash: text("ip_hash"),
  success: boolean("success").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Legal Pack — versioned documents + immutable customer agreement snapshots
// ---------------------------------------------------------------------------
export const legal_documents = pgTable("legal_documents", {
  id: serial("id").primaryKey(),
  document_type: text("document_type").notNull(),
  title: text("title").notNull(),
  version: text("version").notNull(),
  effective_at: text("effective_at").notNull(),
  published_at: text("published_at"),
  content_html: text("content_html").notNull(),
  content_text: text("content_text").notNull(),
  content_hash: text("content_hash").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const agreement_id_counters = pgTable("agreement_id_counters", {
  id: serial("id").primaryKey(),
  year: text("year").notNull().unique(),
  last_seq: integer("last_seq").notNull().default(0),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const next_agreement_id = pgFunction("next_agreement_id", {
  args: "",
  returns: "text",
  language: "plpgsql",
  body: `
    DECLARE
      y text := to_char((NOW() AT TIME ZONE 'UTC'), 'YYYY');
      n integer;
    BEGIN
      INSERT INTO agreement_id_counters (year, last_seq, updated_at)
      VALUES (y, 1, NOW())
      ON CONFLICT (year) DO UPDATE
        SET last_seq = agreement_id_counters.last_seq + 1,
            updated_at = NOW()
      RETURNING last_seq INTO n;
      RETURN 'AGR-' || y || '-' || lpad(n::text, 6, '0');
    END;
  `,
});

export const customer_agreements = pgTable("customer_agreements", {
  id: serial("id").primaryKey(),
  public_id: text("public_id").notNull().unique(),
  agreement_reference: text("agreement_reference").notNull().unique(),
  purchase_id: text("purchase_id"),
  customer_name: text("customer_name").notNull(),
  business_name: text("business_name"),
  customer_title: text("customer_title"),
  customer_email: text("customer_email").notNull(),
  customer_phone: text("customer_phone"),
  customer_domain: text("customer_domain"),
  package_id: text("package_id").notNull(),
  package_name: text("package_name").notNull(),
  service_name: text("service_name").notNull(),
  deliverables_snapshot: text("deliverables_snapshot").notNull(),
  exclusions_snapshot: text("exclusions_snapshot").notNull(),
  customer_responsibilities_snapshot: text("customer_responsibilities_snapshot").notNull(),
  timeline_snapshot: text("timeline_snapshot").notNull(),
  total_service_price_cents: integer("total_service_price_cents").notNull(),
  deposit_amount_cents: integer("deposit_amount_cents").notNull(),
  amount_paid_today_cents: integer("amount_paid_today_cents").notNull(),
  remaining_balance_cents: integer("remaining_balance_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  refund_summary_snapshot: text("refund_summary_snapshot").notNull(),
  third_party_cost_summary_snapshot: text("third_party_cost_summary_snapshot").notNull(),
  accepted_document_versions: text("accepted_document_versions").notNull(),
  accepted_document_hashes: text("accepted_document_hashes").notNull(),
  full_agreement_snapshot: text("full_agreement_snapshot").notNull(),
  electronic_signature: text("electronic_signature").notNull(),
  electronic_signature_consent_text: text("electronic_signature_consent_text").notNull(),
  accepted_at: timestamp("accepted_at", { withTimezone: true }).defaultNow(),
  signature_date: text("signature_date").notNull(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  stripe_checkout_session_id: text("stripe_checkout_session_id"),
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  payment_status: text("payment_status").notNull().default("pending"),
  agreement_status: text("agreement_status").notNull().default("accepted_pending_payment"),
  confirmation_email_sent: boolean("confirmation_email_sent").notNull().default(false),
  confirmation_email_sent_at: timestamp("confirmation_email_sent_at", { withTimezone: true }),
  marketing_opt_in: boolean("marketing_opt_in").notNull().default(false),
  checkbox_order_review: boolean("checkbox_order_review").notNull().default(false),
  checkbox_third_party: boolean("checkbox_third_party").notNull().default(false),
  checkbox_legal_policies: boolean("checkbox_legal_policies").notNull().default(false),
  checkbox_esign: boolean("checkbox_esign").notNull().default(false),
  business_needs: text("business_needs"),
  number_of_users: text("number_of_users"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const cookie_consents = pgTable("cookie_consents", {
  id: serial("id").primaryKey(),
  consent_id: text("consent_id").notNull().unique(),
  essential: boolean("essential").notNull().default(true),
  functional: boolean("functional").notNull().default(false),
  analytics: boolean("analytics").notNull().default(false),
  marketing: boolean("marketing").notNull().default(false),
  consent_version: text("consent_version").notNull().default("1.0"),
  ip_hash: text("ip_hash"),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Optional business legal settings (placeholders for missing address/phone/etc.)
export const legal_settings = pgTable("legal_settings", {
  id: serial("id").primaryKey(),
  setting_key: text("setting_key").notNull().unique(),
  setting_value: text("setting_value"),
  is_placeholder: boolean("is_placeholder").notNull().default(true),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
