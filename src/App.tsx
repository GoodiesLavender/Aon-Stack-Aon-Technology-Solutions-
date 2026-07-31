import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Globe,
  Mail,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import { GridPattern } from "@/components/ui/grid-pattern";
import { MagicCard } from "@/components/ui/magic-card";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { LegalPage } from "@/components/LegalPage";
import { AgreementReview, type AgreementFormSeed } from "@/components/AgreementReview";
import { CookieConsent } from "@/components/CookieConsent";
import { CHECKOUT_LEGAL_LINKS, LEGAL_LINKS, downloadAgreementPdf } from "@/lib/legal";

type ServiceId = "workspace" | "website_chatbot";

type Service = {
  id: ServiceId;
  eyebrow: string;
  name: string;
  fullPriceCents: number;
  regularPriceCents?: number;
  privatePrice: string;
  publicPrice: string;
  summary: string;
  included: string[];
  notIncluded: string[];
  badge?: string;
  disclosures?: string[];
  processSteps?: string[];
  clarification?: string;
};

type DepositRecord = {
  referenceNumber?: string;
  purchaseId?: string;
  selectedService: string;
  fullServicePrice: string;
  depositPaid: string;
  remainingBalance: string;
  customerName?: string;
  email?: string;
  packageName?: string;
  devsAiQuoteStatus?: string;
  serviceId?: string;
};

type AgreementReceipt = {
  publicId: string;
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
  agreementStatus?: string;
  paymentStatus?: string;
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
  const remainingCents = fullPriceCents - depositCents;
  return { depositCents, remainingCents };
}

const services: Service[] = [
  {
    id: "workspace",
    eyebrow: "Email & productivity",
    name: "Google Workspace Setup",
    fullPriceCents: 5900,
    privatePrice: "$59.00 full service fee · 50% deposit today",
    publicPrice: "50% deposit due today · remaining balance invoiced later",
    summary:
      "Affordable setup guidance for professional business email, initial account configuration, basic user setup, and orientation.",
    included: [
      "Initial account setup guidance",
      "Business email setup guidance",
      "Basic user configuration",
      "Basic orientation",
      "AppDirect partner quote for monthly subscription costs",
    ],
    notIncluded: [
      "Google Workspace monthly subscription fees",
      "Domain purchase fees",
      "Advanced migration or ongoing IT support",
      "Work outside the owner-approved final scope",
      "Automatic charging of the remaining balance",
    ],
    badge: "Most requested",
  },
  {
    id: "website_chatbot",
    eyebrow: "Website + chatbot",
    name: "Business Website + AI Chatbot Setup",
    fullPriceCents: 89900,
    regularPriceCents: 109900,
    privatePrice: "$899.00 launch special · 50% deposit $449.50 today",
    publicPrice: "$899 launch special · $449.50 deposit today · balance before launch",
    summary:
      "Launch a professional, mobile-friendly business website with a Devs.ai-powered chatbot. The chatbot will be configured using the client’s approved business information to answer common questions, explain services, direct visitors to relevant information, and help collect customer inquiries. The $899 fee is a one-time professional service fee charged by Aon Technology for website creation, chatbot setup, basic deployment assistance, testing, and client handoff. A 50% deposit of $449.50 is required to begin. The remaining balance of $449.50 is due before the final website launch, transfer, or handoff.",
    included: [
      "Initial business discovery and setup consultation",
      "Mobile-friendly business website",
      "Up to 3 standard website pages or sections",
      "Devs.ai-powered website chatbot",
      "Basic chatbot configuration using approved business information",
      "Contact or inquiry form",
      "Basic domain and deployment assistance",
      "Desktop and mobile testing",
      "One revision round",
      "Basic client training and handoff",
      "Seven days of post-launch setup support",
    ],
    notIncluded: [
      "Custom AI Agent",
      "Advanced AI workflow automation",
      "Email automation",
      "Calendar automation",
      "CRM automation or integration",
      "Automated quoting or invoicing",
      "Google Workspace setup or subscription",
      "E-commerce development",
      "Customer portal development",
      "Advanced database development",
      "Custom API integrations",
      "Logo or complete brand identity design",
      "Paid advertising",
      "Advanced SEO",
      "Unlimited revisions",
      "Ongoing website maintenance",
      "Ongoing chatbot management",
      "Third-party subscription fees",
    ],
    badge: "Website + chatbot",
    clarification:
      "The website chatbot included in this package is designed to answer common questions, explain business services, provide basic information, direct visitors, and collect inquiries. It is not a custom AI Agent that independently sends emails, manages calendars, updates CRM systems, creates quotes, produces invoices, or performs multi-step business workflows.",
    processSteps: [
      "Client pays the $449.50 website and chatbot setup deposit.",
      "Aon Technology reviews the client’s business requirements.",
      "Aon Technology determines the appropriate Devs.ai subscription.",
      "A separate Devs.ai subscription quote is sent to the client.",
      "Client reviews and approves the Devs.ai quote.",
      "Devs.ai subscription is billed separately from the $899 setup fee.",
      "Aon Technology builds the website and configures the chatbot.",
      "Remaining $449.50 setup balance is due before final launch or handoff.",
    ],
  },
];

const faqs = [
  {
    q: "Do I pay the full setup fee today?",
    a: "No. Customers pay only a 50% deposit today through Stripe Checkout. For Business Website + AI Chatbot Setup that is $449.50 of the $899.00 fee. The remaining balance is never charged automatically and is due before final launch or handoff.",
  },
  {
    q: "Is a custom AI Agent included in the website package?",
    a: "No. The website package includes a Devs.ai-powered website chatbot only. It is not a custom AI Agent and does not independently send emails, manage calendars, update CRMs, create quotes, or run multi-step workflows. Custom AI Agents require a separate quote.",
  },
  {
    q: "Are Devs.ai, hosting, and domain fees included in the $899?",
    a: "No. The $899 one-time fee covers Aon Technology’s professional website and chatbot setup services only. Devs.ai subscriptions, domain registration, hosting, and other third-party costs are quoted and billed separately.",
  },
  {
    q: "Is Google Workspace included with the website package?",
    a: "No. Google Workspace setup and subscriptions are offered as a separate service package.",
  },
];

const chatReplies = [
  "You only pay a 50% deposit today. For the website package that is $449.50 of $899.00. The remaining balance is due before launch and is never charged automatically.",
  "The Business Website + AI Chatbot package includes a Devs.ai-powered website chatbot — not a custom AI Agent. Devs.ai subscriptions are quoted separately after deposit.",
  "Google Workspace remains a separate package if you need professional business email.",
];

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceId>("workspace");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "fallback">("idle");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    business: "",
    email: "",
    phone: "",
    domain: "",
    users: "",
    notes: "",
  });
  const [agreementSeed, setAgreementSeed] = useState<AgreementFormSeed | null>(null);
  const [cookiePrefsOpen, setCookiePrefsOpen] = useState(false);
  const [agreementReceipt, setAgreementReceipt] = useState<AgreementReceipt | null>(null);
  const [depositRecord, setDepositRecord] = useState<DepositRecord | null>(null);
  const [depositStatus, setDepositStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [depositError, setDepositError] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi — I can help you compare Google Workspace Setup and Business Website + AI Chatbot Setup, including the 50% deposit and separate Devs.ai quote flow.",
    },
  ]);
  const [chatText, setChatText] = useState("");

  const selected = useMemo(
    () => services.find((service) => service.id === selectedService) ?? services[0],
    [selectedService],
  );
  const pricing = useMemo(() => {
    const { depositCents, remainingCents } = calcDeposit(selected.fullPriceCents);
    return {
      fullServiceFee: formatUsd(selected.fullPriceCents),
      depositDueToday: formatUsd(depositCents),
      remainingBalance: formatUsd(remainingCents),
      depositCents,
    };
  }, [selected]);
  const currentPath = window.location.pathname;
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = useMemo(() => query.get("session_id") || "", [query]);
  const agreementIdParam = useMemo(() => query.get("agreement_id") || "", [query]);
  const isWebsitePackage = selected.id === "website_chatbot";
  const legalSlug = currentPath.startsWith("/legal/")
    ? currentPath.replace("/legal/", "").replace(/\/$/, "")
    : "";

  useEffect(() => {
    if (currentPath !== "/payment-success") return;

    let cancelled = false;
    async function finalizeDeposit() {
      setDepositStatus("loading");
      setDepositError("");
      try {
        if (sessionId) {
          const record = await api.post<DepositRecord>("/api/deposit-requests/fulfill", { sessionId });
          if (!cancelled) {
            setDepositRecord(record);
            setDepositStatus("ready");
          }
        } else if (!cancelled) {
          setDepositStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setDepositStatus("error");
          setDepositError(err instanceof Error ? err.message : "Unable to confirm deposit details.");
        }
      }

      if (agreementIdParam) {
        try {
          let accessToken = "";
          try {
            accessToken =
              sessionStorage.getItem(`aon_agreement_token_${agreementIdParam}`) || "";
          } catch {
            accessToken = "";
          }
          if (!accessToken) {
            // Without the capability token, do not call the endpoint (prevents pointless 401 noise).
            // Staff can still open receipts with a Bearer admin JWT from future admin UI.
          } else {
            const receipt = await api.get<AgreementReceipt>(
              `/api/legal/agreements/${encodeURIComponent(agreementIdParam)}?access_token=${encodeURIComponent(accessToken)}`,
            );
            if (!cancelled) setAgreementReceipt(receipt);
          }
        } catch {
          // optional — payment success still stands without PDF receipt hydrate
        }
      }
    }

    void finalizeDeposit();
    return () => {
      cancelled = true;
    };
  }, [currentPath, sessionId, agreementIdParam]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  function openRequest(service: ServiceId) {
    setSelectedService(service);
    setTermsAccepted(false);
    setCheckoutError("");
    setRequestOpen(true);
  }

  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopyStatus("copied");
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const copied = document.execCommand("copy");
        setCopyStatus(copied ? "copied" : "fallback");
      } catch {
        setCopyStatus("fallback");
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  function copyRequest() {
    const text = [
      "Aon Technology setup request",
      `Service: ${selected.name}`,
      `${selected.regularPriceCents != null ? "Launch Special Price" : "Full Service Fee"}: ${pricing.fullServiceFee}`,
      `Deposit Required Today (50%): ${pricing.depositDueToday}`,
      `Remaining Balance: ${pricing.remainingBalance}`,
      "Payment type: 50% deposit only (remaining balance NOT charged automatically)",
      isWebsitePackage
        ? "Devs.ai subscription: Not included — separate quote after deposit"
        : "Next step: AppDirect quotation, agreement signing, then separate remaining-balance invoice.",
    ].join("\n");
    void copyToClipboard(text);
  }

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function startCheckout() {
    setCheckoutError("");
    if (!form.name.trim() || !form.email.trim()) {
      setCheckoutStatus("error");
      setCheckoutError("Enter your name and email before continuing to the agreement review.");
      return;
    }
    if (isWebsitePackage && !termsAccepted) {
      setCheckoutStatus("error");
      setCheckoutError(
        "Please confirm you understand the deposit covers only the professional setup fee before continuing.",
      );
      return;
    }

    // Required pre-payment legal step — do not send customers straight to Stripe.
    setRequestOpen(false);
    setAgreementSeed({
      serviceId: selected.id,
      name: form.name.trim(),
      business: form.business.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      domain: form.domain.trim(),
      users: form.users,
      notes: form.notes.trim(),
    });
    setCheckoutStatus("idle");
  }

  function sendChat(prompt = chatText) {
    const clean = prompt.trim();
    if (!clean) return;
    const reply = chatReplies[messages.length % chatReplies.length];
    setMessages((current) => [...current, { role: "user", text: clean }, { role: "assistant", text: reply }]);
    setChatText("");
  }

  if (legalSlug) {
    return (
      <>
        <LegalPage slug={legalSlug} />
        <CookieConsent forceOpen={cookiePrefsOpen} onCloseForce={() => setCookiePrefsOpen(false)} />
      </>
    );
  }

  if (agreementSeed) {
    const serviceForAgreement = services.find((s) => s.id === agreementSeed.serviceId) ?? selected;
    return (
      <>
        <AgreementReview
          seed={agreementSeed}
          service={serviceForAgreement}
          onBack={() => {
            setAgreementSeed(null);
            setRequestOpen(true);
          }}
        />
        <CookieConsent forceOpen={cookiePrefsOpen} onCloseForce={() => setCookiePrefsOpen(false)} />
      </>
    );
  }

  if (currentPath === "/payment-success" || currentPath === "/payment-cancel") {
    const success = currentPath === "/payment-success";
    const purchaseLabel = depositRecord?.purchaseId || depositRecord?.referenceNumber;
    const isWorkspaceOrder =
      depositRecord?.serviceId === "workspace" ||
      /google workspace/i.test(depositRecord?.selectedService || "") ||
      depositRecord?.depositPaid === "$29.50";
    // Default to the website package confirmation when no order is loaded yet,
    // since Business Website + AI Chatbot Setup is the primary deposit flow.
    const isWebsiteOrder = !depositRecord || !isWorkspaceOrder;

    return (
      <div className="min-h-screen bg-background px-5 py-16 text-foreground antialiased lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div
            className={cn(
              "mb-6 grid h-16 w-16 place-items-center rounded-full",
              success ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-muted text-muted-foreground",
            )}
          >
            {success ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
          </div>
          <Badge className="mb-4">Stripe Checkout</Badge>
          <h1 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
            {success ? "Deposit received" : "Payment canceled"}
          </h1>
          <p className="mt-5 text-muted-foreground leading-8">
            {success
              ? isWebsiteOrder
                ? "Thank you. Your $449.50 deposit has been received."
                : "Thank you. Your 50% deposit was received successfully and your setup request has been submitted."
              : "Your deposit payment was not completed. You can return to the website and start Stripe Checkout again whenever you are ready."}
          </p>

          {success && (
            <div className="mt-8 w-full space-y-3 text-left">
              {isWebsiteOrder ? (
                <div className="rounded-xl border border-border bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
                  <p>
                    Your total professional setup fee is <strong className="text-foreground">$899.00</strong>, with a
                    remaining setup balance of <strong className="text-foreground">$449.50</strong>.
                  </p>
                  <p className="mt-3">
                    Aon Technology will review your business requirements and send you a separate Devs.ai subscription
                    quote. Devs.ai and other third-party subscription costs are not included in your $899 setup fee.
                  </p>
                  <p className="mt-3">
                    Your remaining setup balance is due before the final website launch, transfer, or handoff.
                  </p>
                </div>
              ) : (
                [
                  "Deposit received successfully.",
                  "Your request has been submitted.",
                  "We will prepare your AppDirect quotation.",
                  "The remaining balance will only be invoiced after quote approval and agreement signing.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm leading-6"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                    <span>{item}</span>
                  </div>
                ))
              )}

              {depositStatus === "loading" && (
                <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Confirming your deposit details…
                </p>
              )}

              {depositStatus === "ready" && depositRecord && (
                <div className="rounded-xl border border-[hsl(var(--gold))]/35 bg-[hsl(var(--gold))]/10 p-4 text-sm leading-7">
                  {purchaseLabel && (
                    <div className="font-semibold text-foreground">Purchase ID: {purchaseLabel}</div>
                  )}
                  {agreementReceipt?.agreementReference && (
                    <div className="font-semibold text-foreground">
                      Agreement Reference: {agreementReceipt.agreementReference}
                    </div>
                  )}
                  <div className="mt-2 text-muted-foreground">Service: {depositRecord.selectedService}</div>
                  <div className="text-muted-foreground">Full Service Fee: {depositRecord.fullServicePrice}</div>
                  <div className="text-muted-foreground">Deposit Paid Today: {depositRecord.depositPaid}</div>
                  <div className="text-muted-foreground">Remaining Balance: {depositRecord.remainingBalance}</div>
                  {isWebsiteOrder && (
                    <>
                      <div className="text-muted-foreground">Devs.ai subscription: Not included</div>
                      <div className="text-muted-foreground">
                        Devs.ai quote status: {depositRecord.devsAiQuoteStatus || "Pending review"}
                      </div>
                    </>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    Remaining balance is never charged automatically. A separate invoice is sent only after approval and
                    agreement milestones.
                  </div>
                </div>
              )}

              {agreementReceipt && !depositRecord && (
                <div className="rounded-xl border border-[hsl(var(--gold))]/35 bg-[hsl(var(--gold))]/10 p-4 text-sm leading-7">
                  <div className="font-semibold text-foreground">
                    Agreement Reference: {agreementReceipt.agreementReference}
                  </div>
                  {agreementReceipt.purchaseId && (
                    <div className="font-semibold text-foreground">Purchase ID: {agreementReceipt.purchaseId}</div>
                  )}
                  <div className="mt-2 text-muted-foreground">Service: {agreementReceipt.serviceName}</div>
                  <div className="text-muted-foreground">Amount paid: {agreementReceipt.depositAmount}</div>
                  <div className="text-muted-foreground">Remaining balance: {agreementReceipt.remainingBalance}</div>
                </div>
              )}

              {success && (
                <p className="text-sm text-muted-foreground">
                  A confirmation email with your agreement details is sent after Stripe payment is verified.
                </p>
              )}

              {depositStatus === "error" && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {depositError ||
                    "We received your payment, but could not load the reference details yet. Our team has been notified through Stripe."}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => window.location.assign("/")}>Return to website</Button>
            {success && agreementReceipt && (
              <Button variant="outline" onClick={() => void downloadAgreementPdf(agreementReceipt)}>
                Download Agreement
              </Button>
            )}
            {success && (
              <Button variant="outline" onClick={() => (window.location.href = "mailto:info@aontechnology.com")}>
                Contact support
              </Button>
            )}
            {!success && (
              <Button variant="outline" onClick={() => window.location.assign("/#services")}>
                Review services
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="border-b border-border bg-primary text-primary-foreground">
        <Marquee pauseOnHover className="py-2 [--duration:36s]">
          {[
            "Pay only a 50% deposit today",
            "Business Website + AI Chatbot Setup — $899 · $449.50 deposit",
            "Devs.ai subscriptions quoted separately",
            "Google Workspace remains a separate package",
          ].map((item) => (
            <span
              key={item}
              className="mx-8 inline-flex items-center gap-2 text-xs font-medium tracking-wide opacity-90"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))]" /> {item}
            </span>
          ))}
        </Marquee>
      </div>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#top" className="flex flex-col leading-none">
            <span className="font-serif text-2xl font-black tracking-tight">
              Aon <span className="text-[hsl(var(--gold))]">Stack</span>
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Setup · Support · Growth
            </span>
          </a>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#services" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Services
            </a>
            <a href="#suite" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Best suite
            </a>
            <a href="#process" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Process
            </a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button className="hidden md:inline-flex" onClick={() => openRequest("website_chatbot")}>
              Request setup
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="mt-10 grid gap-4 text-lg font-semibold">
                  <a href="#services">Services</a>
                  <a href="#suite">Best suite</a>
                  <a href="#process">Process</a>
                  <a href="#faq">FAQ</a>
                  <Button onClick={() => openRequest("website_chatbot")}>Request setup</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-5 py-20 lg:px-8 lg:py-28">
          <GridPattern
            width={58}
            height={58}
            className="absolute inset-0 -z-10 opacity-35 [mask-image:radial-gradient(ellipse_at_center,white,transparent_72%)]"
          />
          <div className="absolute left-1/2 top-16 -z-10 h-80 w-[760px] -translate-x-1/2 rounded-full bg-[hsl(var(--gold))]/10 blur-3xl" />
          <div className="mx-auto max-w-5xl text-center">
            <BlurFade delay={0.05}>
              <Badge
                variant="outline"
                className="mb-6 border-[hsl(var(--gold))]/35 bg-[hsl(var(--gold))]/10 px-4 py-1.5 text-[hsl(var(--gold-foreground))]"
              >
                Small business technology consulting
              </Badge>
            </BlurFade>
            <BlurFade delay={0.12}>
              <h1 className="font-serif text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Business software, <span className="text-[hsl(var(--gold))]">set up for you.</span>
              </h1>
            </BlurFade>
            <BlurFade delay={0.2}>
              <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Choose Google Workspace for professional email, or Business Website + AI Chatbot Setup for a
                mobile-friendly site with a Devs.ai-powered chatbot. Pay only a 50% deposit today. Software
                subscriptions are quoted separately.
              </p>
            </BlurFade>
            <BlurFade delay={0.28}>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" className="h-12 px-6" onClick={() => openRequest("website_chatbot")}>
                  Request website + chatbot <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6" onClick={() => openRequest("workspace")}>
                  Request Google Workspace
                </Button>
              </div>
            </BlurFade>
            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {["50% deposit due today", "Devs.ai quoted separately", "Remaining balance before launch"].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border bg-card/80 p-4 text-sm font-medium text-muted-foreground shadow-sm"
                >
                  <Check className="mx-auto mb-2 h-4 w-4 text-[hsl(var(--gold))]" /> {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-10 lg:px-8">
          <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-4">
            {[
              { n: 2, l: "Focused setup services" },
              { n: 50, l: "Percent deposit today" },
              { n: 899, l: "Website package setup fee" },
              { n: 0, l: "Automatic remaining charges" },
            ].map((stat) => (
              <div
                key={stat.l}
                className="border-b border-border p-6 text-center last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <div className="font-serif text-4xl font-black">
                  <NumberTicker value={stat.n} />
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.l}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <Badge className="mb-4">Services</Badge>
            <h2 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
              Setup packages with a clear 50% deposit workflow.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Pay half the setup/service fee today. The remaining balance is never charged automatically.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {services.map((service, index) => {
              const { depositCents, remainingCents } = calcDeposit(service.fullPriceCents);
              return (
                <BlurFade key={service.id} delay={0.08 * index}>
                  <MagicCard
                    className="h-full rounded-2xl border border-border bg-card p-0 shadow-sm"
                    gradientColor="hsl(var(--gold) / 0.14)"
                  >
                    <Card className="h-full border-0 bg-transparent shadow-none">
                      <CardContent className="flex h-full flex-col p-7">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                          <Badge variant="outline">{service.eyebrow}</Badge>
                          {service.badge && (
                            <Badge className="bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] hover:bg-[hsl(var(--gold))]">
                              {service.badge}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-serif text-3xl font-black leading-tight tracking-tight">{service.name}</h3>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">{service.summary}</p>
                        <div className="mt-6 grid gap-2 rounded-xl border border-dashed border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10 p-4 text-sm">
                          {service.regularPriceCents != null && (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Regular Price</span>
                              <strong className="line-through decoration-2">
                                {formatUsd(service.regularPriceCents)}
                              </strong>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                              {service.regularPriceCents != null ? "Launch Special Price" : "Full Service Fee"}
                            </span>
                            <strong>{formatUsd(service.fullPriceCents)}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Deposit Required Today (50%)</span>
                            <strong className="text-[hsl(var(--gold))]">{formatUsd(depositCents)}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Remaining Balance</span>
                            <strong>{formatUsd(remainingCents)}</strong>
                          </div>
                          {service.id === "website_chatbot" && (
                            <>
                              <div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--gold))]/20 pt-2">
                                <span className="text-muted-foreground">Devs.ai subscription</span>
                                <strong className="text-right text-xs">Not included — separate quote</strong>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Other third-party costs</span>
                                <strong className="text-right text-xs">Billed separately</strong>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="mt-6 grid gap-6 sm:grid-cols-2">
                          <div>
                            <h4 className="mb-3 text-sm font-bold">What is included</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {service.included.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--gold))]" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="mb-3 text-sm font-bold">Not included</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {service.notIncluded.slice(0, 10).map((item) => (
                                <li key={item} className="flex gap-2">
                                  <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                            {service.notIncluded.length > 10 && (
                              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                                Plus: {service.notIncluded.slice(10).join("; ")}.
                              </p>
                            )}
                            {service.id === "website_chatbot" && (
                              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                                Custom AI Agents, advanced automation, additional pages, integrations, and services
                                outside the listed scope require a separate quote.
                              </p>
                            )}
                          </div>
                        </div>

                        {service.clarification && (
                          <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-7 text-muted-foreground">
                            <strong className="text-foreground">Chatbot vs AI Agent. </strong>
                            {service.clarification}
                          </div>
                        )}

                        {service.id === "website_chatbot" && (
                          <div className="mt-6 space-y-4">
                            <div className="rounded-xl border border-border p-4">
                              <h4 className="text-sm font-bold">Software Subscriptions and Third-Party Costs</h4>
                              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                The $899 one-time fee covers Aon Technology’s professional website and chatbot setup
                                services only. It does not include Devs.ai subscriptions, domain registration, hosting,
                                or other third-party software costs. After the 50% deposit is received, Aon Technology
                                will review the client’s requirements and provide a separate Devs.ai subscription quote.
                                The client must review and approve that quote before the Devs.ai chatbot is fully
                                configured. Depending on the project, additional third-party costs may include domain
                                registration or renewal, hosting, Devs.ai subscriptions, Vercel paid services, Supabase
                                paid services, Stripe transaction fees, and other requested software or integrations.
                                Some services may have free plans. The client is responsible for any paid subscription
                                or usage charges required for the project. Google Workspace setup and subscriptions are
                                not included in this package because Google Workspace is offered as a separate service
                                package.
                              </p>
                            </div>
                            <div className="rounded-xl border border-border p-4">
                              <h4 className="text-sm font-bold">Payment Responsibility and Authorization</h4>
                              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                Third-party subscriptions may be paid directly by the client through the third-party
                                provider. When the client requests purchasing or account setup assistance, Aon
                                Technology must receive the client’s authorization before initiating any paid
                                subscription. Payment information must be entered through the third-party provider’s
                                secure checkout or another approved secure payment platform. Aon Technology does not
                                store complete credit card or debit card information.
                              </p>
                            </div>
                            {service.processSteps && (
                              <div className="rounded-xl border border-border p-4">
                                <h4 className="text-sm font-bold">Devs.ai quote process after deposit</h4>
                                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                                  {service.processSteps.map((step) => (
                                    <li key={step}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          className="mt-8 w-full"
                          variant={service.id === "website_chatbot" ? "default" : "outline"}
                          onClick={() => openRequest(service.id)}
                        >
                          Request this service <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </MagicCard>
                </BlurFade>
              );
            })}
          </div>
        </section>

        <section id="suite" className="bg-primary px-5 py-20 text-primary-foreground lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                Best suite guidance
              </Badge>
              <h2 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
                Start with the suite that solves today’s bottleneck.
              </h2>
              <p className="mt-5 leading-8 text-primary-foreground/65">
                For most small businesses, Google Workspace is the affordable foundation: email, calendar, files, and
                collaboration. Business Website + AI Chatbot Setup is the right next step when you need a professional
                site with a Devs.ai-powered chatbot — not a custom AI Agent.
              </p>
            </div>
            <div className="grid gap-4">
              {(
                [
                  [
                    Mail,
                    "Need professional email?",
                    "Start with Google Workspace Setup. Pay a 50% deposit today and receive the subscription quote separately through AppDirect.",
                  ],
                  [
                    Globe,
                    "Need a website + chatbot?",
                    "Choose Business Website + AI Chatbot Setup ($899 · $449.50 deposit). Devs.ai subscriptions are quoted separately after deposit.",
                  ],
                  [
                    ShieldCheck,
                    "Need confidence before full payment?",
                    "Only the deposit is collected now. Remaining balance is invoiced later and never charged automatically.",
                  ],
                ] as const
              ).map(([Icon, title, body]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <Icon className="mb-3 h-5 w-5 text-[hsl(var(--gold))]" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-primary-foreground/60">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="process" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mb-10 text-center">
            <Badge className="mb-4">Process</Badge>
            <h2 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
              Deposit first. Quote next. Balance later.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                title: "Submit Your Request",
                description:
                  "Complete the request form with your business information and the services you are interested in. This helps us understand your business needs before we begin.",
              },
              {
                title: "Pay Your Deposit",
                description:
                  "Secure your project by paying the required 50% deposit securely through Stripe. Once payment is successful, you will receive an order confirmation email containing your Order No. and the next steps.",
              },
              {
                title: "Business Review",
                description:
                  "We carefully review your request, evaluate your business requirements, and determine the most appropriate setup based on your selected package and business goals.",
              },
              {
                title: "Project Planning & Quote",
                description:
                  "We prepare your project plan, confirm your service requirements, and, if applicable, provide separate quotes for third-party subscriptions such as Google Workspace or Devs.ai before implementation begins.",
              },
              {
                title: "Scope Approval",
                description:
                  "Before work begins, you'll review your project scope, deliverables, pricing, estimated timeline, and applicable legal agreements so everything is clearly understood before implementation.",
              },
              {
                title: "Professional Setup",
                description:
                  "We begin configuring and building your selected services, including your website, AI chatbot, business software, integrations, and account setup according to the approved scope of work.",
              },
              {
                title: "Review & Revision",
                description:
                  "Review the completed work and submit your included revision request if needed. Corrections to our work are completed at no additional cost. Requests outside the agreed project scope may require a separate quote before additional work begins.",
              },
              {
                title: "Final Payment & Delivery",
                description:
                  "After final approval, pay the remaining balance. We then complete your project, provide access to the configured services where applicable, and begin your post-launch support period. Any ownership transfer included in your package will be completed according to your service agreement.",
              },
            ].map((step, index) => (
              <Card key={step.title} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
          <Badge className="mb-4">FAQ</Badge>
          <h2 className="font-serif text-4xl font-black tracking-tight">Common questions</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq, index) => (
              <button
                key={faq.q}
                className="w-full rounded-xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-[hsl(var(--gold))]/50"
                onClick={() => setFaqOpen(faqOpen === index ? null : index)}
              >
                <span className="flex items-center justify-between gap-4 font-semibold">
                  {faq.q}
                  <ChevronDown className={cn("h-4 w-4 transition", faqOpen === index && "rotate-180")} />
                </span>
                {faqOpen === index && (
                  <span className="mt-3 block text-sm leading-7 text-muted-foreground">{faq.a}</span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
            <Sparkles className="mx-auto mb-5 h-7 w-7 text-[hsl(var(--gold))]" />
            <h2 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">
              Ready to start with a 50% deposit?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/65">
              Submit your request, pay only the deposit today, then receive any required software quotations before the
              remaining balance is invoiced.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" onClick={() => openRequest("website_chatbot")}>
                Request website + chatbot
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                onClick={() => openRequest("workspace")}
              >
                Request Google Workspace
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 text-sm text-muted-foreground md:flex-row">
          <div>
            <div className="font-serif text-2xl font-black text-foreground">
              Aon <span className="text-[hsl(var(--gold))]">Stack</span>
            </div>
            <p className="mt-2 max-w-md">
              Aon Technology Solutions LLC — business software setup, support, and growth guidance. Customers pay a 50%
              deposit today; remaining balance is invoiced later.
            </p>
            <p className="mt-2">
              <a href="mailto:info@aontechnology.com" className="underline-offset-2 hover:underline">
                info@aontechnology.com
              </a>
            </p>
          </div>
          <div className="grid gap-1">
            <a href="#services">Services</a>
            <a href="#suite">Best suite</a>
            <button className="text-left" onClick={() => setChatOpen(true)}>
              Assistant
            </button>
            <button className="text-left" onClick={() => setCookiePrefsOpen(true)}>
              Cookie preferences
            </button>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {LEGAL_LINKS.map((doc) => (
              <a key={doc.slug} href={`/legal/${doc.slug}`} className="underline-offset-2 hover:underline">
                {doc.title}
              </a>
            ))}
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl text-xs text-muted-foreground">
          Legal documents are drafts for business use. Final wording should be reviewed by a licensed Texas attorney
          before production publication.
        </p>
      </footer>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl">Request setup</DialogTitle>
            <DialogDescription>
              Choose a service and share your needs. You’ll pay only a 50% deposit today through Stripe Checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service.id);
                    setTermsAccepted(false);
                    setCheckoutError("");
                  }}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    selectedService === service.id
                      ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10"
                      : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <div className="font-semibold">{service.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{service.publicPrice}</div>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="business">Business name</Label>
                <Input
                  id="business"
                  value={form.business}
                  onChange={(event) => updateForm("business", event.target.value)}
                  placeholder="Aon Technology client"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="you@business.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain">Domain (optional)</Label>
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(event) => updateForm("domain", event.target.value)}
                  placeholder="example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Number of users</Label>
                <Select value={form.users} onValueChange={(value) => updateForm("users", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 user</SelectItem>
                    <SelectItem value="2-5">2–5 users</SelectItem>
                    <SelectItem value="6-10">6–10 users</SelectItem>
                    <SelectItem value="11+">11+ users</SelectItem>
                    <SelectItem value="unsure">Not sure yet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="notes">Business needs</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Tell us what you need set up, your current tools, and whether you already own a domain."
                />
              </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-border bg-card p-4 text-sm">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Order summary</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Service</span>
                <strong className="text-right">{selected.name}</strong>
              </div>
              {selected.regularPriceCents != null && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Regular Price</span>
                  <strong className="line-through decoration-2">{formatUsd(selected.regularPriceCents)}</strong>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {selected.regularPriceCents != null ? "Launch Special Price" : "Total professional setup fee"}
                </span>
                <strong>{pricing.fullServiceFee}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Deposit Required Today (50%)</span>
                <strong className="text-[hsl(var(--gold))]">{pricing.depositDueToday}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Remaining Balance</span>
                <strong>{pricing.remainingBalance}</strong>
              </div>
              {isWebsitePackage && (
                <>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                    <span className="text-muted-foreground">Devs.ai subscription</span>
                    <strong className="text-right text-xs">Not included — separate quote after deposit</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Other third-party costs</span>
                    <strong className="text-right text-xs">Not included · billed separately</strong>
                  </div>
                </>
              )}
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Remaining balance is collected later with a separate Stripe Invoice or Payment Link — no recurring
                payment and no automatic second charge.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CreditCard className="h-4 w-4" /> Secure live Stripe Checkout
              </div>
              <p className="mt-2 leading-6">
                Accepts major credit cards. Apple Pay and Google Pay appear automatically in Stripe Checkout when
                available. Devs.ai and other third-party subscriptions are quoted and billed separately.
              </p>
            </div>

            {isWebsitePackage && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--gold))]"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span className="text-muted-foreground">
                  I understand that the $449.50 payment is a 50% deposit toward Aon Technology’s $899 professional setup
                  fee. Devs.ai subscriptions, hosting, domain registration, Google Workspace, and other third-party
                  costs are not included and may require separate approval and payment.
                </span>
              </label>
            )}

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {CHECKOUT_LEGAL_LINKS.map((doc) => (
                <a
                  key={doc.slug}
                  href={`/legal/${doc.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {doc.title}
                </a>
              ))}
            </div>

            <Button
              className="h-12 w-full"
              onClick={startCheckout}
              disabled={checkoutStatus === "loading" || (isWebsitePackage && !termsAccepted)}
            >
              {checkoutStatus === "loading"
                ? "Continuing…"
                : isWebsitePackage
                  ? `Continue to Agreement — ${pricing.depositDueToday} deposit`
                  : "Continue to Agreement & Payment"}
              {checkoutStatus !== "loading" && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Next: review order, accept legal terms, sign electronically, then pay securely with Stripe.
            </p>
            {isWebsitePackage && (
              <p className="text-center text-xs text-muted-foreground">
                Devs.ai and other third-party subscriptions are quoted and billed separately.
              </p>
            )}
            {checkoutStatus === "error" && checkoutError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {checkoutError}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" variant="outline" onClick={copyRequest}>
                <Copy className="mr-2 h-4 w-4" /> Copy request
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRequestOpen(false)}>
                Close
              </Button>
            </div>
            {copyStatus === "copied" && (
              <p className="text-sm font-medium text-[hsl(var(--success))]">Request copied to your clipboard.</p>
            )}
            {copyStatus === "fallback" && (
              <p className="text-sm text-muted-foreground">
                Clipboard access is restricted in this preview. The app handled it safely; if copying did not occur,
                select the request details above manually.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-5 right-5 z-50">
        {chatOpen && (
          <Card className="mb-3 w-[min(380px,calc(100vw-2.5rem))] shadow-2xl">
            <CardContent className="p-0">
              <div className="flex items-center justify-between rounded-t-xl bg-primary p-4 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--gold))] font-bold text-[hsl(var(--gold-foreground))]">
                    AS
                  </div>
                  <div>
                    <div className="font-semibold">Aon Stack Assistant</div>
                    <div className="text-xs opacity-60">Rule-based guidance</div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                  onClick={() => setChatOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm leading-6",
                      message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted text-muted-foreground",
                    )}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => sendChat("Do I pay the full fee today?")}>
                    Deposit only?
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => sendChat("Is a custom AI Agent included?")}>
                    AI Agent included?
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Ask a question…"
                  />
                  <Button onClick={() => sendChat()}>Send</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Button size="icon" className="h-14 w-14 rounded-full shadow-xl" onClick={() => setChatOpen((open) => !open)}>
          <Bot className="h-6 w-6" />
        </Button>
      </div>

      <CookieConsent forceOpen={cookiePrefsOpen} onCloseForce={() => setCookiePrefsOpen(false)} />
    </div>
  );
}
