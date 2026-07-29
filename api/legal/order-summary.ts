import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildOrderSummary } from "../_lib/legal.js";
import { resolveService } from "../_lib/services.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const serviceId =
      typeof req.query.serviceId === "string"
        ? req.query.serviceId
        : typeof req.body?.serviceId === "string"
          ? req.body.serviceId
          : "";
    const service = resolveService(serviceId);
    if (!service) return res.status(400).json({ error: "Invalid service." });

    const form = {
      name: String(req.body?.name || ""),
      business: String(req.body?.business || ""),
      email: String(req.body?.email || ""),
      phone: String(req.body?.phone || ""),
      domain: String(req.body?.domain || ""),
      title: String(req.body?.title || ""),
      users: String(req.body?.users || ""),
      notes: String(req.body?.notes || ""),
    };

    return res.status(200).json(buildOrderSummary(service, form));
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
}
