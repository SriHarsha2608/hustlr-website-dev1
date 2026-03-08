import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/src/lib/jwt";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "admin@hustlr.local"
).toLowerCase();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  const { data, error } = await supabaseAdmin
    .from("vettingapplications")
    .select("*")
    .order("name");

  if (error) return res.status(500).json({ success: false, error });

  return res.status(200).json({ success: true, data });
}
