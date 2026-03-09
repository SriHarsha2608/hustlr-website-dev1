import type { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/src/lib/jwt";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import {
  DEFAULT_SCORING_CONFIG,
  ScoringFactor,
} from "@/src/lib/algorithmConfig";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "admin@hustlr.local"
).toLowerCase();

/** Map of category key → label + description from defaults */
const FACTOR_META: Record<string, { label: string; description: string }> = {};
for (const f of DEFAULT_SCORING_CONFIG.factors) {
  FACTOR_META[f.key] = { label: f.label, description: f.description };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Missing or invalid authorization header",
    });
  }

  let payload: any;
  try {
    payload = verifyToken(authHeader.split(" ")[1]);
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
  } catch {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired token" });
  }

  // ─── GET: read from scoring_config table ───
  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("scoring_config")
      .select("category, weight, enabled")
      .order("weight", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Extract threshold row if present, otherwise use default
    let threshold = DEFAULT_SCORING_CONFIG.threshold;
    const factorRows = (data || []).filter((row) => {
      if (row.category === "__threshold__") {
        threshold = Number(row.weight);
        return false;
      }
      return true;
    });

    const factors: ScoringFactor[] = factorRows.map((row) => ({
      key: row.category,
      label: FACTOR_META[row.category]?.label || row.category,
      weight: Number(row.weight),
      enabled: row.enabled,
      description:
        FACTOR_META[row.category]?.description || "",
    }));

    const totalWeight = factors
      .filter((f) => f.enabled)
      .reduce((sum, f) => sum + f.weight, 0);

    return res.status(200).json({
      success: true,
      source: "database",
      config: {
        threshold,
        factors,
        totalWeight,
      },
    });
  }

  // ─── POST: write weights to scoring_config table ───
  if (req.method === "POST") {
    const { factors, threshold } = req.body;

    if (!Array.isArray(factors) || factors.length === 0) {
      return res.status(400).json({
        success: false,
        error: "factors array is required",
      });
    }

    // Validate threshold if provided
    if (threshold !== undefined) {
      const t = Number(threshold);
      if (!Number.isFinite(t) || t < 0 || t > 100) {
        return res.status(400).json({
          success: false,
          error: "Threshold must be between 0 and 100",
        });
      }
    }

    // Validate factors
    for (const f of factors) {
      if (!f.key || !FACTOR_META[f.key]) {
        return res.status(400).json({
          success: false,
          error: `Invalid category: ${f.key}`,
        });
      }
      const weight = Number(f.weight);
      if (!Number.isFinite(weight) || weight < 0 || weight > 200) {
        return res.status(400).json({
          success: false,
          error: `Weight for ${f.key} must be between 0 and 200`,
        });
      }
    }

    // Update each row in scoring_config
    const errors: string[] = [];
    for (const f of factors) {
      const { error } = await supabaseAdmin
        .from("scoring_config")
        .update({
          weight: Math.round(Number(f.weight)),
          enabled: f.weight > 0,
          updated_at: new Date().toISOString(),
        })
        .eq("category", f.key);

      if (error) errors.push(`${f.key}: ${error.message}`);
    }

    // Save threshold as a special row
    if (threshold !== undefined) {
      const thresholdValue = Math.round(Number(threshold));
      const { error: upsertErr } = await supabaseAdmin
        .from("scoring_config")
        .upsert(
          {
            category: "__threshold__",
            weight: thresholdValue,
            enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "category" }
        );
      if (upsertErr) errors.push(`threshold: ${upsertErr.message}`);
    }

    if (errors.length > 0) {
      return res
        .status(500)
        .json({ success: false, error: errors.join("; ") });
    }

    // Return updated config
    const { data, error: fetchError } = await supabaseAdmin
      .from("scoring_config")
      .select("category, weight, enabled")
      .order("weight", { ascending: false });

    if (fetchError) {
      return res
        .status(500)
        .json({ success: false, error: fetchError.message });
    }

    // Extract threshold from response
    let savedThreshold = DEFAULT_SCORING_CONFIG.threshold;
    const factorRows = (data || []).filter((row) => {
      if (row.category === "__threshold__") {
        savedThreshold = Number(row.weight);
        return false;
      }
      return true;
    });

    const updatedFactors: ScoringFactor[] = factorRows.map((row) => ({
      key: row.category,
      label: FACTOR_META[row.category]?.label || row.category,
      weight: Number(row.weight),
      enabled: row.enabled,
      description: FACTOR_META[row.category]?.description || "",
    }));

    const totalWeight = updatedFactors
      .filter((f) => f.enabled)
      .reduce((sum, f) => sum + f.weight, 0);

    return res.status(200).json({
      success: true,
      source: "database",
      config: {
        threshold: savedThreshold,
        factors: updatedFactors,
        totalWeight,
      },
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
