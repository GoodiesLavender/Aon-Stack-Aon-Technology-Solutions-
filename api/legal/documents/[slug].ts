import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureLegalDocumentsSeeded, getDocumentBySlug } from "../../_lib/legal.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const slug = String(req.query.slug || "");
    await ensureLegalDocumentsSeeded();
    const doc = getDocumentBySlug(slug);
    if (!doc) return res.status(404).json({ error: "Document not found." });
    return res.status(200).json(doc);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}
