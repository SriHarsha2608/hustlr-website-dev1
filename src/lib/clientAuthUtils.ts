import type { NextApiRequest } from "next";
import type { GetServerSidePropsContext } from "next";
import { verifyToken } from "@/src/lib/jwt";
import type { JwtPayload } from "jsonwebtoken";

/**
 * Extract and verify a client session from the httpOnly `session` cookie.
 * Returns the client email if the token is valid and has role "client",
 * otherwise returns null.
 */
export function extractClientEmailFromCookie(req: NextApiRequest): string | null {
  const token = req.cookies.session;
  if (!token) return null;

  try {
    const payload = verifyToken(token) as JwtPayload;
    if (typeof payload === "string" || !payload.email || payload.role !== "client") {
      return null;
    }
    return payload.email as string;
  } catch {
    return null;
  }
}

/**
 * For use in getServerSideProps — same logic but reads from IncomingMessage cookies.
 * Returns the email string or null.
 */
export function getClientEmailFromSSP(
  context: GetServerSidePropsContext
): string | null {
  const token = context.req.cookies.session;
  if (!token) return null;

  try {
    const payload = verifyToken(token) as JwtPayload;
    if (typeof payload === "string" || !payload.email || payload.role !== "client") {
      return null;
    }
    return payload.email as string;
  } catch {
    return null;
  }
}
