import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./supabase-admin.js";
import {
  buildCustomerConfirmation,
  buildSalesNotification,
  sendEmail,
} from "./email.js";
import {
  createReferenceNumber,
  formatUsd,
  nextPurchaseId,
  resolveService,
} from "./services.js";

/**
 * Save the paid order (and legacy deposit_requests row) and send emails.
 * Idempotent on stripe_checkout_session_id / checkout_session_id.
 *
 * Emails send only AFTER the order is stored with a unique purchase_id.
 * If email fails, the order is kept and flags remain false for retry.
 *
 * @param {{
 *  customerName: string,
 *  email: string,
 *  businessName?: string,
 *  customerPhone?: string,
 *  customerDomain?: string,
 *  numberOfUsers?: string,
 *  selectedService: string,
 *  serviceId: string,
 *  packageName?: string,
 *  businessNeeds?: string,
 *  fullServicePriceCents: number,
 *  depositPaidCents: number,
 *  remainingBalanceCents: number,
 *  stripePaymentId?: string,
 *  checkoutSessionId: string,
 *  stripeReceiptUrl?: string,
 *  paymentMethod?: string,
 * }} payload
 */
export async function fulfillDepositPayment(payload) {
  if (!payload.checkoutSessionId) {
    throw new Error("Missing checkout session id.");
  }
  if (!payload.email || !payload.customerName || !payload.selectedService) {
    throw new Error("Missing required customer fields.");
  }

  const service = resolveService(payload.serviceId);
  const packageName = payload.packageName || service?.packageName || payload.selectedService;
  const serviceName = payload.selectedService || service?.name || "Setup service";
  const serviceId = service?.id || payload.serviceId;
  const flags = service?.flags || {
    devsAiSubscriptionIncluded: false,
    customAiAgentIncluded: false,
    googleWorkspaceIncluded: false,
    thirdPartyCostsIncluded: false,
  };

  // ---- Idempotency: prefer orders table ----
  let order = null;
  {
    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("stripe_checkout_session_id", payload.checkoutSessionId)
      .maybeSingle();

    if (existingOrderError && !isMissingTable(existingOrderError)) {
      throw new Error(existingOrderError.message);
    }
    order = existingOrder || null;
  }

  if (!order) {
    let purchaseId = await safeNextPurchaseId();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const insertPayload = {
        public_id: randomUUID(),
        purchase_id: purchaseId,
        stripe_checkout_session_id: payload.checkoutSessionId,
        stripe_payment_intent_id: payload.stripePaymentId || "",
        customer_name: payload.customerName,
        customer_email: String(payload.email).toLowerCase(),
        customer_phone: payload.customerPhone || "",
        customer_company: payload.businessName || "",
        customer_domain: payload.customerDomain || "",
        number_of_users: payload.numberOfUsers || "",
        business_needs: payload.businessNeeds || "",
        service_id: serviceId,
        service_name: serviceName,
        package_name: packageName,
        total_service_price_cents: payload.fullServicePriceCents,
        deposit_amount_paid_cents: payload.depositPaidCents,
        remaining_balance_cents: payload.remainingBalanceCents,
        currency: "USD",
        payment_status: "Deposit Paid",
        project_status: "Deposit Received",
        appdirect_quote_status: "Not Started",
        // Website package starts Devs.ai quote in Pending Review; others Not Started
        devs_ai_quote_status:
          serviceId === "website_chatbot" ? "Pending Review" : "Not Started",
        stripe_receipt_url: payload.stripeReceiptUrl || "",
        devs_ai_subscription_included: !!flags.devsAiSubscriptionIncluded,
        custom_ai_agent_included: !!flags.customAiAgentIncluded,
        google_workspace_included: !!flags.googleWorkspaceIncluded,
        third_party_costs_included: !!flags.thirdPartyCostsIncluded,
        sales_email_sent: false,
        customer_email_sent: false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("orders")
        .insert(insertPayload)
        .select()
        .single();

      if (!error) {
        order = data;
        // Seed status history
        try {
          await supabaseAdmin.from("order_status_history").insert({
            order_id: data.id,
            previous_status: null,
            new_status: "Deposit Received",
            note: "Order created after verified Stripe deposit payment.",
            changed_by: "system",
          });
        } catch (histErr) {
          console.error("[fulfill] status history seed failed:", histErr?.message || histErr);
        }
        break;
      }

      if (error.code === "23505" && String(error.message || "").includes("purchase_id")) {
        purchaseId = await safeNextPurchaseId();
        continue;
      }
      if (error.code === "23505" && String(error.message || "").includes("stripe_checkout_session_id")) {
        const { data: raced } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("stripe_checkout_session_id", payload.checkoutSessionId)
          .maybeSingle();
        order = raced;
        break;
      }
      if (isMissingTable(error)) {
        // orders table not pushed yet — fall through to legacy only
        console.error("[fulfill] orders table missing; using legacy deposit_requests only.");
        break;
      }
      throw new Error(error.message);
    }
  }

  // ---- Legacy deposit_requests mirror (non-destructive) ----
  let legacy = null;
  {
    const { data: existingLegacy, error: legacyReadError } = await supabaseAdmin
      .from("deposit_requests")
      .select("*")
      .eq("checkout_session_id", payload.checkoutSessionId)
      .maybeSingle();
    if (legacyReadError) throw new Error(legacyReadError.message);
    legacy = existingLegacy;

    if (!legacy) {
      const referenceNumber = order?.purchase_id || (await safeNextPurchaseId());
      const { data, error } = await supabaseAdmin
        .from("deposit_requests")
        .insert({
          reference_number: referenceNumber,
          customer_name: payload.customerName,
          email: String(payload.email).toLowerCase(),
          business_name: payload.businessName || "",
          number_of_users: payload.numberOfUsers || "",
          selected_service: serviceName,
          service_id: serviceId,
          business_needs: payload.businessNeeds || "",
          full_service_price_cents: payload.fullServicePriceCents,
          deposit_paid_cents: payload.depositPaidCents,
          remaining_balance_cents: payload.remainingBalanceCents,
          stripe_payment_id: payload.stripePaymentId || "",
          checkout_session_id: payload.checkoutSessionId,
          status: "deposit_paid",
          sales_email_sent: false,
          customer_email_sent: false,
        })
        .select()
        .single();

      if (!error) {
        legacy = data;
      } else if (error.code === "23505") {
        const { data: raced } = await supabaseAdmin
          .from("deposit_requests")
          .select("*")
          .eq("checkout_session_id", payload.checkoutSessionId)
          .maybeSingle();
        legacy = raced;
      } else {
        // Don't fail the whole fulfillment if legacy mirror fails after orders save
        console.error("[fulfill] legacy insert failed:", error.message);
      }
    }
  }

  if (!order && !legacy) {
    throw new Error("Unable to save deposit order.");
  }

  const purchaseId = order?.purchase_id || legacy?.reference_number;
  const requestView = {
    customerName: order?.customer_name || legacy?.customer_name || payload.customerName,
    email: order?.customer_email || legacy?.email || payload.email,
    businessName: order?.customer_company || legacy?.business_name || payload.businessName || "",
    customerPhone: order?.customer_phone || payload.customerPhone || "",
    customerDomain: order?.customer_domain || payload.customerDomain || "",
    numberOfUsers: order?.number_of_users || legacy?.number_of_users || payload.numberOfUsers || "",
    selectedService: order?.service_name || legacy?.selected_service || serviceName,
    packageName: order?.package_name || packageName,
    serviceId,
    businessNeeds: order?.business_needs || legacy?.business_needs || payload.businessNeeds || "",
    fullServicePriceCents:
      order?.total_service_price_cents ?? legacy?.full_service_price_cents ?? payload.fullServicePriceCents,
    depositPaidCents:
      order?.deposit_amount_paid_cents ?? legacy?.deposit_paid_cents ?? payload.depositPaidCents,
    remainingBalanceCents:
      order?.remaining_balance_cents ?? legacy?.remaining_balance_cents ?? payload.remainingBalanceCents,
    stripePaymentId:
      order?.stripe_payment_intent_id || legacy?.stripe_payment_id || payload.stripePaymentId || "",
    checkoutSessionId: payload.checkoutSessionId,
    referenceNumber: purchaseId,
    purchaseId,
    paymentMethod: payload.paymentMethod || "Stripe / Apple Pay",
    paymentStatus: order?.payment_status || "Deposit Paid",
    projectStatus: order?.project_status || "Deposit Received",
    devsAiQuoteStatus: order?.devs_ai_quote_status || (serviceId === "website_chatbot" ? "Pending Review" : "Not Started"),
    flags: {
      devsAiSubscriptionIncluded: order?.devs_ai_subscription_included ?? flags.devsAiSubscriptionIncluded,
      customAiAgentIncluded: order?.custom_ai_agent_included ?? flags.customAiAgentIncluded,
      googleWorkspaceIncluded: order?.google_workspace_included ?? flags.googleWorkspaceIncluded,
      thirdPartyCostsIncluded: order?.third_party_costs_included ?? flags.thirdPartyCostsIncluded,
    },
  };

  let salesEmailSent = !!(order?.sales_email_sent || legacy?.sales_email_sent);
  let customerEmailSent = !!(order?.customer_email_sent || legacy?.customer_email_sent);
  const emailErrors = [];

  if (!salesEmailSent) {
    try {
      const sales = buildSalesNotification(requestView);
      await sendEmail(sales);
      salesEmailSent = true;
    } catch (err) {
      emailErrors.push(`sales: ${err instanceof Error ? err.message : "failed"}`);
      console.error("[fulfill] sales email failed:", err instanceof Error ? err.message : err);
    }
  }

  if (!customerEmailSent) {
    try {
      const customer = buildCustomerConfirmation(requestView);
      await sendEmail(customer);
      customerEmailSent = true;
    } catch (err) {
      emailErrors.push(`customer: ${err instanceof Error ? err.message : "failed"}`);
      console.error("[fulfill] customer email failed:", err instanceof Error ? err.message : err);
    }
  }

  // Persist email flags without creating duplicates
  if (order) {
    await supabaseAdmin
      .from("orders")
      .update({
        sales_email_sent: salesEmailSent,
        customer_email_sent: customerEmailSent,
        stripe_payment_intent_id: requestView.stripePaymentId || order.stripe_payment_intent_id || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
  }
  if (legacy) {
    await supabaseAdmin
      .from("deposit_requests")
      .update({
        sales_email_sent: salesEmailSent,
        customer_email_sent: customerEmailSent,
        stripe_payment_id: requestView.stripePaymentId || legacy.stripe_payment_id || "",
      })
      .eq("id", legacy.id);
  }

  return {
    record: {
      ...requestView,
      fullServicePrice: formatUsd(requestView.fullServicePriceCents),
      depositPaid: formatUsd(requestView.depositPaidCents),
      remainingBalance: formatUsd(requestView.remainingBalanceCents),
      salesEmailSent,
      customerEmailSent,
    },
    emailErrors,
  };
}

async function safeNextPurchaseId() {
  try {
    // Prefer Postgres function if installed
    const { data, error } = await supabaseAdmin.rpc("next_purchase_id");
    if (!error && typeof data === "string" && data.startsWith("AON-")) {
      return data;
    }
  } catch {
    // fall through
  }
  try {
    return await nextPurchaseId(supabaseAdmin);
  } catch {
    return createReferenceNumber();
  }
}

function isMissingTable(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    error?.code === "42P01" ||
    error?.code === "PGRST205"
  );
}
