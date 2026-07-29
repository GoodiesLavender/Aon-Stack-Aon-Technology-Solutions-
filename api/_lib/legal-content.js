/**
 * Draft legal pack content for Aon Technology Solutions LLC.
 *
 * ATTORNEY REVIEW REQUIRED before production publication for:
 * refund restrictions, non-refundable deposits, limitation of liability,
 * indemnification, governing law/venue, dispute resolution, IP ownership,
 * chargeback language, privacy-law applicability, data-retention periods,
 * and any subscription auto-renewal language.
 *
 * Do not claim legal compliance. These are professional drafts.
 */

export const LEGAL_META = {
  companyName: "Aon Technology Solutions LLC",
  website: "https://aontechnology.com",
  supportEmail: "info@aontechnology.com",
  governingState: "Texas",
  governingVenue: "Travis County, Texas",
  effectiveDate: "July 28, 2026",
  version: "1.0.0",
};

/** @typedef {"terms"|"privacy"|"refund"|"payment-deposit"|"ai-disclaimer"|"third-party"|"acceptable-use"|"cookie"} LegalDocType */

/** @type {Array<{ type: LegalDocType, slug: string, title: string, sections: Array<{ id: string, heading: string, body: string[] }> }>} */
export const LEGAL_DOCUMENTS = [
  {
    type: "terms",
    slug: "terms-of-service",
    title: "Terms of Service",
    sections: [
      {
        id: "agreement",
        heading: "1. Agreement",
        body: [
          "These Terms of Service (“Terms”) form a binding agreement between you (“Customer,” “you”) and Aon Technology Solutions LLC (“Aon Technology,” “we,” “us,” or “our”).",
          "By purchasing services, checking the required agreement boxes, typing your electronic signature, or otherwise accepting these Terms, you agree to be bound by them together with our Privacy Policy, Refund Policy, Payment and Deposit Policy, AI Services Disclaimer, Third-Party Services Disclaimer, Acceptable Use Policy, and Cookie Policy.",
          "You must be at least 18 years old and legally authorized to enter into purchases for yourself or the business you represent.",
        ],
      },
      {
        id: "services",
        heading: "2. Services",
        body: [
          "Aon Technology provides professional setup, configuration, consulting, implementation, website, AI chatbot, SaaS onboarding, and related technology services.",
          "The exact scope of work is determined by the selected package, order summary, quote, service agreement, or written statement of work accepted at checkout.",
          "Services not specifically listed in your package or written agreement are not included.",
          "Additional work, revisions beyond the package allowance, integrations, custom development, or out-of-scope services may require a separate quote.",
        ],
      },
      {
        id: "customer-duties",
        heading: "3. Customer Responsibilities",
        body: [
          "You must provide accurate business information, content, images, branding, account access, approvals, and other materials we reasonably request.",
          "You confirm that you have permission to use all materials you provide and that those materials do not infringe third-party rights.",
          "Website content, business claims, trademarks, images, and customer-provided materials remain your responsibility.",
          "Project timelines do not begin until required payment, information, content, credentials, and approvals have been received. Customer delays may extend delivery.",
        ],
      },
      {
        id: "revisions",
        heading: "4. Revisions and Scope",
        body: [
          "The number of revisions included is defined by the selected package configuration shown in your order summary.",
          "Work outside the agreed deliverables may be billed separately after written confirmation.",
        ],
      },
      {
        id: "payment",
        heading: "5. Payment",
        body: [
          "Fees, deposits, remaining balances, and due milestones are described in the Payment and Deposit Policy and your order summary.",
          "Payments are processed by Stripe. We do not store complete credit card or debit card numbers.",
          "We may suspend work for nonpayment, missing information, prohibited use, abusive conduct, security risks, or agreement violations.",
        ],
      },
      {
        id: "third-party",
        heading: "6. Third-Party Platforms",
        body: [
          "Service availability may depend on third-party platforms such as Stripe, Supabase, Vercel, Google Workspace, Devs.ai, AppDirect, domain/hosting providers, and similar services.",
          "Third-party subscription fees, hosting, domains, and software licenses are separate unless expressly included in your order.",
        ],
      },
      {
        id: "no-guarantee",
        heading: "7. No Business Results Guarantee",
        body: [
          "Aon Technology does not guarantee revenue, sales, leads, search rankings, business growth, uninterrupted availability, regulatory approval, or any specific business result.",
        ],
      },
      {
        id: "ip",
        heading: "8. Intellectual Property",
        body: [
          "You retain ownership of customer-provided content.",
          "Aon Technology retains ownership of its pre-existing templates, processes, systems, methods, reusable components, and know-how.",
          "Transfer of completed custom deliverables occurs only after all required payments are completed, unless the applicable package states otherwise.",
          "[ATTORNEY REVIEW] Final intellectual-property ownership and licensing language should be reviewed by a licensed Texas attorney before production publication.",
        ],
      },
      {
        id: "disclaimers",
        heading: "9. Disclaimers",
        body: [
          "Services are provided on a professional-services basis using commercially reasonable efforts.",
          "Except as required by law, services are provided “as is” without warranties of merchantability, fitness for a particular purpose, or non-infringement.",
          "[ATTORNEY REVIEW] Warranty disclaimer language requires attorney review.",
        ],
      },
      {
        id: "liability",
        heading: "10. Limitation of Liability",
        body: [
          "To the maximum extent permitted by applicable law, Aon Technology’s total liability arising out of or related to the services will not exceed the fees you paid to Aon Technology for the specific services giving rise to the claim during the three (3) months before the event.",
          "We are not liable for indirect, incidental, special, consequential, or punitive damages, lost profits, lost data, or business interruption, to the extent permitted by law.",
          "[ATTORNEY REVIEW] Limitation-of-liability language requires attorney review. No mandatory arbitration, jury-trial waiver, or class-action waiver is included.",
        ],
      },
      {
        id: "indemnity",
        heading: "11. Customer Indemnification",
        body: [
          "You agree to defend and indemnify Aon Technology against claims arising from unlawful customer content, intellectual-property violations, misuse of the services, or customer-provided claims and materials, to the extent permitted by law.",
          "[ATTORNEY REVIEW] Indemnification language requires attorney review.",
        ],
      },
      {
        id: "termination",
        heading: "12. Suspension and Termination",
        body: [
          "Either party may terminate for material breach if the breach is not cured within a reasonable period after written notice, except where immediate suspension is needed for security, legal, or abuse reasons.",
          "Sections that by nature should survive termination (including payment obligations already incurred, IP, disclaimers, liability limits, and indemnity) will survive.",
        ],
      },
      {
        id: "law",
        heading: "13. Governing Law and Venue",
        body: [
          "These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law rules.",
          "Exclusive venue for disputes is state or federal courts located in Travis County, Texas, unless applicable law requires otherwise.",
          "[ATTORNEY REVIEW] Governing law, venue, and dispute-resolution language should be confirmed by counsel. These defaults are editable in admin legal settings.",
        ],
      },
      {
        id: "contact",
        heading: "14. Contact",
        body: [
          "Questions about these Terms: info@aontechnology.com",
          "Website: https://aontechnology.com",
        ],
      },
    ],
  },
  {
    type: "privacy",
    slug: "privacy-policy",
    title: "Privacy Policy",
    sections: [
      {
        id: "overview",
        heading: "1. Overview",
        body: [
          "This Privacy Policy explains how Aon Technology Solutions LLC collects, uses, and shares information when you use https://aontechnology.com and our professional services.",
          "We do not claim SOC 2, ISO, HIPAA, or other certifications unless separately documented.",
        ],
      },
      {
        id: "collect",
        heading: "2. Information We Collect",
        body: [
          "We may collect: customer name; business name; email address; phone number; billing and transaction information; service selections; customer communications; project information; website usage information; device information; IP address; cookie and analytics information; agreement acceptance records; electronic-signature evidence; Stripe transaction identifiers; and customer support information.",
        ],
      },
      {
        id: "why",
        heading: "3. Why We Collect Information",
        body: [
          "We use information to process orders and payments; provide services; create customer records; communicate about projects; provide support; prevent fraud; maintain security; send transactional email; improve the website; and comply with legal obligations.",
        ],
      },
      {
        id: "payments",
        heading: "4. Payments",
        body: [
          "Payment card details are processed by Stripe. Complete card numbers, CVCs, and raw payment credentials are not stored in the Aon Technology Solutions LLC database.",
        ],
      },
      {
        id: "processors",
        heading: "5. Service Providers",
        body: [
          "We may share necessary information with processors and providers such as Stripe, Supabase, Vercel, Google Workspace, Devs.ai, AppDirect, Bluehost or domain providers, email delivery providers, analytics providers, and professional advisers or legal authorities when legally required.",
        ],
      },
      {
        id: "retention",
        heading: "6. Retention",
        body: [
          "We retain order, payment, agreement, and support records for as long as needed to provide services, meet legal/accounting obligations, resolve disputes, and enforce agreements.",
          "[ATTORNEY REVIEW / BUSINESS CONFIRMATION] Specific retention periods should be confirmed by the business owner and counsel.",
        ],
      },
      {
        id: "security",
        heading: "7. Security",
        body: [
          "We use reasonable administrative, technical, and organizational measures appropriate to our size and the nature of the data. No security system can guarantee absolute security.",
        ],
      },
      {
        id: "rights",
        heading: "8. Privacy Requests",
        body: [
          "Depending on applicable law (including Texas consumer privacy law and, when applicable, California or other state privacy laws), you may have rights to access, correct, delete, or appeal certain privacy decisions.",
          "Submit privacy requests to info@aontechnology.com. We may need to verify your identity before fulfilling a request.",
          "International users: our services are intended primarily for United States customers and data may be processed in the United States.",
        ],
      },
      {
        id: "children",
        heading: "9. Children’s Privacy",
        body: [
          "Our services are not directed to children under 13, and we do not knowingly collect personal information from children under 13.",
        ],
      },
      {
        id: "contact",
        heading: "10. Contact",
        body: [
          "Privacy requests and questions: info@aontechnology.com",
          "Website: https://aontechnology.com",
        ],
      },
    ],
  },
  {
    type: "refund",
    slug: "refund-policy",
    title: "Refund Policy",
    sections: [
      {
        id: "scope",
        heading: "1. Scope",
        body: [
          "This Refund Policy applies to professional and digital services offered by Aon Technology Solutions LLC.",
          "Refund treatment can differ by package. The package-specific refund summary shown in your order review controls for that purchase.",
          "We do not invent a universal refund period. Package refund configuration is admin-managed.",
        ],
      },
      {
        id: "categories",
        heading: "2. Payment Categories",
        body: [
          "Payments before work begins may be refundable according to the package configuration.",
          "Deposits may become non-refundable after work begins, according to the package configuration.",
          "Work already performed may be non-refundable or only partially refundable based on completed work.",
          "Custom professional services and completed digital deliverables are generally non-refundable once delivered, except where required by law or approved as an exception.",
          "Third-party subscription fees, domains, hosting, and provider charges are generally non-refundable through Aon Technology because they are billed by independent providers.",
          "Exceptional refunds may be approved manually by the business.",
        ],
      },
      {
        id: "cancellations",
        heading: "3. Cancellations",
        body: [
          "Customer cancellations are handled under the package refund rules and any work already performed.",
          "If Aon Technology cancels a service before delivery for reasons within our control, we will provide a fair remedy which may include a refund of unearned fees.",
          "Service failures or outages caused by third-party platforms are outside our direct control and are addressed under the Third-Party Services Disclaimer.",
        ],
      },
      {
        id: "duplicates",
        heading: "4. Duplicate or Incorrect Charges",
        body: [
          "If you believe you were charged twice or charged incorrectly, contact info@aontechnology.com promptly so we can investigate with Stripe records.",
        ],
      },
      {
        id: "chargebacks",
        heading: "5. Chargebacks",
        body: [
          "Please contact us before filing a chargeback so we can attempt to resolve the issue.",
          "Submitting a chargeback without first contacting Aon Technology does not automatically cancel contractual payment obligations for work performed or deliverables provided.",
          "We do not use threatening chargeback language. [ATTORNEY REVIEW] Chargeback wording should be reviewed by counsel.",
        ],
      },
      {
        id: "contact",
        heading: "6. Contact",
        body: ["Refund questions: info@aontechnology.com"],
      },
    ],
  },
  {
    type: "payment-deposit",
    slug: "payment-and-deposit-policy",
    title: "Payment and Deposit Policy",
    sections: [
      {
        id: "pricing",
        heading: "1. Pricing Display",
        body: [
          "Your order summary shows the total service price, deposit amount or percentage, amount due today, remaining balance, and when the remaining balance is due.",
          "If a package uses a 50% deposit, we display the exact dollar amounts for the deposit and remaining balance (not only the percentage).",
        ],
      },
      {
        id: "start",
        heading: "2. When Work Begins",
        body: [
          "Work generally begins after the required deposit is received and any required information, content, credentials, and approvals are provided.",
          "Whether a deposit becomes non-refundable after work begins is defined by the package refund configuration and Refund Policy.",
        ],
      },
      {
        id: "methods",
        heading: "3. Payment Methods",
        body: [
          "We accept payments through Stripe Checkout, which may include major cards and wallet options such as Apple Pay or Google Pay when available.",
          "We do not collect or store complete raw credit-card numbers, security codes, or payment credentials on our website or in Supabase.",
        ],
      },
      {
        id: "balance",
        heading: "4. Remaining Balance",
        body: [
          "The remaining balance is never charged automatically as a recurring subscription by the deposit checkout.",
          "The remaining balance is invoiced separately and becomes due according to the package milestone (for example, before final website launch, transfer, or handoff).",
          "Late or failed payments may pause project work until resolved.",
        ],
      },
      {
        id: "third-party",
        heading: "5. Third-Party Costs",
        body: [
          "Aon Technology setup or consultation fees do not automatically include third-party subscription costs.",
          "Examples of separately billed items may include Devs.ai subscriptions, Google Workspace subscriptions, domain registration or renewal, hosting, Vercel paid plans, Supabase paid plans, Stripe processing fees when legally permitted, AppDirect products, SaaS licenses, advertising, premium plugins, and other software services.",
          "Customers may pay third-party providers directly.",
        ],
      },
      {
        id: "authorization",
        heading: "6. Purchasing on Your Behalf",
        body: [
          "If you authorize Aon Technology to purchase or configure a third-party service for you, we require separate written authorization describing the provider, expected charge, whether the charge is recurring, who owns the provider account, who is responsible for cancellation, that the provider may change its price, and the date/scope of authorization.",
          "Payment information must be entered through the provider’s secure checkout or another approved secure payment platform.",
        ],
      },
      {
        id: "taxes",
        heading: "7. Taxes and Additional Work",
        body: [
          "Taxes may apply when required by law.",
          "Additional-work charges require confirmation before work proceeds.",
        ],
      },
      {
        id: "contact",
        heading: "8. Contact",
        body: ["Payment questions: info@aontechnology.com"],
      },
    ],
  },
  {
    type: "ai-disclaimer",
    slug: "ai-services-disclaimer",
    title: "AI Services Disclaimer",
    sections: [
      {
        id: "nature",
        heading: "1. Nature of AI Output",
        body: [
          "AI-generated content may be incomplete, inaccurate, outdated, biased, or unsuitable for your use case.",
          "AI output must be reviewed by a qualified human before use in business, customer-facing, or decision-making contexts.",
        ],
      },
      {
        id: "not-advice",
        heading: "2. Not Professional Advice",
        body: [
          "AI tools must not be relied upon as legal, medical, accounting, financial, employment, regulatory, emergency, or other professional advice.",
        ],
      },
      {
        id: "customer-review",
        heading: "3. Customer Review and Monitoring",
        body: [
          "You are responsible for reviewing and approving AI responses, website content, chatbot responses, workflows, recommendations, and automated actions.",
          "You must monitor the AI system after launch. Aon Technology is not responsible for customer modifications made after delivery.",
        ],
      },
      {
        id: "limits",
        heading: "4. Limits and Availability",
        body: [
          "We do not guarantee that AI systems will always understand a request or produce a correct answer.",
          "AI systems may experience outages, model changes, usage restrictions, rate limits, or provider changes.",
        ],
      },
      {
        id: "sensitive",
        heading: "5. Sensitive Information",
        body: [
          "Do not submit highly sensitive information unless the system is specifically designed and approved for that purpose.",
          "You are responsible for obtaining any required notices, permissions, or consent from your own users.",
        ],
      },
      {
        id: "results",
        heading: "6. No Results Guarantee",
        body: [
          "No guarantee is made regarding sales, conversions, lead generation, customer satisfaction, compliance, or business results.",
        ],
      },
      {
        id: "contact",
        heading: "7. Contact",
        body: ["Questions: info@aontechnology.com"],
      },
    ],
  },
  {
    type: "third-party",
    slug: "third-party-services-disclaimer",
    title: "Third-Party Services Disclaimer",
    sections: [
      {
        id: "independent",
        heading: "1. Independent Providers",
        body: [
          "Aon Technology may recommend, configure, integrate, or assist with third-party platforms. Those providers are independent companies.",
          "Their prices, features, terms, privacy practices, availability, APIs, and limitations may change.",
        ],
      },
      {
        id: "accounts",
        heading: "2. Accounts and Terms",
        body: [
          "You may need to create and maintain separate accounts and accept each provider’s own terms and privacy policy.",
          "Keep account ownership, recovery email, administrator access, and billing information current.",
          "Aon Technology should not be listed as the permanent legal owner of your third-party accounts.",
        ],
      },
      {
        id: "fees",
        heading: "3. Fees and Cancellations",
        body: [
          "Subscription fees, usage charges, taxes, renewals, upgrades, cancellations, and overage fees are generally your responsibility unless a written agreement states otherwise.",
        ],
      },
      {
        id: "control",
        heading: "4. Outside Our Direct Control",
        body: [
          "We cannot guarantee provider approval, uninterrupted third-party service, or that a provider will not change pricing or features.",
          "Provider outages, suspensions, account reviews, API changes, pricing changes, or termination are outside Aon Technology’s direct control.",
          "Aon Technology is not the payment processor, hosting company, domain registrar, AI model provider, or software publisher unless expressly stated in writing.",
        ],
      },
      {
        id: "contact",
        heading: "5. Contact",
        body: ["Questions: info@aontechnology.com"],
      },
    ],
  },
  {
    type: "acceptable-use",
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    sections: [
      {
        id: "prohibited",
        heading: "1. Prohibited Uses",
        body: [
          "You may not use our services for illegal activities; fraud; deceptive conduct; impersonation; phishing; spam; harassment; hate or discriminatory abuse; malware; credential theft; unauthorized surveillance; unauthorized data collection; intellectual-property infringement; privacy violations; security attacks; circumvention of platform restrictions; prohibited or harmful AI use; uploading content without authorization; providing unlicensed professional advice; using chatbots to misrepresent human identity; or collecting sensitive personal information without appropriate notice and permission.",
        ],
      },
      {
        id: "enforcement",
        heading: "2. Enforcement",
        body: [
          "Aon Technology may suspend or terminate services for prohibited use, legal risk, security risk, platform-policy violations, or abuse.",
        ],
      },
      {
        id: "contact",
        heading: "3. Contact",
        body: ["Report abuse: info@aontechnology.com"],
      },
    ],
  },
  {
    type: "cookie",
    slug: "cookie-policy",
    title: "Cookie Policy",
    sections: [
      {
        id: "what",
        heading: "1. What Are Cookies",
        body: [
          "Cookies and similar technologies help websites function, remember preferences, and understand usage.",
        ],
      },
      {
        id: "types",
        heading: "2. Types We May Use",
        body: [
          "Essential cookies: required for core site and security functions.",
          "Functional cookies: remember preferences such as theme or cookie choices.",
          "Analytics cookies: help us understand site usage (only with appropriate consent when required).",
          "Advertising or marketing cookies: used only if enabled and consented when required.",
          "Third-party cookies: set by providers embedded on the site.",
        ],
      },
      {
        id: "duration",
        heading: "3. Duration",
        body: [
          "Session cookies expire when you close your browser. Persistent cookies remain for a set period or until deleted.",
        ],
      },
      {
        id: "manage",
        heading: "4. Managing Preferences",
        body: [
          "You can Accept All, Reject Non-Essential, or Manage Preferences through our cookie banner.",
          "You can reopen cookie preferences from the website footer at any time.",
          "Browser controls can also block or delete cookies. Disabling essential cookies may affect site functionality.",
          "Where legally applicable, we honor Global Privacy Control (GPC) signals for relevant non-essential cookies.",
        ],
      },
      {
        id: "consent",
        heading: "5. Consent",
        body: [
          "Non-essential cookies are not pre-checked. Optional analytics or advertising cookies are not loaded until you make an appropriate consent choice when consent is legally required.",
          "We store consent choice, consent date, consent version, and relevant cookie categories.",
        ],
      },
      {
        id: "contact",
        heading: "6. Contact",
        body: ["Cookie questions: info@aontechnology.com"],
      },
    ],
  },
];

export function renderLegalHtml(doc) {
  const toc = doc.sections
    .map((s) => `<li><a href="#${s.id}">${escapeHtml(s.heading)}</a></li>`)
    .join("");
  const sections = doc.sections
    .map(
      (s) => `
      <section id="${s.id}" style="margin:28px 0;">
        <h2 style="font-size:1.25rem;margin:0 0 12px;">${escapeHtml(s.heading)}</h2>
        ${s.body.map((p) => `<p style="margin:0 0 12px;line-height:1.7;color:#374151;">${escapeHtml(p)}</p>`).join("")}
      </section>`,
    )
    .join("");

  return `
    <article class="legal-doc">
      <header style="margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem;">${escapeHtml(LEGAL_META.companyName)}</p>
        <h1 style="margin:0 0 12px;font-size:2rem;">${escapeHtml(doc.title)}</h1>
        <p style="margin:0;color:#4b5563;font-size:0.95rem;">
          Effective Date: ${escapeHtml(LEGAL_META.effectiveDate)} ·
          Last Updated: ${escapeHtml(LEGAL_META.effectiveDate)} ·
          Version ${escapeHtml(LEGAL_META.version)}
        </p>
      </header>
      <nav aria-label="Table of contents" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <strong>Table of contents</strong>
        <ol style="margin:12px 0 0;padding-left:1.25rem;line-height:1.8;">${toc}</ol>
      </nav>
      ${sections}
      <footer style="margin-top:36px;padding-top:20px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;"><strong>Contact</strong></p>
        <p style="margin:0 0 8px;">Email: <a href="mailto:${LEGAL_META.supportEmail}">${LEGAL_META.supportEmail}</a></p>
        <p style="margin:0;"><a href="${LEGAL_META.website}">${LEGAL_META.website}</a></p>
        <p style="margin:16px 0 0;font-size:0.85rem;color:#6b7280;">
          Draft for business use. Final legal wording should be reviewed by a licensed Texas attorney before production publication.
        </p>
      </footer>
    </article>
  `;
}

export function renderLegalText(doc) {
  const lines = [
    LEGAL_META.companyName,
    doc.title,
    `Effective Date: ${LEGAL_META.effectiveDate}`,
    `Last Updated: ${LEGAL_META.effectiveDate}`,
    `Version: ${LEGAL_META.version}`,
    "",
  ];
  for (const s of doc.sections) {
    lines.push(s.heading);
    for (const p of s.body) lines.push(p, "");
  }
  lines.push("Contact: " + LEGAL_META.supportEmail, LEGAL_META.website);
  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function packageLegalSnapshots(service) {
  const revisions =
    service.id === "website_chatbot"
      ? "One revision round included."
      : "Revision scope follows the selected Google Workspace package configuration.";
  const timeline =
    service.id === "website_chatbot"
      ? "Most projects begin within 2–3 business days after deposit payment and receipt of required information, content, credentials, and approvals. Remaining balance is due before final website launch, transfer, or handoff."
      : "Work begins after deposit payment and receipt of required information. Remaining balance is invoiced after AppDirect quote approval and agreement milestones described in your order.";
  const refund =
    service.id === "website_chatbot"
      ? "Deposit may become non-refundable after work begins per package configuration. Completed custom website/chatbot work is generally non-refundable. Third-party fees are non-refundable through Aon Technology. Exceptional refunds may be approved manually. See Refund Policy."
      : "Deposit and refund treatment follow package configuration. Third-party subscription fees are separate and generally non-refundable through Aon Technology. See Refund Policy.";
  const thirdParty =
    "Third-party subscriptions and provider fees are NOT included unless expressly listed. Examples: Devs.ai, Google Workspace, domains, hosting, Vercel, Supabase, AppDirect products, plugins, and advertising. Customer may pay providers directly.";
  const responsibilities = [
    "Provide accurate business information and timely approvals.",
    "Provide content, branding, and access credentials when requested.",
    "Review AI/chatbot output before public use.",
    "Maintain ownership of third-party accounts and billing.",
    "Pay remaining balance before final handoff/launch milestones.",
  ].join("\n");

  return {
    deliverables: (service.included || []).join("\n"),
    exclusions: (service.notIncluded || []).join("\n"),
    revisions,
    timeline,
    refund,
    thirdParty,
    responsibilities,
  };
}
