import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureLegalDocumentsSeeded, getDocumentBySlug } from "../_lib/legal.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    const docs = await ensureLegalDocumentsSeeded();

    if (slug) {
      const doc = getDocumentBySlug(slug) || docs.find((d) => d.slug === slug);
      if (!doc) return res.status(404).json({ error: "Document not found." });
      return res.status(200).json(doc);
    }

    return res.status(200).json(
      docs.map((d) => ({
        document_type: d.document_type,
        slug: d.slug,
        title: d.title,
        version: d.version,
        effective_at: d.effective_at,
        content_hash: d.content_hash,
      })),
    );
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}
