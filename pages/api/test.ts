import type { NextApiRequest, NextApiResponse } from "next";
import { createToken } from "@/src/lib/jwt";
import { serialize } from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.NODE_ENV === "development") {
    const token = createToken("max910payne@gmail.com");
    res.setHeader(
      "Set-Cookie",
      serialize("session", token, {
        httpOnly: true,
        secure: false,
        path: "/",
        expires: new Date(Date.now() + 100000000),
        sameSite: "lax",
      })
    );
    console.log("JWT: ", token);
    return res.status(200).json({ valid: true });
  }
  return res.status(403).json({ ok: false, message: "FORBIDDEN" });
}
