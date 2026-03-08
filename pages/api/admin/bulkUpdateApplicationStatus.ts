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

  const normalizedDecisionStatus = parseBulkDecisionStatus(decisionStatus);
  if (!normalizedDecisionStatus) {
    return res.status(400).json({
      success: false,
      error: "decisionStatus must be accepted or rejected",
    });
  }

  const baseUpdatePayload: Record<string, unknown> = {
    currentStage: 3,
    status: normalizedDecisionStatus,
  };

  const extendedPayload: Record<string, unknown> = {
    ...baseUpdatePayload,
    decisionStatus: normalizedDecisionStatus,
    decisionSource: "admin_override",
    algorithmDecision: normalizedDecisionStatus,
    current_stage: normalizedDecisionStatus,
    stage_status: normalizedDecisionStatus,
    decision_status: normalizedDecisionStatus,
    decision_source: "admin_override",
    resume_decision: normalizedDecisionStatus,
    decisionUpdatedAt: new Date().toISOString(),
  };

  if (payload?.email) {
    extendedPayload.decisionUpdatedBy = payload.email;
  }

  const updateWithPayload = async (payloadToSave: Record<string, unknown>) =>
    supabaseAdmin
      .from("vettingapplications")
      .update(payloadToSave)
      .in("email", normalizedEmails)
      .select("email");

  let { data, error } = await updateWithPayload(extendedPayload);

  const unknownColumnPattern =
    /column .* does not exist|could not find the .* column|schema cache/i;
  if (
    error &&
    Object.keys(extendedPayload).length > Object.keys(baseUpdatePayload).length &&
    unknownColumnPattern.test(error.message || "")
  ) {
    const fallback = await updateWithPayload(baseUpdatePayload);
    data = fallback.data;
    error = fallback.error;
    if (!error) {
      return res.status(200).json({
        success: true,
        data,
        updatedCount: Array.isArray(data) ? data.length : 0,
        warning:
          "Decision source/status columns are missing in DB. Stage and status were updated.",
      });
    }
  }

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(200).json({
    success: true,
    data,
    updatedCount: Array.isArray(data) ? data.length : 0,
  });
}
