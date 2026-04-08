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
      id,
      title,
      category,
      description,
      timelineEstimate,
      deliverables,
      budget,
      skills,
      status,
    } = body;

    if (!title?.trim() || !category?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "title, category, and description are required" });
    }

    const resolvedStatus =
      status === "published" || status === "closed" ? status : "draft";

    const requestedId = typeof id === "string" && id.trim().length > 0 ? id.trim() : null;

    if (requestedId) {
      const { data: existingById, error: fetchByIdError } = await supabaseAdmin
        .from("job_posts")
        .select("id")
        .eq("id", requestedId)
        .eq("client_email", email)
        .maybeSingle();

      if (fetchByIdError) {
        console.error("[client/job-post/save] fetch-by-id error:", fetchByIdError);
        return res.status(500).json({ error: "Failed to save job post" });
      }

      if (!existingById?.id) {
        return res.status(404).json({ error: "Job post not found" });
      }

      const { error: updateByIdError } = await supabaseAdmin
        .from("job_posts")
        .update({
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          timeline_estimate: timelineEstimate?.trim() ?? null,
          deliverables: deliverables?.trim() ?? null,
          budget: typeof budget === "number" ? budget : null,
          skills: Array.isArray(skills) ? skills : [],
          status: resolvedStatus,
        })
        .eq("id", requestedId)
        .eq("client_email", email);

      if (updateByIdError) {
        console.error("[client/job-post/save] update-by-id error:", updateByIdError);
        return res.status(500).json({ error: "Failed to save job post" });
      }

      return res.status(200).json({ ok: true, id: requestedId });
    }

    // Check for an existing draft by this client so we update rather than create duplicates
    const { data: existing } = await supabaseAdmin
      .from("job_posts")
      .select("id")
      .eq("client_email", email)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let dbError;

    if (existing?.id && resolvedStatus === "draft") {
      // Update existing draft
      const { error } = await supabaseAdmin
        .from("job_posts")
        .update({
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          timeline_estimate: timelineEstimate?.trim() ?? null,
          deliverables: deliverables?.trim() ?? null,
          budget: typeof budget === "number" ? budget : null,
          skills: Array.isArray(skills) ? skills : [],
          status: resolvedStatus,
        })
        .eq("id", existing.id);
      dbError = error;
    } else if (existing?.id && resolvedStatus === "published") {
      // Publish the existing draft
      const { error } = await supabaseAdmin
        .from("job_posts")
        .update({
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          timeline_estimate: timelineEstimate?.trim() ?? null,
          deliverables: deliverables?.trim() ?? null,
          budget: typeof budget === "number" ? budget : null,
          skills: Array.isArray(skills) ? skills : [],
          status: "published",
        })
        .eq("id", existing.id);
      dbError = error;
    } else {
      // Insert new post
      const { error } = await supabaseAdmin
        .from("job_posts")
        .insert({
          client_email: email,
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          timeline_estimate: timelineEstimate?.trim() ?? null,
          deliverables: deliverables?.trim() ?? null,
          budget: typeof budget === "number" ? budget : null,
          skills: Array.isArray(skills) ? skills : [],
          status: resolvedStatus,
        });
      dbError = error;
    }

    if (dbError) {
      console.error("[client/job-post/save] db error:", dbError);
      return res.status(500).json({ error: "Failed to save job post" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[client/job-post/save]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
