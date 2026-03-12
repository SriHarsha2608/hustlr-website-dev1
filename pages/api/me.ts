import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/src/lib/jwt";


export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = req.cookies;
  const token = cookies.session;

  if (process.env.NODE_ENV === "development") {
    if (!token) return res.status(401).json({ error: "No session" });

    try {
      const payload = verifyToken(token);
      res.status(200).json({ user: payload });
      console.log("/api/me, jwt payload:", payload);
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  }
  return res.status(403).json({ ok: false, message: "FORBIDDEN" });
}
