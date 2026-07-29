export type LegalDocMeta = {
  document_type: string;
  slug: string;
  title: string;
  version: string;
  effective_at: string;
  content_hash?: string;
};

export type LegalDoc = LegalDocMeta & {
  content_html: string;
  content_text: string;
  published_at?: string;
};

export const LEGAL_LINKS: LegalDocMeta[] = [
  { document_type: "terms", slug: "terms-of-service", title: "Terms of Service", version: "1.0.0", effective_at: "July 28, 2026" },
  { document_type: "privacy", slug: "privacy-policy", title: "Privacy Policy", version: "1.0.0", effective_at: "July 28, 2026" },
  { document_type: "refund", slug: "refund-policy", title: "Refund Policy", version: "1.0.0", effective_at: "July 28, 2026" },
  { document_type: "payment-deposit", slug: "payment-and-deposit-policy", title: "Payment and Deposit Policy", version: "1.0.0", effective_at: "July 28, 2026" },
  { document_type: "ai-disclaimer", slug: "ai-services-disclaimer", title: "AI Services Disclaimer", version: "1.0.0", effective_at: "July 28, 2026" },
  { document_type: "third-party", slug: "third-party-services-disclaimer", title: "Third-Party Services Disclaimer", version: "1.0.0", effective_at: "July 28, 2026" },
  { document_type: "acceptable-use", slug: "acceptable-use-policy", title: "Acceptable Use Policy", version: "1.0.0", effective_at: "July 28, 2026" },
  { document_type: "cookie", slug: "cookie-policy", title: "Cookie Policy", version: "1.0.0", effective_at: "July 28, 2026" },
];

export const CHECKOUT_LEGAL_LINKS = LEGAL_LINKS.filter((d) =>
  ["terms-of-service", "privacy-policy", "refund-policy", "payment-and-deposit-policy"].includes(d.slug),
);

export type CookieConsentState = {
  consentId: string;
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentVersion: string;
  consentDate: string;
};

const COOKIE_KEY = "aon_cookie_consent_v1";

export function loadCookieConsent(): CookieConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentState;
  } catch {
    return null;
  }
}

export function saveCookieConsentLocal(state: CookieConsentState) {
  localStorage.setItem(COOKIE_KEY, JSON.stringify(state));
}

export async function persistCookieConsent(partial: {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentId?: string;
}) {
  const existing = loadCookieConsent();
  const res = await fetch("/api/legal/cookie-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consentId: partial.consentId || existing?.consentId,
      functional: partial.functional,
      analytics: partial.analytics,
      marketing: partial.marketing,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Unable to save cookie preferences");
  const state: CookieConsentState = {
    consentId: data.consentId,
    essential: true,
    functional: !!data.functional,
    analytics: !!data.analytics,
    marketing: !!data.marketing,
    consentVersion: data.consentVersion || "1.0",
    consentDate: data.consentDate || new Date().toISOString(),
  };
  saveCookieConsentLocal(state);
  return state;
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAgreementPdf(agreement: {
  agreementReference: string;
  purchaseId?: string | null;
  customerName: string;
  businessName?: string;
  customerEmail: string;
  serviceName: string;
  packageName: string;
  totalServicePrice: string;
  depositAmount: string;
  remainingBalance: string;
  electronicSignature: string;
  signatureDate: string;
  deliverables?: string;
  exclusions?: string;
  timeline?: string;
  refundSummary?: string;
  thirdPartySummary?: string;
  acceptedDocumentVersions?: Array<{ title?: string; version?: string }>;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;
  const line = (text: string, opts?: { bold?: boolean; size?: number }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size || 11);
    const lines = doc.splitTextToSize(text, 516);
    for (const l of lines) {
      if (y > 740) {
        doc.addPage();
        y = margin;
      }
      doc.text(l, margin, y);
      y += (opts?.size || 11) + 4;
    }
  };

  line("Aon Technology Solutions LLC", { bold: true, size: 16 });
  line("Service Agreement Confirmation", { bold: true, size: 14 });
  y += 8;
  line(`Agreement Reference: ${agreement.agreementReference}`);
  if (agreement.purchaseId) line(`Purchase Reference: ${agreement.purchaseId}`);
  line(`Customer: ${agreement.customerName}`);
  if (agreement.businessName) line(`Business: ${agreement.businessName}`);
  line(`Email: ${agreement.customerEmail}`);
  line(`Service: ${agreement.serviceName}`);
  line(`Package: ${agreement.packageName}`);
  y += 6;
  line("Payment summary", { bold: true });
  line(`Total professional setup fee: ${agreement.totalServicePrice}`);
  line(`Deposit paid / due at checkout: ${agreement.depositAmount}`);
  line(`Remaining balance: ${agreement.remainingBalance}`);
  y += 6;
  line("Deliverables", { bold: true });
  line(agreement.deliverables || "See package order summary.");
  y += 4;
  line("Exclusions", { bold: true });
  line(agreement.exclusions || "See package order summary.");
  y += 4;
  line("Timeline", { bold: true });
  line(agreement.timeline || "");
  y += 4;
  line("Refund summary", { bold: true });
  line(agreement.refundSummary || "");
  y += 4;
  line("Third-party costs", { bold: true });
  line(agreement.thirdPartySummary || "");
  y += 6;
  line("Electronic signature", { bold: true });
  line(`Signed: ${agreement.electronicSignature}`);
  line(`Signature date: ${agreement.signatureDate}`);
  y += 4;
  line("Legal documents accepted", { bold: true });
  for (const d of agreement.acceptedDocumentVersions || []) {
    line(`- ${d.title || "Document"} (v${d.version || "1.0.0"})`);
  }
  y += 8;
  line("Contact: info@aontechnology.com · https://aontechnology.com", { size: 10 });
  line("This PDF is generated from the agreement snapshot accepted before payment.", { size: 9 });
  line("Draft legal terms should be reviewed by a licensed Texas attorney before production publication.", { size: 9 });

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${agreement.agreementReference}.pdf`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
