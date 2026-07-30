import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase-admin.js";
import {
  LEGAL_DOCUMENTS,
  LEGAL_META,
  packageLegalSnapshots,
  renderLegalHtml,
  renderLegalText,
} from "./legal-content.js";
import { calcDeposit, formatUsd, resolveService } from "./services.js";

export { LEGAL_DOCUMENTS, LEGAL_META, packageLegalSnapshots, renderLegalHtml, renderLegalText };

export function hashContent(value) {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

export function getBuiltInDocuments() {
  return LEGAL_DOCUMENTS.map((doc) => {
    const content_html = renderLegalHtml(doc);
    const content_text = renderLegalText(doc);
    return {
      document_type: doc.type,
      slug: doc.slug,
      title: doc.title,
      version: LEGAL_META.version,
      effective_at: LEGAL_META.effectiveDate,
      published_at: LEGAL_META.effectiveDate,
      content_html,
      content_text,
      content_hash: hashContent(content_text),
      is_active: true,
      source: "builtin",
    };
  });
}

export function getDocumentBySlug(slug) {
  return getBuiltInDocuments().find((d) => d.slug === slug) || null;
}

export function getDocumentByType(type) {
  return getBuiltInDocuments().find((d) => d.document_type === type) || null;
}

export async function nextAgreementReference() {
  try {
    const { data, error } = await supabaseAdmin.rpc("next_agreement_id");
    if (!error && data) return String(data);
  } catch {
    // fall through
  }
  const year = new Date().getUTCFullYear();
  const seq = String(Math.floor(1 + Math.random() * 899999)).padStart(6, "0");
  return `AGR-${year}-${seq}`;
}

/**
 * Ensure active legal docs exist in Supabase (idempotent seed from built-ins).
 * Safe if table is missing — returns built-ins only.
 */
export async function ensureLegalDocumentsSeeded() {
  const builtins = getBuiltInDocuments();
  try {
    for (const doc of builtins) {
      const { data: existing } = await supabaseAdmin
        .from("legal_documents")
        .select("id")
        .eq("document_type", doc.document_type)
        .eq("version", doc.version)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("legal_documents").insert({
          document_type: doc.document_type,
          title: doc.title,
          version: doc.version,
          effective_at: doc.effective_at,
          published_at: doc.published_at,
          content_html: doc.content_html,
          content_text: doc.content_text,
          content_hash: doc.content_hash,
          is_active: true,
        });
      }
    }
  } catch {
    // Table may not be pushed yet.
  }
  return builtins;
}

export function buildOrderSummary(service, form = {}) {
  const { depositCents, remainingCents } = calcDeposit(service.fullPriceCents);
  const snaps = packageLegalSnapshots(service);
  return {
    serviceId: service.id,
    serviceName: service.name,
    packageName: service.packageName || service.name,
    packageDescription: service.description || service.summary || "",
    deliverables: service.included || [],
    exclusions: service.notIncluded || [],
    revisions: snaps.revisions,
    timeline: snaps.timeline,
    customerResponsibilities: snaps.responsibilities,
    refundSummary: snaps.refund,
    thirdPartySummary: snaps.thirdParty,
    totalServicePriceCents: service.fullPriceCents,
    depositAmountCents: depositCents,
    amountDueTodayCents: depositCents,
    remainingBalanceCents: remainingCents,
    totalServicePrice: formatUsd(service.fullPriceCents),
    depositAmount: formatUsd(depositCents),
    amountDueToday: formatUsd(depositCents),
    remainingBalance: formatUsd(remainingCents),
    currency: "USD",
    remainingBalanceDue:
      service.id === "website_chatbot"
        ? "Before final website launch, transfer, or handoff"
        : "After AppDirect quote approval and agreement milestones; invoiced separately",
    customerName: form.name || "",
    businessName: form.business || "",
    customerEmail: form.email || "",
    customerPhone: form.phone || "",
    customerDomain: form.domain || "",
    customerTitle: form.title || "",
    numberOfUsers: form.users || "",
    businessNeeds: form.notes || "",
  };
}

export function buildAgreementSnapshot(summary, docs, signature) {
  return {
    company: LEGAL_META.companyName,
    website: LEGAL_META.website,
    supportEmail: LEGAL_META.supportEmail,
    governingState: LEGAL_META.governingState,
    governingVenue: LEGAL_META.governingVenue,
    legalPackVersion: LEGAL_META.version,
    acceptedAtIso: new Date().toISOString(),
    signature,
    order: summary,
    documents: docs.map((d) => ({
      type: d.document_type,
      title: d.title,
      version: d.version,
      hash: d.content_hash,
      effective_at: d.effective_at,
    })),
    consentText:
      "By selecting “I Agree and Continue to Secure Payment,” I confirm that I am authorized to enter into this agreement, that the information I provided is accurate, and that my electronic signature has the same intent as signing a paper agreement.",
  };
}

export async function createCustomerAgreement(payload, reqMeta = {}) {
  const service = resolveService(payload.serviceId);
  if (!service) throw new Error("Invalid service selected.");

  const customerName = String(payload.customerName || "").trim();
  const customerEmail = String(payload.customerEmail || "").trim().toLowerCase();
  const signature = String(payload.electronicSignature || "").trim();
  if (!customerName || !customerEmail) throw new Error("Customer name and email are required.");
  if (!signature) throw new Error("Electronic signature is required.");

  const normalizedSig = signature.replace(/\s+/g, " ").trim().toLowerCase();
  const normalizedName = customerName.replace(/\s+/g, " ").trim().toLowerCase();
  if (normalizedSig !== normalizedName && payload.signatureNameConfirmed !== true) {
    throw new Error("Typed signature must match your full legal name, or confirm the name difference.");
  }

  if (
    !payload.checkboxOrderReview ||
    !payload.checkboxThirdParty ||
    !payload.checkboxLegalPolicies ||
    !payload.checkboxEsign
  ) {
    throw new Error("All required agreement checkboxes must be accepted.");
  }

  const docs = await ensureLegalDocumentsSeeded();
  const summary = buildOrderSummary(service, {
    name: customerName,
    business: payload.businessName,
    email: customerEmail,
    phone: payload.customerPhone,
    domain: payload.customerDomain,
    title: payload.customerTitle,
    users: payload.numberOfUsers,
    notes: payload.businessNeeds,
  });

  const snapshot = buildAgreementSnapshot(summary, docs, signature);
  const snapshotJson = JSON.stringify(snapshot);
  const agreementReference = await nextAgreementReference();
  const publicId = randomUUID();
  const accessToken = createAgreementAccessToken();
  const signatureDate =
    payload.signatureDate ||
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Chicago",
    });

  const row = {
    public_id: publicId,
    agreement_reference: agreementReference,
    access_token: accessToken,
    purchase_id: null,
    // auth_user_id left null for guest checkout; server may link later after login
    auth_user_id: payload.authUserId ? String(payload.authUserId) : null,
    customer_name: customerName,
    business_name: String(payload.businessName || "").trim(),
    customer_title: String(payload.customerTitle || "").trim(),
    customer_email: customerEmail,
    customer_phone: String(payload.customerPhone || "").trim(),
    customer_domain: String(payload.customerDomain || "").trim(),
    package_id: service.id,
    package_name: service.packageName || service.name,
    service_name: service.name,
    deliverables_snapshot: summary.deliverables.join("\n"),
    exclusions_snapshot: summary.exclusions.join("\n"),
    customer_responsibilities_snapshot: summary.customerResponsibilities,
    timeline_snapshot: summary.timeline,
    total_service_price_cents: summary.totalServicePriceCents,
    deposit_amount_cents: summary.depositAmountCents,
    amount_paid_today_cents: summary.amountDueTodayCents,
    remaining_balance_cents: summary.remainingBalanceCents,
    currency: "USD",
    refund_summary_snapshot: summary.refundSummary,
    third_party_cost_summary_snapshot: summary.thirdPartySummary,
    accepted_document_versions: JSON.stringify(
      docs.map((d) => ({ type: d.document_type, title: d.title, version: d.version })),
    ),
    accepted_document_hashes: JSON.stringify(
      docs.map((d) => ({ type: d.document_type, hash: d.content_hash })),
    ),
    full_agreement_snapshot: snapshotJson,
    electronic_signature: signature,
    electronic_signature_consent_text: snapshot.consentText,
    signature_date: signatureDate,
    ip_address: reqMeta.ip || "",
    user_agent: reqMeta.userAgent || "",
    payment_status: "pending",
    agreement_status: "accepted_pending_payment",
    marketing_opt_in: payload.marketingOptIn === true,
    checkbox_order_review: true,
    checkbox_third_party: true,
    checkbox_legal_policies: true,
    checkbox_esign: true,
    business_needs: String(payload.businessNeeds || "").trim(),
    number_of_users: String(payload.numberOfUsers || "").trim(),
  };

  const { data, error } = await supabaseAdmin
    .from("customer_agreements")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message || "Unable to save agreement.");

  return {
    id: data.id,
    publicId: data.public_id,
    agreementReference: data.agreement_reference,
    // Returned once at creation for capability-URL style access. Not listed elsewhere.
    accessToken,
    agreementStatus: data.agreement_status,
    paymentStatus: data.payment_status,
    serviceId: data.package_id,
    serviceName: data.service_name,
    packageName: data.package_name,
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    totalServicePrice: formatUsd(data.total_service_price_cents),
    depositAmount: formatUsd(data.deposit_amount_cents),
    remainingBalance: formatUsd(data.remaining_balance_cents),
    totalServicePriceCents: data.total_service_price_cents,
    depositAmountCents: data.deposit_amount_cents,
    remainingBalanceCents: data.remaining_balance_cents,
    acceptedDocumentVersions: JSON.parse(data.accepted_document_versions || "[]"),
    signatureDate: data.signature_date,
  };
}

export async function getAgreementByPublicId(publicId) {
  const { data, error } = await supabaseAdmin
    .from("customer_agreements")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getAgreementByReference(ref) {
  const { data, error } = await supabaseAdmin
    .from("customer_agreements")
    .select("*")
    .eq("agreement_reference", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function markAgreementCheckoutSession(publicId, sessionId) {
  const { error } = await supabaseAdmin
    .from("customer_agreements")
    .update({
      stripe_checkout_session_id: sessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("public_id", publicId)
    .eq("agreement_status", "accepted_pending_payment");
  if (error) throw new Error(error.message);
}

export async function completeAgreementPayment({
  checkoutSessionId,
  paymentIntentId,
  purchaseId,
}) {
  if (!checkoutSessionId) return null;

  const { data: existing } = await supabaseAdmin
    .from("customer_agreements")
    .select("*")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();

  // Also try metadata linkage via agreement public id stored earlier if needed
  let agreement = existing;
  if (!agreement) return null;

  if (agreement.agreement_status === "payment_completed" && agreement.confirmation_email_sent) {
    return agreement;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("customer_agreements")
    .update({
      purchase_id: purchaseId || agreement.purchase_id,
      stripe_payment_intent_id: paymentIntentId || agreement.stripe_payment_intent_id || "",
      payment_status: "completed",
      agreement_status: "payment_completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreement.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

export function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(",")[0].trim();
  return req.socket?.remoteAddress || "";
}
