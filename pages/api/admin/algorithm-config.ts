import type { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/src/lib/jwt";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import {
  DEFAULT_RESUME_SCREENING_CONFIG,
  ResumeScreeningConfig,
  ScreeningFactor,
  normalizeResumeScreeningConfig,
} from "@/src/lib/algorithmConfig";

let inMemoryConfig: ResumeScreeningConfig | null = null;
const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "admin@hustlr.local"
).toLowerCase();

function isMissingTableError(message?: string): boolean {
  if (!message) return false;
  return /relation .* does not exist|schema cache/i.test(message);
}

function validateAndNormalizeFactors(input: unknown): ScreeningFactor[] | null {
  if (!Array.isArray(input)) return null;
  const factors = input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const factor = item as Partial<ScreeningFactor>;
      if (
        typeof factor.key !== "string" ||
        typeof factor.label !== "string" ||
        typeof factor.weight !== "number" ||
        typeof factor.description !== "string"
      ) {
        return null;
      }
      return {
        key: factor.key.trim(),
        label: factor.label.trim(),
        description: factor.description.trim(),
        weight: Number(factor.weight),
      };
    })
    .filter(Boolean) as ScreeningFactor[];

  return factors.length > 0 ? factors : null;
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

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("admin_algorithm_config")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      if (isMissingTableError(error.message)) {
        return res.status(200).json({
          success: true,
          source: "memory",
          warning:
            "DB table admin_algorithm_config is missing. Using in-memory config.",
          config: inMemoryConfig || DEFAULT_RESUME_SCREENING_CONFIG,
        });
      }
      return res.status(500).json({ success: false, error: error.message });
    }

    const config = normalizeResumeScreeningConfig({
      threshold: data.threshold,
      factors: data.factors,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    });

    return res.status(200).json({ success: true, source: "database", config });
  }

  if (req.method === "POST") {
    const threshold =
      typeof req.body?.threshold === "number" ? req.body.threshold : NaN;
    const factors = validateAndNormalizeFactors(req.body?.factors);
    if (!Number.isFinite(threshold) || !factors) {
      return res.status(400).json({
        success: false,
        error: "threshold and factors are required",
      });
    }

    const nextConfig: ResumeScreeningConfig = {
      threshold: Math.max(0, Math.min(100, Math.round(threshold))),
      factors,
      updatedAt: new Date().toISOString(),
      updatedBy: payload.email,
    };

    const { error } = await supabaseAdmin.from("admin_algorithm_config").upsert(
      {
        id: 1,
        threshold: nextConfig.threshold,
        factors: nextConfig.factors,
        updated_at: nextConfig.updatedAt,
        updated_by: nextConfig.updatedBy,
      },
      { onConflict: "id" }
    );

    if (error) {
      if (isMissingTableError(error.message)) {
        inMemoryConfig = nextConfig;
        return res.status(200).json({
          success: true,
          source: "memory",
          warning:
            "DB table admin_algorithm_config is missing. Config saved in memory for this server session.",
          config: nextConfig,
        });
      }
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      source: "database",
      config: nextConfig,
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
