import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadTextFile, LEGAL_LINKS, type LegalDoc } from "@/lib/legal";

export function LegalPage({ slug }: { slug: string }) {
  const meta = useMemo(() => LEGAL_LINKS.find((d) => d.slug === slug), [slug]);
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/legal/documents/${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load document");
        if (!cancelled) setDoc(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load document");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function printDoc() {
    window.print();
  }

  function downloadDoc() {
    if (!doc) return;
    downloadTextFile(`${doc.slug || slug}-v${doc.version}.txt`, doc.content_text, "text/plain;charset=utf-8");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-4">
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to website
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={printDoc}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={downloadDoc} disabled={!doc}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge variant="outline">Legal Pack</Badge>
          <Badge>Draft — attorney review recommended</Badge>
        </div>

        {loading && <p className="text-muted-foreground">Loading document…</p>}
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
        )}

        {doc && (
          <div
            className="legal-content prose prose-neutral max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: doc.content_html }}
          />
        )}

        {!loading && !doc && !error && meta && (
          <div>
            <h1 className="font-serif text-4xl font-black">{meta.title}</h1>
            <p className="mt-4 text-muted-foreground">Document unavailable.</p>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-semibold">All legal documents</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {LEGAL_LINKS.map((item) => (
              <a
                key={item.slug}
                href={`/legal/${item.slug}`}
                className="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-[hsl(var(--gold))]/50"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
