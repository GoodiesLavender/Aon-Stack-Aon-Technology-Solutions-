import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CHECKOUT_LEGAL_LINKS, LEGAL_LINKS } from "@/lib/legal";
import { cn } from "@/lib/utils";

export type AgreementFormSeed = {
  serviceId: "workspace" | "website_chatbot";
  name: string;
  business: string;
  email: string;
  phone: string;
  domain: string;
  users: string;
  notes: string;
  title?: string;
};

type ServiceView = {
  id: string;
  name: string;
  summary: string;
  included: string[];
  notIncluded: string[];
  fullPriceCents: number;
  regularPriceCents?: number;
  processSteps?: string[];
  clarification?: string;
};

function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function calcDeposit(fullPriceCents: number) {
  const depositCents = Math.round(fullPriceCents * 0.5);
  return { depositCents, remainingCents: fullPriceCents - depositCents };
}

type Props = {
  seed: AgreementFormSeed;
  service: ServiceView;
  onBack: () => void;
};

export function AgreementReview({ seed, service, onBack }: Props) {
  const pricing = useMemo(() => {
    const { depositCents, remainingCents } = calcDeposit(service.fullPriceCents);
    return {
      full: formatUsd(service.fullPriceCents),
      regular: service.regularPriceCents != null ? formatUsd(service.regularPriceCents) : null,
      deposit: formatUsd(depositCents),
      remaining: formatUsd(remainingCents),
    };
  }, [service.fullPriceCents, service.regularPriceCents]);

  const isWebsite = service.id === "website_chatbot";

  const [customerName, setCustomerName] = useState(seed.name);
  const [businessName, setBusinessName] = useState(seed.business);
  const [customerTitle, setCustomerTitle] = useState(seed.title || "");
  const [customerEmail, setCustomerEmail] = useState(seed.email);
  const [customerPhone, setCustomerPhone] = useState(seed.phone);
  const [signature, setSignature] = useState("");
  const [signatureDate] = useState(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Chicago",
    }),
  );

  const [cb1, setCb1] = useState(false);
  const [cb2, setCb2] = useState(false);
  const [cb3, setCb3] = useState(false);
  const [cb4, setCb4] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [confirmNameMismatch, setConfirmNameMismatch] = useState(false);

  const [status, setStatus] = useState<"idle" | "saving" | "redirecting" | "error">("idle");
  const [error, setError] = useState("");
  const [showImportant, setShowImportant] = useState(false);

  const signatureMatches = useMemo(() => {
    const a = signature.replace(/\s+/g, " ").trim().toLowerCase();
    const b = customerName.replace(/\s+/g, " ").trim().toLowerCase();
    return !!a && a === b;
  }, [signature, customerName]);

  const canSubmit =
    customerName.trim() &&
    customerEmail.trim() &&
    signature.trim() &&
    cb1 &&
    cb2 &&
    cb3 &&
    cb4 &&
    (signatureMatches || confirmNameMismatch) &&
    status !== "saving" &&
    status !== "redirecting";

  async function submit() {
    setError("");
    if (!canSubmit) {
      setError("Complete all required fields and checkboxes before continuing.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      const agreeRes = await fetch("/api/legal/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          customerName: customerName.trim(),
          businessName: businessName.trim(),
          customerTitle: customerTitle.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          customerDomain: seed.domain,
          numberOfUsers: seed.users,
          businessNeeds: seed.notes,
          electronicSignature: signature.trim(),
          signatureDate,
          signatureNameConfirmed: !signatureMatches && confirmNameMismatch,
          checkboxOrderReview: cb1,
          checkboxThirdParty: cb2,
          checkboxLegalPolicies: cb3,
          checkboxEsign: cb4,
          marketingOptIn: marketing,
        }),
      });
      const agreement = await agreeRes.json();
      if (!agreeRes.ok) throw new Error(agreement.error || "Unable to save agreement.");

      // Store capability token for the success-page receipt (IDOR mitigation).
      // Token is high-entropy and returned only at creation — never listed by the API.
      try {
        if (agreement.publicId && agreement.accessToken) {
          sessionStorage.setItem(
            `aon_agreement_token_${agreement.publicId}`,
            String(agreement.accessToken),
          );
          sessionStorage.setItem("aon_last_agreement_id", String(agreement.publicId));
        }
      } catch {
        // sessionStorage may be unavailable; checkout can still proceed.
      }

      setStatus("redirecting");
      const checkoutRes = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementPublicId: agreement.publicId,
        }),
      });
      const checkout = await checkoutRes.json();
      if (!checkoutRes.ok || !checkout.url) {
        throw new Error(checkout.error || "Unable to start Stripe Checkout.");
      }
      window.location.assign(checkout.url);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to continue to payment.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Badge variant="outline">Step 2 of 2 · Agreement & payment</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 lg:py-12">
        <div className="mb-8">
          <Badge className="mb-3">Review Your Order & Service Agreement</Badge>
          <h1 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
            Confirm details before secure payment
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
            You must review your order, accept the legal policies, and sign electronically before Stripe Checkout.
            Payment is not completed on this page.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="font-semibold text-lg">Order summary</h2>
                <div className="grid gap-2 text-sm">
                  <Row label="Service" value={service.name} />
                  <Row label="Package" value={service.name} />
                  {pricing.regular && (
                    <Row label="Regular Price" value={pricing.regular} strike />
                  )}
                  <Row
                    label={pricing.regular ? "Launch Special Price" : "Total professional setup fee"}
                    value={pricing.full}
                    strong
                  />
                  <Row label="Deposit Required Today (50%)" value={pricing.deposit} strong gold />
                  <Row label="Amount due today" value={pricing.deposit} />
                  <Row label="Remaining Balance" value={pricing.remaining} />
                  <Row
                    label="Remaining balance due"
                    value={
                      isWebsite
                        ? "Before final website launch, transfer, or handoff"
                        : "After quote approval / agreement milestones (invoiced separately)"
                    }
                  />
                  <Row label="Taxes" value="Applied when required by law" />
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                  Remaining balance is never charged automatically as a recurring subscription from this deposit
                  checkout.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="font-semibold text-lg">Included deliverables</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {service.included.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--gold))]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <h3 className="pt-2 font-semibold">Not included</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {service.notIncluded.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-0.5 text-muted-foreground/70">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {service.clarification && (
                  <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
                    {service.clarification}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-6 text-sm leading-7 text-muted-foreground">
                <h2 className="font-semibold text-lg text-foreground">Payment, refund & third-party disclosures</h2>
                <p>
                  <strong className="text-foreground">Deposit today:</strong> {pricing.deposit} toward {pricing.full}.
                </p>
                <p>
                  <strong className="text-foreground">Third-party costs:</strong> Devs.ai subscriptions, hosting, domains,
                  Google Workspace, Vercel, Supabase, AppDirect products, plugins, and similar provider fees are{" "}
                  <strong className="text-foreground">not included</strong> unless expressly listed in your order.
                </p>
                <p>
                  <strong className="text-foreground">Refunds:</strong> Package-specific rules apply. Deposits may become
                  non-refundable after work begins. Third-party charges are generally non-refundable through Aon
                  Technology. See the Refund Policy.
                </p>
                <p>
                  <strong className="text-foreground">Timeline:</strong>{" "}
                  {isWebsite
                    ? "Most projects begin within 2–3 business days after deposit payment and required information are received."
                    : "Work begins after deposit payment and required information are received."}
                </p>
                <p>
                  <strong className="text-foreground">Customer responsibilities:</strong> Provide accurate information,
                  content, credentials, and timely approvals. Review AI/chatbot output before public use.
                </p>
                <p>
                  Support:{" "}
                  <a className="underline" href="mailto:info@aontechnology.com">
                    info@aontechnology.com
                  </a>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left font-semibold"
                  onClick={() => setShowImportant((v) => !v)}
                >
                  Expand additional important information
                  <span className="text-sm text-muted-foreground">{showImportant ? "Hide" : "Show"}</span>
                </button>
                {showImportant && (
                  <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                    <p>
                      Project timelines do not begin until required payment, information, content, credentials, and
                      approvals are received.
                    </p>
                    <p>
                      Aon Technology does not store complete card numbers. Payments are processed by Stripe.
                    </p>
                    <p>
                      Draft legal terms should be reviewed by a licensed Texas attorney before production publication.
                    </p>
                    {service.processSteps && (
                      <ol className="list-decimal space-y-1 pl-5">
                        {service.processSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="lg:sticky lg:top-24">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[hsl(var(--gold))]" />
                  <h2 className="font-semibold text-lg">Customer & electronic signature</h2>
                </div>

                <div className="grid gap-3">
                  <Field label="Full legal name" value={customerName} onChange={setCustomerName} required />
                  <Field label="Business name" value={businessName} onChange={setBusinessName} />
                  <Field
                    label="Job title / authority (if buying for a business)"
                    value={customerTitle}
                    onChange={setCustomerTitle}
                  />
                  <Field label="Email" value={customerEmail} onChange={setCustomerEmail} type="email" required />
                  <Field label="Phone" value={customerPhone} onChange={setCustomerPhone} />
                  <div className="grid gap-2">
                    <Label htmlFor="signature">
                      Typed electronic signature <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="signature"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Type your full legal name"
                    />
                    <p className="text-xs text-muted-foreground">Signature date: {signatureDate}</p>
                    {signature && !signatureMatches && (
                      <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={confirmNameMismatch}
                          onChange={(e) => setConfirmNameMismatch(e.target.checked)}
                        />
                        I confirm this typed signature is my authorized electronic signature even though it differs
                        slightly from the legal name field.
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <CheckBox
                    checked={cb1}
                    onChange={setCb1}
                    label="I have reviewed my order, package deliverables, exclusions, total price, deposit, remaining balance, project timeline, and customer responsibilities."
                  />
                  <CheckBox
                    checked={cb2}
                    onChange={setCb2}
                    label="I understand that third-party subscriptions, software licenses, hosting, domains, advertising costs, and provider fees are separate unless specifically listed as included in my order."
                  />
                  <CheckBox
                    checked={cb3}
                    onChange={setCb3}
                    label="I have read and agree to the Terms of Service, Privacy Policy, Refund Policy, Payment and Deposit Policy, AI Services Disclaimer, Third-Party Services Disclaimer, Acceptable Use Policy, and Cookie Policy."
                  />
                  <CheckBox
                    checked={cb4}
                    onChange={setCb4}
                    label="I consent to use electronic records and electronic signatures for this transaction and understand that typing my name below represents my electronic signature."
                  />
                  <CheckBox
                    checked={marketing}
                    onChange={setMarketing}
                    label="Optional: I would like to receive occasional product updates from Aon Technology (not required to purchase)."
                  />
                </div>

                <div className="rounded-xl border border-border p-4 text-xs leading-6 text-muted-foreground">
                  <div className="mb-2 font-semibold text-foreground">Legal documents</div>
                  <div className="grid gap-1">
                    {LEGAL_LINKS.map((doc) => (
                      <a
                        key={doc.slug}
                        href={`/legal/${doc.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                      >
                        {doc.title} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>

                <p className="text-xs leading-6 text-muted-foreground">
                  By selecting “I Agree and Continue to Secure Payment,” I confirm that I am authorized to enter into
                  this agreement, that the information I provided is accurate, and that my electronic signature has the
                  same intent as signing a paper agreement.
                </p>

                <Button className="h-12 w-full" disabled={!canSubmit} onClick={submit}>
                  {status === "saving"
                    ? "Saving agreement…"
                    : status === "redirecting"
                      ? "Redirecting to Stripe…"
                      : "I Agree and Continue to Secure Payment"}
                  {status === "idle" || status === "error" ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {CHECKOUT_LEGAL_LINKS.map((doc) => (
                    <a key={doc.slug} className="underline underline-offset-2" href={`/legal/${doc.slug}`} target="_blank" rel="noreferrer">
                      {doc.title}
                    </a>
                  ))}
                </div>

                {error && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  gold,
  strike,
}: {
  label: string;
  value: string;
  strong?: boolean;
  gold?: boolean;
  strike?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right",
          strong && "font-semibold text-foreground",
          gold && "font-semibold text-[hsl(var(--gold))]",
          strike && "line-through decoration-2",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-6">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
