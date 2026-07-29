import { formatUsd } from "./services.js";
import { renderDepositPaymentConfirmation } from "./email-templates/deposit-payment-confirmation.js";

/**
 * @param {{
 *  to: string,
 *  subject: string,
 *  text: string,
 *  html?: string,
 *  replyTo?: string,
 * }} params
 */
export async function sendEmail(params) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Aon Technology Solutions LLC <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html || params.text.replace(/\n/g, "<br>"),
      reply_to: params.replyTo || "info@aontechnology.com",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Failed to send email.");
  }
  return data;
}

/**
 * Internal sales notification to info@aontechnology.com
 */
export function buildSalesNotification(request) {
  const business = request.businessName || "Unknown business";
  const purchaseId = request.purchaseId || request.referenceNumber || "n/a";
  const isWebsite = request.serviceId === "website_chatbot" || request.serviceId === "devsai";
  const subject = `New Deposit Paid — ${business}`;

  const lines = [
    "A customer paid a 50% deposit with Aon Technology Solutions LLC.",
    "",
    `Purchase ID: ${purchaseId}`,
    `Customer Name: ${request.customerName}`,
    `Email: ${request.email}`,
    `Business Name: ${business}`,
    `Phone: ${request.customerPhone || "Not provided"}`,
    `Domain: ${request.customerDomain || "Not provided"}`,
    `Number of Users: ${request.numberOfUsers || "Not provided"}`,
    `Selected Service: ${request.selectedService}`,
    `Package: ${request.packageName || request.selectedService}`,
    `Business Needs: ${request.businessNeeds || "Not provided"}`,
    "",
    `Deposit received: ${formatUsd(request.depositPaidCents)}`,
    `Full professional setup fee: ${formatUsd(request.fullServicePriceCents)}`,
    `Remaining balance: ${formatUsd(request.remainingBalanceCents)}`,
    `Payment status: ${request.paymentStatus || "Deposit Paid"}`,
    `Project status: ${request.projectStatus || "Deposit Received"}`,
    "",
    `Stripe Payment ID: ${request.stripePaymentId || "n/a"}`,
    `Checkout Session ID: ${request.checkoutSessionId}`,
    "",
  ];

  if (isWebsite) {
    lines.push(
      "WEBSITE + CHATBOT PACKAGE NOTES",
      "- A Devs.ai needs assessment is required.",
      "- A separate Devs.ai subscription quote must be prepared.",
      "- Devs.ai subscription is NOT included in the $399 setup fee.",
      "- No custom AI Agent is included.",
      "- Google Workspace is a separate package.",
      "- Third-party costs (domain, hosting, Devs.ai, etc.) are billed separately.",
      "- Remaining $199.50 setup balance is due before final launch/handoff.",
      "",
    );
  }

  lines.push(
    "IMPORTANT: Remaining balance must NOT be charged automatically.",
    "Send a separate Stripe Invoice or Payment Link only after quote approval and agreement signing.",
  );

  return { to: "info@aontechnology.com", subject, text: lines.join("\n") };
}

/**
 * Professional customer auto-reply after a successful deposit payment.
 * Uses purchase_id (AON-YYYY-XXXXXX) as the customer-facing reference.
 */
export function buildCustomerConfirmation(request) {
  const paymentDate =
    request.paymentDate ||
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Chicago",
    });

  const purchaseId = request.purchaseId || request.referenceNumber || "{{purchase_id}}";
  const isWebsite = request.serviceId === "website_chatbot" || request.serviceId === "devsai";

  const template = renderDepositPaymentConfirmation({
    customer_name: request.customerName || "{{customer_name}}",
    invoice_number: purchaseId,
    order_number: purchaseId,
    payment_amount: formatUsd(request.depositPaidCents),
    payment_date: paymentDate,
    payment_method: request.paymentMethod || "Stripe / Apple Pay",
    payment_status: "Paid",
    services: [
      {
        name: `${request.selectedService} — 50% Deposit`,
        quantity: 1,
        amount: formatUsd(request.depositPaidCents),
      },
    ],
    request_id: request.checkoutSessionId || purchaseId,
    support_email: "info@aontechnology.com",
    website: "https://aontechnology.com",
    company_name: "Aon Technology Solutions LLC",
  });

  const extra = [
    "",
    "ADDITIONAL SERVICE DETAILS",
    `Purchase ID: ${purchaseId}`,
    `Service: ${request.selectedService}`,
    `Package: ${request.packageName || request.selectedService}`,
    `Total professional setup fee: ${formatUsd(request.fullServicePriceCents)}`,
    `Deposit paid: ${formatUsd(request.depositPaidCents)}`,
    `Remaining setup balance: ${formatUsd(request.remainingBalanceCents)}`,
  ];

  if (isWebsite) {
    extra.push(
      "Devs.ai subscription: Not included",
      `Devs.ai quote status: ${request.devsAiQuoteStatus || "Pending review"}`,
      "Custom AI Agent: Not included",
      "Google Workspace: Not included",
      "Third-party subscriptions: Billed separately when required",
      "",
      "Your Devs.ai subscription will not be activated automatically. Aon Technology will review your requirements and send a separate quote for your approval.",
      "Your remaining setup balance is due before the final website launch, transfer, or handoff.",
    );
  } else {
    extra.push(
      "Software subscription fees are NOT included and are billed separately when applicable.",
    );
  }

  extra.push(
    "",
    "IMPORTANT",
    "Today's payment is ONLY the deposit for professional setup/service.",
    "The remaining balance is never charged automatically.",
  );

  const text = `${template.text}${extra.join("\n")}`;

  return {
    to: request.email,
    subject: template.subject,
    text,
    html: template.html,
    replyTo: "info@aontechnology.com",
  };
}

export { renderDepositPaymentConfirmation };
