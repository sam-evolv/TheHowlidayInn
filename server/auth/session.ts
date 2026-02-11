import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const COOKIE = "howliday_admin";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setSessionCookie(res: Response, payload: object, req?: Request) {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  const token = jwt.sign(payload, secret, { expiresIn: MAX_AGE });
  
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',  // Required for cross-origin (Netlify frontend -> Replit backend)
    path: '/',
    // Do not set domain - browser will use current host
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, {
    path: "/",
    // Do not set domain - must match the domain used when setting (none)
  });
}

export function requireOwnerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error('SESSION_SECRET environment variable is required');
    }
    const data = jwt.verify(token, secret);
    // attach identity
    (req as any).auth = data;
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}

export function getAuth(req: Request) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
    if (!secret) return null;
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}
