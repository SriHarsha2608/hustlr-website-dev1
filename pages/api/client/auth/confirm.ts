import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { type EmailOtpType } from "@supabase/supabase-js";
import createSupabaseApiClient from "@/src/lib/supabase/auth/api";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { createClientToken } from "@/src/lib/jwt";

function firstString(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

function sanitizeNext(next: string | undefined): string {
  if (!next) return "/get-started/client/dashboard";
  if (next.startsWith("//") || next.includes(":") || !next.startsWith("/")) {
    return "/get-started/client/dashboard";
  }
  return next;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).appendHeader("Allow", "GET").end();
  }

  const token_hash = firstString(req.query.token_hash);
  const type = firstString(req.query.type);
  const next = sanitizeNext(firstString(req.query.next));

  if (!token_hash || !type) {
    return res.redirect("/error?message=Missing_confirmation_parameters");
  }

  const supabase = createSupabaseApiClient(req, res);

  const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash,
  });

  if (otpError) {
    console.error("[client/auth/confirm] verifyOtp error:", otpError);
    return res.redirect("/error?message=Confirmation_link_expired");
  }

  const access_token = otpData?.session?.access_token;
  if (!access_token) {
    console.error("[client/auth/confirm] no access_token after verifyOtp");
    return res.redirect("/error");
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(access_token);
  if (userError || !userData?.user?.email) {
    console.error("[client/auth/confirm] getUser error:", userError);
    return res.redirect("/error");
  }

  const token = createClientToken(userData.user.email);

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

  return res.redirect(next);
}
