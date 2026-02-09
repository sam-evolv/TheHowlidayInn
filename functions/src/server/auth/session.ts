import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const COOKIE = "howliday_admin";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setSessionCookie(res: Response, payload: object) {
  const secret = process.env.AUTH_SECRET!;
  const token = jwt.sign(payload, secret, { expiresIn: MAX_AGE });
  
  // Use secure cookies only when deployed to Firebase Functions (detected by K_SERVICE)
  // K_SERVICE is set by Cloud Run/Firebase Functions in production
  // This ensures HTTPS-only cookies in production while allowing HTTP in local/emulator dev
  const isFirebaseProduction = !!process.env.K_SERVICE && 
                                process.env.FUNCTIONS_EMULATOR !== "true";
  
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isFirebaseProduction,
    maxAge: MAX_AGE * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export function requireOwnerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const data = jwt.verify(token, process.env.AUTH_SECRET!);
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
    return jwt.verify(token, process.env.AUTH_SECRET!);
  } catch {
    return null;
  }
}
