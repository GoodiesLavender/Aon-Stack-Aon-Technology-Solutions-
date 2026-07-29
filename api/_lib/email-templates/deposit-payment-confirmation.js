/**
 * Professional Deposit Payment Confirmation email template
 * Brand: Aon Technology Solutions LLC
 *
 * Dynamic placeholders (resolved at send time):
 * {{customer_name}} {{invoice_number}} {{order_number}} {{payment_amount}}
 * {{payment_date}} {{payment_method}} {{services}} {{request_id}}
 * {{payment_status}} {{support_email}} {{website}} {{company_name}}
 */

/**
 * Escape HTML special characters.
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {{
 *  customer_name?: string,
 *  invoice_number?: string,
 *  order_number?: string,
 *  payment_amount?: string,
 *  payment_date?: string,
 *  payment_method?: string,
 *  payment_status?: string,
 *  services?: string | Array<{ name: string, quantity?: number | string, amount?: string }>,
 *  request_id?: string,
 *  support_email?: string,
 *  website?: string,
 *  company_name?: string,
 * }} data
 */
export function renderDepositPaymentConfirmation(data = {}) {
  const companyName = data.company_name || "Aon Technology Solutions LLC";
  const website = data.website || "https://aontechnology.com";
  const supportEmail = data.support_email || "info@aontechnology.com";
  const customerName = data.customer_name || "{{customer_name}}";
  const invoiceNumber = data.invoice_number || "{{invoice_number}}";
  const orderNumber = data.order_number || "{{order_number}}";
  const paymentAmount = data.payment_amount || "{{payment_amount}}";
  const paymentDate = data.payment_date || "{{payment_date}}";
  const paymentMethod = data.payment_method || "{{payment_method}}";
  const paymentStatus = data.payment_status || "Paid";
  const requestId = data.request_id || "{{request_id}}";

  /** @type {Array<{ name: string, quantity: string, amount: string }>} */
  let serviceRows = [];
  if (Array.isArray(data.services)) {
    serviceRows = data.services.map((item) => ({
      name: item.name || "Service",
      quantity: String(item.quantity ?? 1),
      amount: item.amount || paymentAmount,
    }));
  } else if (typeof data.services === "string" && data.services.trim()) {
    serviceRows = [
      {
        name: data.services,
        quantity: "1",
        amount: paymentAmount,
      },
    ];
  } else {
    serviceRows = [
      {
        name: "{{services}}",
        quantity: "1",
        amount: paymentAmount,
      },
    ];
  }

  const serviceRowsHtml = serviceRows
    .map(
      (row) => `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1f2937;line-height:1.5;">
            ${escapeHtml(row.name)}
          </td>
          <td align="center" style="padding:14px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#4b5563;">
            ${escapeHtml(row.quantity)}
          </td>
          <td align="right" style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#0f172a;">
            ${escapeHtml(row.amount)}
          </td>
        </tr>`,
    )
    .join("");

  const serviceRowsText = serviceRows
    .map((row) => `- ${row.name}  |  Qty: ${row.quantity}  |  Deposit: ${row.amount}`)
    .join("\n");

  const subject = `Deposit Payment Confirmation — ${invoiceNumber}`;

  const text = `Hi ${customerName},

Thank you for choosing ${companyName}.

We have successfully received your deposit payment. This email confirms your payment details and outlines the next steps.

PAYMENT CONFIRMATION
Payment Status: ${paymentStatus}
Deposit Amount: ${paymentAmount}
Invoice Number: ${invoiceNumber}
Order Number: ${orderNumber}
Payment Date: ${paymentDate}
Payment Method: ${paymentMethod}
Request ID: ${requestId}

ORDER SUMMARY
${serviceRowsText}

WHAT HAPPENS NEXT
• We will review your request within 1 business day.
• We may contact you if additional information is required.
• A detailed proposal and implementation schedule will be prepared if applicable.
• Most projects begin within 2–3 business days after receiving all required information.

INFORMATION WE MAY REQUEST
• Business Name
• Domain Name
• Current Email Provider
• Number of Users
• Preferred Go-Live Date

CONTACT INFORMATION
Email: ${supportEmail}
Business Hours: Monday–Friday, 9:00 AM–5:00 PM Central Time
Website: ${website}

LEGAL NOTICE
By submitting your payment, you acknowledge and agree to our Terms of Service, Privacy Policy, and Refund Policy.

Thank you for your trust.
${companyName}
Setup • Support • Growth
${website}
${supportEmail}
`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Deposit Payment Confirmation</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f3f4f6; }
    a { color: #1d4ed8; text-decoration: none; }
    .wrapper { width: 100%; background-color: #f3f4f6; }
    .container { width: 100%; max-width: 640px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
    .btn {
      display: inline-block;
      background-color: #1d4ed8;
      color: #ffffff !important;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
      text-decoration: none;
      padding: 14px 22px;
      border-radius: 10px;
    }
    .btn-secondary {
      display: inline-block;
      background-color: #ffffff;
      color: #1d4ed8 !important;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
      text-decoration: none;
      padding: 13px 20px;
      border-radius: 10px;
      border: 1px solid #bfdbfe;
    }
    .muted { color: #6b7280; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
    .value { color: #111827; font-size: 15px; font-weight: 600; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 18px !important; padding-right: 18px !important; }
      .stack { display: block !important; width: 100% !important; }
      .stack-pad { padding-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    Deposit payment confirmation from ${escapeHtml(companyName)}. Status: ${escapeHtml(paymentStatus)}. Amount: ${escapeHtml(paymentAmount)}.
  </div>

  <table role="presentation" class="wrapper" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" class="container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#0b1f44;border:0;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:28px 32px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#93c5fd;">
                      Deposit Payment Confirmation
                    </div>
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;margin-top:10px;">
                      ${escapeHtml(companyName)}
                    </div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#dbeafe;margin-top:8px;">
                      Setup · Support · Growth
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Thank You -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:28px 32px;">
                    <div style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:6px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                      Payment received
                    </div>
                    <h1 style="margin:16px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#0f172a;">
                      Thank you, ${escapeHtml(customerName)}.
                    </h1>
                    <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4b5563;">
                      Thank you for choosing <strong style="color:#111827;">${escapeHtml(companyName)}</strong>.
                      We have successfully received your deposit. This confirmation summarizes your payment and the next steps for your project.
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;">
                      <tr>
                        <td style="padding-right:10px;">
                          <a class="btn" href="${escapeHtml(website)}" target="_blank" style="background-color:#1d4ed8;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:10px;display:inline-block;">
                            Visit our website
                          </a>
                        </td>
                        <td>
                          <a class="btn-secondary" href="mailto:${escapeHtml(supportEmail)}" style="background-color:#ffffff;color:#1d4ed8;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:13px 20px;border-radius:10px;border:1px solid #bfdbfe;display:inline-block;">
                            Contact support
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Confirmation -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:28px 32px 10px 32px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">
                      Payment Confirmation
                    </div>
                    <h2 style="margin:8px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0f172a;">
                      Deposit details
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:8px 32px 28px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                      <tr>
                        <td class="stack stack-pad" width="50%" style="padding:16px 18px;border-bottom:1px solid #e5e7eb;">
                          <div class="label" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Payment Status</div>
                          <div class="value" style="font-family:Arial,Helvetica,sans-serif;color:#047857;font-size:15px;font-weight:700;margin-top:6px;">${escapeHtml(paymentStatus)}</div>
                        </td>
                        <td class="stack" width="50%" style="padding:16px 18px;border-bottom:1px solid #e5e7eb;">
                          <div class="label" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Deposit Amount</div>
                          <div class="value" style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:15px;font-weight:700;margin-top:6px;">${escapeHtml(paymentAmount)}</div>
                        </td>
                      </tr>
                      <tr>
                        <td class="stack stack-pad" width="50%" style="padding:16px 18px;border-bottom:1px solid #e5e7eb;">
                          <div class="label" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Invoice Number</div>
                          <div class="value" style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;font-weight:600;margin-top:6px;">${escapeHtml(invoiceNumber)}</div>
                        </td>
                        <td class="stack" width="50%" style="padding:16px 18px;border-bottom:1px solid #e5e7eb;">
                          <div class="label" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Order Number</div>
                          <div class="value" style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;font-weight:600;margin-top:6px;">${escapeHtml(orderNumber)}</div>
                        </td>
                      </tr>
                      <tr>
                        <td class="stack stack-pad" width="50%" style="padding:16px 18px;border-bottom:1px solid #e5e7eb;">
                          <div class="label" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Payment Date</div>
                          <div class="value" style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;font-weight:600;margin-top:6px;">${escapeHtml(paymentDate)}</div>
                        </td>
                        <td class="stack" width="50%" style="padding:16px 18px;border-bottom:1px solid #e5e7eb;">
                          <div class="label" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Payment Method</div>
                          <div class="value" style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;font-weight:600;margin-top:6px;">${escapeHtml(paymentMethod)}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:16px 18px;">
                          <div class="label" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Request ID</div>
                          <div class="value" style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;font-weight:600;margin-top:6px;">${escapeHtml(requestId)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:28px 32px 12px 32px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">
                      Order Summary
                    </div>
                    <h2 style="margin:8px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0f172a;">
                      Purchased services
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:8px 32px 28px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                      <tr style="background:#0b1f44;">
                        <th align="left" style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#dbeafe;font-weight:700;">Service</th>
                        <th align="center" style="padding:12px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#dbeafe;font-weight:700;">Qty</th>
                        <th align="right" style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#dbeafe;font-weight:700;">Deposit</th>
                      </tr>
                      ${serviceRowsHtml}
                      <tr>
                        <td colspan="2" align="right" style="padding:14px 12px 14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#374151;background:#f8fafc;">
                          Deposit Paid
                        </td>
                        <td align="right" style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0f172a;background:#f8fafc;">
                          ${escapeHtml(paymentAmount)}
                        </td>
                      </tr>
                    </table>
                    <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;">
                      Today's payment is a deposit for professional services. Software subscription fees are billed separately when applicable.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:28px 32px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">
                      What Happens Next
                    </div>
                    <h2 style="margin:8px 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0f172a;">
                      Your project pathway
                    </h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 0 12px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                            <tr>
                              <td width="42" valign="top" style="padding:14px 0 14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1d4ed8;">1</td>
                              <td style="padding:14px 16px 14px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">We will review your request within <strong>1 business day</strong>.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                            <tr>
                              <td width="42" valign="top" style="padding:14px 0 14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1d4ed8;">2</td>
                              <td style="padding:14px 16px 14px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">We may contact you if additional information is required.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                            <tr>
                              <td width="42" valign="top" style="padding:14px 0 14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1d4ed8;">3</td>
                              <td style="padding:14px 16px 14px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">A detailed proposal and implementation schedule will be prepared if applicable.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                            <tr>
                              <td width="42" valign="top" style="padding:14px 0 14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1d4ed8;">4</td>
                              <td style="padding:14px 16px 14px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">Most projects begin within <strong>2–3 business days</strong> after receiving all required information.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Information We May Request -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:28px 32px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">
                      Information We May Request
                    </div>
                    <h2 style="margin:8px 0 14px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0f172a;">
                      To keep your setup on schedule
                    </h2>
                    <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#4b5563;">
                      Depending on your service, our team may request details such as:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td class="stack stack-pad" width="50%" valign="top" style="padding:0 8px 0 0;">
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#1f2937;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;">
                            • Business Name<br />
                            • Domain Name<br />
                            • Current Email Provider
                          </div>
                        </td>
                        <td class="stack" width="50%" valign="top" style="padding:0 0 0 8px;">
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#1f2937;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;">
                            • Number of Users<br />
                            • Preferred Go-Live Date<br />
                            • Access or admin contacts
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:28px 32px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1d4ed8;">
                      Contact Information
                    </div>
                    <h2 style="margin:8px 0 14px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#0f172a;">
                      We're here to help
                    </h2>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4b5563;">
                      Email:
                      <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1d4ed8;font-weight:700;text-decoration:none;">${escapeHtml(supportEmail)}</a>
                    </p>
                    <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#4b5563;">
                      Business Hours:<br />
                      <strong style="color:#111827;">Monday–Friday</strong><br />
                      9:00 AM–5:00 PM Central Time
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
                      <tr>
                        <td>
                          <a class="btn" href="mailto:${escapeHtml(supportEmail)}" style="background-color:#1d4ed8;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:10px;display:inline-block;">
                            Email ${escapeHtml(supportEmail)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Legal -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="card" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td class="px" style="padding:24px 32px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">
                      Legal Notice
                    </div>
                    <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6b7280;">
                      By submitting your payment, you acknowledge and agree to our
                      <a href="${escapeHtml(website)}/terms" style="color:#1d4ed8;text-decoration:underline;">Terms of Service</a>,
                      <a href="${escapeHtml(website)}/privacy" style="color:#1d4ed8;text-decoration:underline;">Privacy Policy</a>,
                      and
                      <a href="${escapeHtml(website)}/refund-policy" style="color:#1d4ed8;text-decoration:underline;">Refund Policy</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1f44;border-radius:14px;">
                <tr>
                  <td class="px" align="center" style="padding:28px 32px;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#ffffff;">
                      ${escapeHtml(companyName)}
                    </div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;margin-top:8px;">
                      Setup · Support · Growth
                    </div>
                    <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#dbeafe;">
                      Thank you for trusting us with your technology setup.
                    </p>
                    <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#bfdbfe;">
                      <a href="${escapeHtml(website)}" style="color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(website.replace(/^https?:\/\//, ""))}</a>
                      &nbsp;·&nbsp;
                      <a href="mailto:${escapeHtml(supportEmail)}" style="color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(supportEmail)}</a>
                    </p>
                    <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#94a3b8;">
                      This message was sent regarding your deposit payment. Please keep it for your records.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
