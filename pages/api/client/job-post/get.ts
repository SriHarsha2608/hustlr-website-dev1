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
    const requestedId =
      typeof req.query.id === "string" && req.query.id.trim().length > 0
        ? req.query.id.trim()
        : null;

    let query = supabaseAdmin
      .from("job_posts")
      .select("*")
      .eq("client_email", email)
      .in("status", ["draft", "published", "closed"]);

    if (requestedId) {
      query = query.eq("id", requestedId);
    } else {
      query = query.order("updated_at", { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("[client/job-post/get] db error:", error);
      return res.status(500).json({ error: "Failed to fetch job post" });
    }

    if (!data) {
      return res.status(200).json({ draft: null });
    }

    return res.status(200).json({
      draft: {
        id: data.id,
        title: data.title,
        category: data.category,
        description: data.description,
        timelineEstimate: data.timeline_estimate ?? "",
        deliverables: data.deliverables ?? "",
        budget: typeof data.budget === "number" ? data.budget : 0,
        skills: Array.isArray(data.skills) ? data.skills : [],
        status: data.status,
      },
    });
  } catch (err) {
    console.error("[client/job-post/get]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
