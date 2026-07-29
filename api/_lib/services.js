/** @typedef {"workspace" | "devsai" | "website_chatbot"} ServiceId */

/**
 * Canonical service catalog used by Stripe Checkout, webhooks, and emails.
 * Amounts are integer cents (source of truth on the server).
 *
 * Note: service id "devsai" is retained as an alias for the renamed
 * "Business Website + AI Chatbot Setup" package so existing metadata / links
 * continue to resolve. Prefer "website_chatbot" for new checkouts.
 */
/** @type {Record<string, {
 *  id: string,
 *  name: string,
 *  packageName: string,
 *  fullPriceCents: number,
 *  description: string,
 *  stripeProductName: string,
 *  flags: {
 *    devsAiSubscriptionIncluded: boolean,
 *    customAiAgentIncluded: boolean,
 *    googleWorkspaceIncluded: boolean,
 *    thirdPartyCostsIncluded: boolean,
 *  }
 * }>} */
export const SERVICES = {
  workspace: {
    id: "workspace",
    name: "Google Workspace Setup",
    packageName: "Google Workspace Setup",
    fullPriceCents: 5900,
    description:
      "50% deposit for Aon Technology Google Workspace setup service only. Remaining balance invoiced later. Monthly Google Workspace subscriptions are separate.",
    stripeProductName: "Google Workspace Setup — 50% Deposit",
    flags: {
      devsAiSubscriptionIncluded: false,
      customAiAgentIncluded: false,
      googleWorkspaceIncluded: false,
      thirdPartyCostsIncluded: false,
    },
  },
  website_chatbot: {
    id: "website_chatbot",
    name: "Business Website + AI Chatbot Setup",
    packageName: "Business Website + AI Chatbot Setup",
    fullPriceCents: 89900,
    regularPriceCents: 109900,
    description:
      "50% deposit for Aon Technology professional website and Devs.ai-powered chatbot setup only. Remaining balance due before final launch/handoff. Devs.ai subscriptions, hosting, domain, and other third-party costs are NOT included and are quoted separately.",
    stripeProductName: "Business Website + AI Chatbot Setup — 50% Deposit",
    flags: {
      devsAiSubscriptionIncluded: false,
      customAiAgentIncluded: false,
      googleWorkspaceIncluded: false,
      thirdPartyCostsIncluded: false,
    },
  },
};

// Backward-compatible alias for the renamed package.
SERVICES.devsai = SERVICES.website_chatbot;

/**
 * @param {string | undefined} value
 */
export function cleanStripeSecret(value) {
  if (!value) return "";
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/[\r\n\t\s]+/g, "")
    .trim();
}

/**
 * @param {number} fullPriceCents
 */
export function calcDeposit(fullPriceCents) {
  const depositCents = Math.round(fullPriceCents * 0.5);
  const remainingCents = fullPriceCents - depositCents;
  return { depositCents, remainingCents };
}

/**
 * @param {number} cents
 */
export function formatUsd(cents) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/**
 * Resolve a service id from checkout metadata / request body.
 * Accepts legacy "devsai" and canonical "website_chatbot".
 * @param {string | undefined | null} serviceId
 */
export function resolveService(serviceId) {
  if (!serviceId) return null;
  return SERVICES[serviceId] || null;
}

/**
 * Fallback purchase id generator (used only if DB sequence is unavailable).
 * Prefer nextPurchaseId() which uses the purchase_id_counters table.
 * Format: AON-YYYY-XXXXXX
 * @param {Date} [date]
 */
export function createReferenceNumber(date = new Date()) {
  const year = String(date.getUTCFullYear());
  // Not the sole uniqueness mechanism — callers must enforce unique DB constraint + retry.
  const seq = String(Math.floor(1 + Math.random() * 899999)).padStart(6, "0");
  return `AON-${year}-${seq}`;
}

/**
 * Generate the next AON-YYYY-XXXXXX purchase id using a counters table.
 * Concurrent-safe via unique constraint retries at the insert layer.
 *
 * @param {{ from: (table: string) => any }} db
 * @param {Date} [date]
 */
export async function nextPurchaseId(db, date = new Date()) {
  const year = String(date.getUTCFullYear());

  // Try atomic-ish counter upsert via read-modify-write with unique year key.
  const { data: existing, error: readError } = await db
    .from("purchase_id_counters")
    .select("year,last_seq")
    .eq("year", year)
    .maybeSingle();

  if (readError && !String(readError.message || "").includes("does not exist")) {
    // Table may not be pushed yet — fall back.
    console.error("[purchase_id] counter read failed:", readError.message);
    return createReferenceNumber(date);
  }

  let nextSeq = 1;
  if (!existing) {
    const { data: inserted, error: insertError } = await db
      .from("purchase_id_counters")
      .insert({ year, last_seq: 1 })
      .select("last_seq")
      .single();

    if (insertError) {
      // Race: another writer inserted first — re-read and increment.
      const { data: raced } = await db
        .from("purchase_id_counters")
        .select("last_seq")
        .eq("year", year)
        .maybeSingle();
      nextSeq = Number(raced?.last_seq || 0) + 1;
      await db
        .from("purchase_id_counters")
        .update({ last_seq: nextSeq })
        .eq("year", year);
    } else {
      nextSeq = Number(inserted?.last_seq || 1);
    }
  } else {
    nextSeq = Number(existing.last_seq || 0) + 1;
    const { error: updateError } = await db
      .from("purchase_id_counters")
      .update({ last_seq: nextSeq })
      .eq("year", year)
      .eq("last_seq", existing.last_seq);

    if (updateError) {
      // Optimistic lock lost — re-read.
      const { data: again } = await db
        .from("purchase_id_counters")
        .select("last_seq")
        .eq("year", year)
        .maybeSingle();
      nextSeq = Number(again?.last_seq || 0) + 1;
      await db
        .from("purchase_id_counters")
        .update({ last_seq: nextSeq })
        .eq("year", year);
    }
  }

  if (!Number.isFinite(nextSeq) || nextSeq < 1) {
    return createReferenceNumber(date);
  }

  return `AON-${year}-${String(nextSeq).padStart(6, "0")}`;
}

/**
 * @param {import("@vercel/node").VercelRequest} req
 */
export function getBaseUrl(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

/** Allowed project statuses for orders. */
export const PROJECT_STATUSES = [
  "Deposit Received",
  "Information Required",
  "Quote Preparing",
  "Quote Sent",
  "Waiting for Customer Approval",
  "AppDirect Subscription Pending",
  "AppDirect Subscription Active",
  "Remaining Balance Pending",
  "Fully Paid",
  "Project Started",
  "In Progress",
  "Waiting for Customer",
  "Completed",
  "Cancelled",
];

/**
 * @param {string} status
 */
export function isValidProjectStatus(status) {
  return PROJECT_STATUSES.includes(status);
}
