import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { extractClientEmailFromCookie } from "@/src/lib/clientAuthUtils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = extractClientEmailFromCookie(req);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("client_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("[client/profile/get] db error:", error);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }

    if (!data) {
      return res.status(404).json({ profile: null });
    }

    return res.status(200).json({
      profile: {
        companyName: data.company_name,
        website: data.website ?? "",
        linkedin: data.linkedin ?? "",
        industry: data.industry ?? "",
        companySize: data.company_size ?? "",
        country: data.country ?? "",
        description: data.description ?? "",
        studentWorkReason: data.student_work_reason ?? "",
        phone: data.phone ?? "",
      },
    });
  } catch (err) {
    console.error("[client/profile/get]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
