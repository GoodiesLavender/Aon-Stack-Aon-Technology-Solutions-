import type { VercelRequest, VercelResponse } from "@vercel/node";
import { formatUsd } from "../../_lib/services.js";
import { getAgreementByPublicId, getAgreementByReference } from "../../_lib/legal.js";

/**
 * Public-safe agreement receipt lookup by public_id or AGR- reference.
 * Returns summary fields + snapshot for the owner success/download flow.
 * Does not expose admin notes or unrelated customer lists.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Agreement id required." });

    let row = null;
    if (id.startsWith("AGR-")) {
      row = await getAgreementByReference(id);
    } else {
      row = await getAgreementByPublicId(id);
    }

    if (!row) return res.status(404).json({ error: "Agreement not found." });

    // Only expose after acceptance; never list enumeration.
    return res.status(200).json({
      publicId: row.public_id,
      agreementReference: row.agreement_reference,
      purchaseId: row.purchase_id,
      customerName: row.customer_name,
      businessName: row.business_name,
      customerEmail: row.customer_email,
      serviceName: row.service_name,
      packageName: row.package_name,
      totalServicePrice: formatUsd(row.total_service_price_cents),
      depositAmount: formatUsd(row.deposit_amount_cents),
      remainingBalance: formatUsd(row.remaining_balance_cents),
      paymentStatus: row.payment_status,
      agreementStatus: row.agreement_status,
      electronicSignature: row.electronic_signature,
      signatureDate: row.signature_date,
      acceptedAt: row.accepted_at,
      acceptedDocumentVersions: safeJson(row.accepted_document_versions, []),
      deliverables: row.deliverables_snapshot,
      exclusions: row.exclusions_snapshot,
      timeline: row.timeline_snapshot,
      refundSummary: row.refund_summary_snapshot,
      thirdPartySummary: row.third_party_cost_summary_snapshot,
      fullAgreementSnapshot: safeJson(row.full_agreement_snapshot, null),
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}

function safeJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
