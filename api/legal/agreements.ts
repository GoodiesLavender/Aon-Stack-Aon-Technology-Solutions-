import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp, createCustomerAgreement } from "../_lib/legal.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};
    const agreement = await createCustomerAgreement(
      {
        serviceId: body.serviceId,
        customerName: body.customerName,
        businessName: body.businessName,
        customerTitle: body.customerTitle,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        customerDomain: body.customerDomain,
        numberOfUsers: body.numberOfUsers,
        businessNeeds: body.businessNeeds,
        electronicSignature: body.electronicSignature,
        signatureDate: body.signatureDate,
        signatureNameConfirmed: body.signatureNameConfirmed === true,
        checkboxOrderReview: body.checkboxOrderReview === true,
        checkboxThirdParty: body.checkboxThirdParty === true,
        checkboxLegalPolicies: body.checkboxLegalPolicies === true,
        checkboxEsign: body.checkboxEsign === true,
        marketingOptIn: body.marketingOptIn === true,
      },
      {
        ip: clientIp(req),
        userAgent: String(req.headers["user-agent"] || ""),
      },
    );

    return res.status(201).json(agreement);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Unable to create agreement" });
  }
}
