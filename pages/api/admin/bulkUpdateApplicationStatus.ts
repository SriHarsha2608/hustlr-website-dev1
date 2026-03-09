import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/src/lib/jwt";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "admin@hustlr.local"
).toLowerCase();

type BulkDecisionStatus = "accepted" | "rejected";

function parseBulkDecisionStatus(value: unknown): BulkDecisionStatus | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected") return "rejected";
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.split(" ")[1];
  let payload: any;
  try {
    payload = verifyToken(token);
    const tokenEmail = String(payload?.email || "").toLowerCase();
    if (
      typeof payload === "string" ||
      payload.role !== "admin" ||
      tokenEmail !== ADMIN_EMAIL
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden: Admin access required" });
    }
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired token" });
  }

  const { emails, decisionStatus } = req.body || {};

  if (!Array.isArray(emails) || emails.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "emails must be a non-empty array" });
  }

  const normalizedEmails = Array.from(
    new Set(
      emails
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

  if (normalizedEmails.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "No valid applicant emails provided" });
  }

  const { data: existingApps, error: fetchErr } = await supabaseAdmin
    .from("vettingapplications")
    .select("email, currentStage, status")
    .in("email", normalizedEmails);

  if (fetchErr) {
    return res.status(500).json({ success: false, error: fetchErr.message });
  }

  const normalizedDecisionStatus = parseBulkDecisionStatus(decisionStatus);
  if (!normalizedDecisionStatus) {
    return res.status(400).json({
      success: false,
      error: "decisionStatus must be accepted or rejected",
    });
  }

  const updatePromises = (existingApps || []).map((app) => {
    const isReject = normalizedDecisionStatus === "rejected";
    const oldStage = app.currentStage || 1;
    const isCurrentlyRejected = app.status === "rejected";

    // Approving someone in stage 1 or someone who was rejected -> moves them to stage 2 (round_2_eligible).
    // Approving someone in stage >= 2 (and not rejected) -> moves them to stage 3 (final accepted).
    const newStatus = isReject
      ? "rejected"
      : (oldStage < 2 || isCurrentlyRejected)
        ? "round_2_eligible"
        : "accepted";
    const newStage = isReject ? 3 : (oldStage < 2 || isCurrentlyRejected) ? 2 : 3;

    const baseUpdatePayload: Record<string, unknown> = {
      currentStage: newStage,
      status: newStatus,
    };

    const extendedPayload: Record<string, unknown> = {
      ...baseUpdatePayload,
      decisionStatus: normalizedDecisionStatus,
      decisionSource: "admin_override",
      algorithmDecision: normalizedDecisionStatus,
      current_stage: isReject ? "resume_screening" : "test_project",
      stage_status: normalizedDecisionStatus === "accepted" ? "accepted" : "rejected",
      decision_status: normalizedDecisionStatus,
      decision_source: "admin_override",
      resume_decision: normalizedDecisionStatus,
      decisionUpdatedAt: new Date().toISOString(),
    };

    if (payload?.email) {
      extendedPayload.decisionUpdatedBy = payload.email;
    }

    return supabaseAdmin
      .from("vettingapplications")
      .update(extendedPayload)
      .eq("email", app.email)
      .then((res) => {
        // Fallback to base payload if extended columns are missing
        const unknownColumnPattern = /column .* does not exist|could not find the .* column|schema cache/i;
        if (res.error && unknownColumnPattern.test(res.error.message || "")) {
          return supabaseAdmin.from("vettingapplications").update(baseUpdatePayload).eq("email", app.email);
        }
        return res;
      });
  });

  const results = await Promise.all(updatePromises);
  const failedCount = results.filter((r) => r.error).length;

  if (failedCount > 0) {
    return res.status(500).json({
      success: false,
      error: `Failed to update ${failedCount} applicants`
    });
  }

  return res.status(200).json({
    success: true,
    data: existingApps,
    updatedCount: existingApps.length - failedCount,
  });
}
