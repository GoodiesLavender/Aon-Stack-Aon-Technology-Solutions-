import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fulfillDepositPayment } from "../_lib/deposit-fulfillment.js";
import { calcDeposit, cleanStripeSecret, resolveService } from "../_lib/services.js";

type StripeSession = {
  id: string;
  payment_status?: string;
  payment_intent?: string | { id?: string } | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  customer_email?: string | null;
  amount_total?: number | null;
  metadata?: Record<string, string | undefined> | null;
};

function paymentIntentId(session: StripeSession) {
  if (!session.payment_intent) return "";
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent.id || "";
}

/**
 * Success-page fallback when the Stripe webhook has not delivered yet.
 * Verifies the Checkout Session with Stripe Live API before saving/emailing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    if (!sessionId.startsWith("cs_")) {
      return res.status(400).json({ error: "A valid Stripe Checkout session id is required." });
    }

    const secretKey = cleanStripeSecret(process.env.STRIPE_SECRET_KEY);
    if (!secretKey?.startsWith("sk_live_")) {
      return res.status(500).json({ error: "Stripe live secret key is required." });
    }

    const upstream = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const session = (await upstream.json()) as StripeSession & { error?: { message?: string } };
    if (!upstream.ok) {
      return res.status(400).json({ error: session?.error?.message || "Unable to verify Stripe Checkout session." });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Deposit payment is not completed yet." });
    }

    const metadata = session.metadata || {};
    const service = resolveService(metadata.service_id);
    if (!service) {
      return res.status(400).json({ error: "Unknown service on checkout session metadata." });
    }

    const { depositCents, remainingCents } = calcDeposit(service.fullPriceCents);
    const paidCents = Number(session.amount_total ?? depositCents);
    const fullServicePriceCents = Number(metadata.full_service_price_cents || service.fullPriceCents);
    const remainingBalanceCents = Math.max(
      0,
      Number(metadata.remaining_balance_cents || fullServicePriceCents - paidCents || remainingCents),
    );

    const result = await fulfillDepositPayment({
      customerName: metadata.customer_name || session.customer_details?.name || "Customer",
      email: metadata.customer_email || session.customer_details?.email || session.customer_email || "",
      businessName: metadata.business_name || "",
      customerPhone: metadata.customer_phone || session.customer_details?.phone || "",
      customerDomain: metadata.customer_domain || "",
      numberOfUsers: metadata.number_of_users || "",
      selectedService: metadata.service_name || service.name,
      packageName: metadata.package_name || service.packageName,
      serviceId: service.id,
      businessNeeds: metadata.business_needs || "",
      fullServicePriceCents,
      depositPaidCents: paidCents,
      remainingBalanceCents,
      stripePaymentId: paymentIntentId(session),
      checkoutSessionId: session.id,
      paymentMethod: "Stripe / Apple Pay",
    });

    return res.status(200).json(result.record);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}
