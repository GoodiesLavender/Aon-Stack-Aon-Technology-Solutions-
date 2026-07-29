import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID, createHash } from "node:crypto";
import { supabaseAdmin } from "../_lib/supabase-admin.js";
import { clientIp } from "../_lib/legal.js";

const CONSENT_VERSION = "1.0";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const essential = true;
    const functional = req.body?.functional === true;
    const analytics = req.body?.analytics === true;
    const marketing = req.body?.marketing === true;
    const consentId =
      typeof req.body?.consentId === "string" && req.body.consentId.trim()
        ? req.body.consentId.trim()
        : randomUUID();

    const ip = clientIp(req);
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : "";

    try {
      await supabaseAdmin.from("cookie_consents").upsert(
        {
          consent_id: consentId,
          essential,
          functional,
          analytics,
          marketing,
          consent_version: CONSENT_VERSION,
          ip_hash: ipHash,
          user_agent: String(req.headers["user-agent"] || "").slice(0, 500),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "consent_id" },
      );
    } catch {
      // Table may not exist yet — still return local consent payload.
    }

    return res.status(200).json({
      consentId,
      essential,
      functional,
      analytics,
      marketing,
      consentVersion: CONSENT_VERSION,
      consentDate: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}
