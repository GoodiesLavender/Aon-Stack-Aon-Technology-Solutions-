import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  loadCookieConsent,
  persistCookieConsent,
  type CookieConsentState,
} from "@/lib/legal";

type Props = {
  forceOpen?: boolean;
  onCloseForce?: () => void;
};

export function CookieConsent({ forceOpen = false, onCloseForce }: Props) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [show, setShow] = useState(false);
  const [manage, setManage] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const existing = loadCookieConsent();
    setConsent(existing);
    if (existing) {
      setFunctional(existing.functional);
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    setShow(forceOpen || !existing);
  }, [forceOpen]);

  async function save(next: { functional: boolean; analytics: boolean; marketing: boolean }) {
    setSaving(true);
    try {
      const state = await persistCookieConsent({
        ...next,
        consentId: consent?.consentId,
      });
      setConsent(state);
      setShow(false);
      setManage(false);
      onCloseForce?.();
    } catch {
      // Still store locally if API fails
      const local: CookieConsentState = {
        consentId: consent?.consentId || crypto.randomUUID(),
        essential: true,
        functional: next.functional,
        analytics: next.analytics,
        marketing: next.marketing,
        consentVersion: "1.0",
        consentDate: new Date().toISOString(),
      };
      localStorage.setItem("aon_cookie_consent_v1", JSON.stringify(local));
      setConsent(local);
      setShow(false);
      setManage(false);
      onCloseForce?.();
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="text-sm font-semibold">Cookie preferences</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We use essential cookies to run the site. Optional analytics or marketing cookies are off unless you
          choose them. Read our{" "}
          <a className="underline underline-offset-2" href="/legal/cookie-policy">
            Cookie Policy
          </a>
          .
        </p>

        {manage && (
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <strong>Essential</strong> — required for security and core features (always on)
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={functional}
                onChange={(e) => setFunctional(e.target.checked)}
              />
              <span>
                <strong>Functional</strong> — remember preferences
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <strong>Analytics</strong> — help us understand usage
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                <strong>Marketing</strong> — advertising cookies (if used)
              </span>
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            disabled={saving}
            onClick={() => save({ functional: true, analytics: true, marketing: true })}
          >
            Accept All
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => save({ functional: false, analytics: false, marketing: false })}
          >
            Reject Non-Essential
          </Button>
          {!manage ? (
            <Button variant="ghost" disabled={saving} onClick={() => setManage(true)}>
              Manage Preferences
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => save({ functional, analytics, marketing })}
            >
              Save Preferences
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
