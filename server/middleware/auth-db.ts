// TODO HowlidayInn: Database-based authentication middleware for Drizzle integration

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ensureTenant } from '../services/userService';

// Extend Request type to include user info for DB auth
export interface DBAuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: string;
    admin?: boolean;
  };
}

// Simple session-based auth middleware for DB integration
// TODO HowlidayInn: Integrate with existing Firebase session strategy
export async function requireAuth(req: DBAuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Check if we have an existing Firebase session user from the session middleware
    const firebaseUid = (req as any).user?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Look up or create user in our database based on Firebase UID
    let user = await db.query.users.findFirst({ where: eq(users.id, firebaseUid) });
    
    if (!user) {
      // Auto-create user from Firebase data if they don't exist
      const firebaseUser = (req as any).user;
      const tenantId = await ensureTenant();
      await db.insert(users).values({
        tenantId,
        id: firebaseUid, // Use Firebase UID as our user ID
        email: firebaseUser.email || '',
        name: firebaseUser.name || '',
        role: 'user'
      });
      user = await db.query.users.findFirst({ where: eq(users.id, firebaseUid) });
    }

    req.user = {
      id: user!.id,
      email: user!.email,
      role: user!.role,
      admin: user!.role === 'admin'
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Middleware to require admin privileges
export function requireAdmin(req: DBAuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user?.admin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}