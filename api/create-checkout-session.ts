import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  calcDeposit,
  cleanStripeSecret,
  formatUsd,
  getBaseUrl,
  resolveService,
} from "./_lib/services.js";
import {
  getAgreementByPublicId,
  markAgreementCheckoutSession,
} from "./_lib/legal.js";
import { LEGAL_META } from "./_lib/legal-content.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const agreementPublicId =
      typeof req.body?.agreementPublicId === "string" ? req.body.agreementPublicId.trim() : "";
    if (!agreementPublicId) {
      return res.status(400).json({
        error: "Please complete the Review Your Order & Service Agreement step before payment.",
      });
    }

    const agreement = await getAgreementByPublicId(agreementPublicId);
    if (!agreement) {
      return res.status(400).json({ error: "Agreement not found. Please complete the agreement step again." });
    }
    if (agreement.agreement_status === "payment_completed") {
      return res.status(400).json({ error: "This agreement is already paid." });
    }
    if (agreement.agreement_status !== "accepted_pending_payment") {
      return res.status(400).json({ error: "Agreement is not ready for payment." });
    }

    const service = resolveService(agreement.package_id);
    if (!service) {
      return res.status(400).json({ error: "Choose a valid service before checkout." });
    }

    const { depositCents, remainingCents } = calcDeposit(service.fullPriceCents);

    // Server-side amount source of truth from catalog + saved agreement
    if (
      agreement.deposit_amount_cents !== depositCents ||
      agreement.total_service_price_cents !== service.fullPriceCents
    ) {
      return res.status(400).json({
        error: "Agreement pricing no longer matches the current package. Please restart checkout.",
      });
    }

    const secretKey = cleanStripeSecret(process.env.STRIPE_SECRET_KEY);
    if (!secretKey) {
      return res.status(500).json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to the environment." });
    }
    if (!secretKey.startsWith("sk_live_")) {
      return res.status(500).json({ error: "Stripe is not configured for Live mode. Use a live secret key." });
    }

    const customerName = agreement.customer_name;
    const customerEmail = agreement.customer_email;
    const businessName = agreement.business_name || "";
    const customerPhone = agreement.customer_phone || "";
    const customerDomain = agreement.customer_domain || "";
    const numberOfUsers = agreement.number_of_users || "";
    const notes = agreement.business_needs || "";

    const origin = getBaseUrl(req);
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set(
      "success_url",
      `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&agreement_id=${encodeURIComponent(agreement.public_id)}`,
    );
    body.set("cancel_url", `${origin}/payment-cancel?agreement_id=${encodeURIComponent(agreement.public_id)}`);
    body.append("payment_method_types[]", "card");
    body.set("billing_address_collection", "auto");
    body.set("customer_creation", "if_required");
    body.set("customer_email", customerEmail);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", "usd");
    body.set("line_items[0][price_data][unit_amount]", String(depositCents));
    body.set("line_items[0][price_data][product_data][name]", service.stripeProductName);
    body.set(
      "line_items[0][price_data][product_data][description]",
      `${service.description} Full fee ${formatUsd(service.fullPriceCents)}. Deposit due today ${formatUsd(depositCents)}. Remaining balance ${formatUsd(remainingCents)} invoiced later — not charged automatically.`,
    );

    // Stripe Checkout consent collection for Terms of Service when supported
    body.set("consent_collection[terms_of_service]", "required");
    body.set(
      "custom_text[terms_of_service_acceptance][message]",
      `I agree to the Aon Technology Solutions LLC Terms of Service (${LEGAL_META.website}/legal/terms-of-service).`,
    );

    body.set("metadata[service_id]", service.id);
    body.set("metadata[service_name]", service.name);
    body.set("metadata[package_name]", service.packageName);
    body.set("metadata[package_id]", service.id);
    body.set("metadata[payment_type]", "deposit_50");
    body.set("metadata[deposit_percentage]", "50");
    body.set("metadata[currency]", "USD");
    body.set("metadata[full_service_price_cents]", String(service.fullPriceCents));
    body.set("metadata[total_service_price]", (service.fullPriceCents / 100).toFixed(2));
    body.set("metadata[deposit_paid_cents]", String(depositCents));
    body.set("metadata[deposit_amount_paid]", (depositCents / 100).toFixed(2));
    body.set("metadata[remaining_balance_cents]", String(remainingCents));
    body.set("metadata[remaining_balance]", (remainingCents / 100).toFixed(2));
    body.set("metadata[customer_name]", customerName.slice(0, 500));
    body.set("metadata[customer_email]", customerEmail.slice(0, 500));
    body.set("metadata[agreement_id]", agreement.public_id);
    body.set("metadata[agreement_reference]", agreement.agreement_reference);
    body.set("metadata[legal_terms_version]", LEGAL_META.version);
    if (businessName) body.set("metadata[business_name]", businessName.slice(0, 500));
    if (customerPhone) body.set("metadata[customer_phone]", customerPhone.slice(0, 40));
    if (customerDomain) body.set("metadata[customer_domain]", customerDomain.slice(0, 200));
    if (numberOfUsers) body.set("metadata[number_of_users]", numberOfUsers.slice(0, 100));
    if (notes) body.set("metadata[business_needs]", notes.slice(0, 500));

    const flags = service.flags || {
      devsAiSubscriptionIncluded: false,
      customAiAgentIncluded: false,
      googleWorkspaceIncluded: false,
      thirdPartyCostsIncluded: false,
    };
    body.set("metadata[devs_ai_subscription_included]", String(!!flags.devsAiSubscriptionIncluded));
    body.set("metadata[custom_ai_agent_included]", String(!!flags.customAiAgentIncluded));
    body.set("metadata[google_workspace_included]", String(!!flags.googleWorkspaceIncluded));
    body.set("metadata[third_party_costs_included]", String(!!flags.thirdPartyCostsIncluded));

    body.set("payment_intent_data[metadata][service_id]", service.id);
    body.set("payment_intent_data[metadata][payment_type]", "deposit_50");
    body.set("payment_intent_data[metadata][agreement_reference]", agreement.agreement_reference);
    body.set("payment_intent_data[metadata][remaining_balance_cents]", String(remainingCents));

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || "Unable to create Stripe Checkout session." });
    }

    await markAgreementCheckoutSession(agreement.public_id, data.id);

    return res.status(200).json({
      url: data.url,
      id: data.id,
      agreementReference: agreement.agreement_reference,
      agreementPublicId: agreement.public_id,
      depositAmount: formatUsd(depositCents),
      fullServiceFee: formatUsd(service.fullPriceCents),
      remainingBalance: formatUsd(remainingCents),
      serviceName: service.name,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}
