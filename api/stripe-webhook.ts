import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fulfillDepositPayment } from "./_lib/deposit-fulfillment.js";
import { calcDeposit, cleanStripeSecret, resolveService } from "./_lib/services.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string) {
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header.");

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((item) => {
      const [k, ...rest] = item.split("=");
      return [k.trim(), rest.join("=")];
    }),
  ) as Record<string, string>;

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("Invalid Stripe signature header.");

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) {
    throw new Error("Stripe signature timestamp is outside the allowed tolerance.");
  }

  const payload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    throw new Error("Stripe signature verification failed.");
  }
}

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
  currency?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

function paymentIntentId(session: StripeSession) {
  if (!session.payment_intent) return "";
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent.id || "";
}

/**
 * Retrieve Checkout Session from Stripe Live API to validate paid amount
 * server-side (never trust browser-submitted amounts).
 */
async function retrieveSession(sessionId: string, secretKey: string) {
  const upstream = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const data = await upstream.json();
  if (!upstream.ok) {
    throw new Error(data?.error?.message || "Unable to retrieve Checkout Session from Stripe.");
  }
  return data as StripeSession & {
    payment_intent?: string | { id?: string; charges?: { data?: Array<{ receipt_url?: string }> } } | null;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET is not configured." });
    }

    const stripeSecret = cleanStripeSecret(process.env.STRIPE_SECRET_KEY);
    if (!stripeSecret?.startsWith("sk_live_")) {
      return res.status(500).json({ error: "Stripe live secret key is required." });
    }

    const rawBody = await readRawBody(req);
    verifyStripeSignature(rawBody, req.headers["stripe-signature"] as string | undefined, webhookSecret);

    const event = JSON.parse(rawBody.toString("utf8")) as {
      id?: string;
      type?: string;
      data?: { object?: StripeSession };
    };

    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({ received: true, ignored: event.type || "unknown" });
    }

    const eventSession = event.data?.object;
    if (!eventSession?.id) {
      return res.status(400).json({ error: "Missing checkout session in webhook payload." });
    }

    // Re-fetch session from Stripe — source of truth for amount / payment_status.
    const session = await retrieveSession(eventSession.id, stripeSecret);

    if (session.payment_status && session.payment_status !== "paid") {
      return res.status(200).json({ received: true, ignored: "unpaid_session" });
    }

    const metadata = session.metadata || {};
    const service = resolveService(metadata.service_id);
    if (!service) {
      console.error("[webhook] unknown service_id on session", session.id);
      return res.status(400).json({ error: "Unknown service on checkout session metadata." });
    }

    const { depositCents, remainingCents } = calcDeposit(service.fullPriceCents);

    // Prefer Stripe amount_total (cents). Fall back to catalog deposit.
    const paidCents = Number(session.amount_total ?? depositCents);
    if (!Number.isFinite(paidCents) || paidCents <= 0) {
      return res.status(400).json({ error: "Invalid paid amount on Checkout Session." });
    }

    // Soft validation: paid amount should match expected deposit (allow small drift only via metadata override).
    const expectedDeposit = Number(metadata.deposit_paid_cents || depositCents);
    if (Math.abs(paidCents - expectedDeposit) > 1) {
      console.error("[webhook] amount mismatch", {
        sessionId: session.id,
        paidCents,
        expectedDeposit,
        serviceId: service.id,
      });
      // Still accept Stripe's amount as truth for the deposit paid, but compute remaining from catalog full price.
    }

    const fullServicePriceCents = Number(metadata.full_service_price_cents || service.fullPriceCents);
    const remainingBalanceCents = Math.max(0, fullServicePriceCents - paidCents);

    let receiptUrl = "";
    const pi = session.payment_intent;
    if (pi && typeof pi === "object") {
      const charges = (pi as { charges?: { data?: Array<{ receipt_url?: string }> } }).charges;
      receiptUrl = charges?.data?.[0]?.receipt_url || "";
    }

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
      remainingBalanceCents: Number(metadata.remaining_balance_cents || remainingBalanceCents || remainingCents),
      stripePaymentId: paymentIntentId(session),
      checkoutSessionId: session.id,
      stripeReceiptUrl: receiptUrl,
      paymentMethod: "Stripe / Apple Pay",
    });

    // Link verified payment to pre-checkout legal agreement (immutable snapshot).
    let agreementReference = metadata.agreement_reference || "";
    try {
      // Ensure checkout session id is on the agreement row (idempotent).
      if (metadata.agreement_id) {
        const { markAgreementCheckoutSession } = await import("./_lib/legal.js");
        await markAgreementCheckoutSession(metadata.agreement_id, session.id);
      }
      const agreement = await completeAgreementPayment({
        checkoutSessionId: session.id,
        paymentIntentId: paymentIntentId(session),
        purchaseId: result.record.purchaseId || result.record.referenceNumber,
      });
      if (agreement?.agreement_reference) {
        agreementReference = agreement.agreement_reference;
      }
    } catch (agreeErr) {
      console.error(
        "[webhook] agreement completion failed:",
        agreeErr instanceof Error ? agreeErr.message : "unknown",
      );
    }

    return res.status(200).json({
      received: true,
      purchaseId: result.record.purchaseId || result.record.referenceNumber,
      referenceNumber: result.record.referenceNumber,
      agreementReference,
      emailErrors: result.emailErrors,
    });
  } catch (err) {
    console.error("[webhook] error:", err instanceof Error ? err.message : "unknown");
    return res.status(400).json({ error: err instanceof Error ? err.message : "Webhook error" });
  }
}
