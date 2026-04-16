import type { NextApiRequest, NextApiResponse } from "next";
import { createAdminToken } from "@/src/lib/jwt";
import { firebaseAdminAuth } from "@/src/lib/firebase-admin";
import { serialize } from "cookie";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

function setAdminSessionCookie(res: NextApiResponse, email: string) {
  const token = createAdminToken(email);
  res.setHeader(
    "Set-Cookie",
    serialize("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    })
  );
}

function respondWithMisconfiguredAdminLogin(
  res: NextApiResponse,
  reason: string
) {
  console.error(`[admin/login] ${reason}`);
  return res
    .status(500)
    .json({ error: "Admin login is not configured on the server." });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const inputEmail =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const inputPassword =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (inputEmail || inputPassword) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return respondWithMisconfiguredAdminLogin(
        res,
        "email/password login attempted without ADMIN_EMAIL and ADMIN_PASSWORD configured"
      );
    }

    if (inputEmail === ADMIN_EMAIL && inputPassword === ADMIN_PASSWORD) {
      setAdminSessionCookie(res, ADMIN_EMAIL);
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const idToken = req.headers.authorization?.split(" ")[1];
  if (!idToken)
    return res.status(401).json({ error: "No Firebase ID token provided" });

  if (!ADMIN_EMAIL) {
    return respondWithMisconfiguredAdminLogin(
      res,
      "Firebase login attempted without ADMIN_EMAIL configured"
    );
  }

  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    const firebaseEmail = (decoded.email || "").toLowerCase();
    if (firebaseEmail !== ADMIN_EMAIL) {
      return res
        .status(403)
        .json({ error: "Only the configured admin account can log in." });
    }

    setAdminSessionCookie(res, ADMIN_EMAIL);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid Firebase token" });
  }
}
