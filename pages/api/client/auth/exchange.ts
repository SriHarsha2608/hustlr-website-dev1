import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { createClientToken } from "@/src/lib/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ error: "access_token is required" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(access_token);
    if (error || !data?.user?.email) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Enforce email confirmation server-side regardless of Supabase dashboard setting
    if (!data.user.email_confirmed_at) {
      console.warn("[client/auth/exchange] unconfirmed email attempted exchange:", data.user.email);
      return res.status(403).json({ error: "Email not confirmed" });
    }

    const token = createClientToken(data.user.email);

    res.setHeader(
      "Set-Cookie",
      serialize("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
        sameSite: "lax",
      })
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[client/auth/exchange]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
