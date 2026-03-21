import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { extractClientEmailFromCookie } from "@/src/lib/clientAuthUtils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = extractClientEmailFromCookie(req);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const {
      companyName,
      website,
      linkedin,
      industry,
      companySize,
      country,
      description,
      studentWorkReason,
      phone,
    } = body;

    if (!companyName?.trim()) {
      return res.status(400).json({ error: "companyName is required" });
    }

    const { error } = await supabaseAdmin
      .from("client_profiles")
      .upsert(
        {
          email,
          company_name: companyName.trim(),
          website: website?.trim() ?? null,
          linkedin: linkedin?.trim() ?? null,
          industry: industry ?? null,
          company_size: companySize ?? null,
          country: country ?? null,
          description: description?.trim() ?? null,
          student_work_reason: studentWorkReason?.trim() ?? null,
          phone: phone?.trim() ?? null,
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("[client/profile/save] upsert error:", error);
      return res.status(500).json({ error: "Failed to save profile" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[client/profile/save]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
