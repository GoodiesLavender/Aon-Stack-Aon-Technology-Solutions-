import type { VercelRequest, VercelResponse } from "@vercel/node";
import { renderDepositPaymentConfirmation } from "../_lib/email-templates/deposit-payment-confirmation.js";

/**
 * Browser preview for the Deposit Payment Confirmation template.
 * Visit: /api/email-preview/deposit-confirmation
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const template = renderDepositPaymentConfirmation({
      customer_name: "Jane Smith",
      invoice_number: "AON-2026-000123",
      order_number: "AON-2026-000123",
      payment_amount: "$299.50",
      payment_date: "July 28, 2026",
      payment_method: "Stripe / Apple Pay",
      payment_status: "Paid",
      services: [
        {
          name: "Business Website + AI Chatbot Setup — 50% Deposit",
          quantity: 1,
          amount: "$299.50",
        },
      ],
      request_id: "cs_live_example123",
      support_email: "info@aontechnology.com",
      website: "https://aontechnology.com",
      company_name: "Aon Technology Solutions LLC",
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(template.html);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}
