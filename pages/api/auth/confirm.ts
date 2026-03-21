import createClient from "@/src/lib/supabase/auth/api";
import { type EmailOtpType } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { createToken, createClientToken } from "@/src/lib/jwt";
import { serialize } from "cookie";

function stringOrFirstString(item: string | string[] | undefined) {
  return Array.isArray(item) ? item[0] : item;
}

function sanitizeRedirectPath(path: string | undefined, fallback: string): string {
  if (!path) return fallback;
  // Block absolute URLs, protocol-relative URLs, and data: URLs
  if (path.startsWith("//") || path.includes(":") || !path.startsWith("/")) {
    return fallback;
  }
  return path;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).appendHeader("Allow", "GET").end();
    return;
  }

  const queryParams = req.query;
  const token_hash = stringOrFirstString(queryParams.token_hash);
  const type = stringOrFirstString(queryParams.type);
  let next = sanitizeRedirectPath(stringOrFirstString(queryParams.next), "/error");

  if (token_hash && type) {
    const supabase = createClient(req, res);

    const supres = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });

    if (supres.error) {
      console.error("Email verification error:", supres.error);
      return res.redirect("/error?message=It_seems_the_link_has_expired!");
    }

    const access_token = supres.data?.session?.access_token;
    if (!access_token) {
      console.error("No access token returned after verifyOtp");
      return res.redirect("/error");
    }

    const { data, error } = await supabaseAdmin.auth.getUser(access_token);
    if (error || !data?.user) {
      console.error("Failed to fetch user after verification:", error);
      return res.redirect("/error");
    }

    // Detect role from Supabase user metadata — clients pass { data: { role: "client" } }
    // in signUp options. The same email template is used for all users so we must
    // determine the right token type and redirect here rather than in a separate endpoint.
    const userRole = data.user.user_metadata?.role as string | undefined;

    if (userRole === "client") {
      const clientToken = createClientToken(data.user.email!);
      res.setHeader(
        "Set-Cookie",
        serialize("session", clientToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
          sameSite: "lax",
        })
      );
      return res.redirect("/get-started/client/onboarding");
    }

    const token = createToken(data.user.email!);

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

    next = sanitizeRedirectPath(stringOrFirstString(queryParams.next), "/");
  }

  return res.redirect(next);
}
