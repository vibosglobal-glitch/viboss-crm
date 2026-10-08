import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { PERMISSIONS } from '../config/permissions.js';
import type { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    name: string;
    team?: string;
    impersonatedBy?: string;
  };
}

function extractToken(req: Request): string | null {
  // 1. httpOnly cookie (preferred)
  const cookieToken = (req as any).cookies?.insurelead_access;
  if (cookieToken) return cookieToken;

  // 2. Authorization: Bearer <token> (backward compat for API clients)
  const header = req.header('Authorization');
  if (header?.startsWith('Bearer ')) {
    const t = header.slice(7);
    if (t) return t;
  }

  return null;
}

/**
 * Authenticate JWT token from cookie or Authorization header.
 * Attaches decoded user payload to req.user.
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const secret = env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET missing' });
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, secret) as {
      id: string;
      role: UserRole;
      email: string;
      name: string;
      team?: string;
      impersonatedBy?: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Legacy alias — keep for backward compatibility
export const auth = authenticateToken;

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin', 'manager', 'hr')
 */
export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Permission-based authorization middleware factory.
 * Uses the permission map from config/permissions.ts
 * Usage: checkPermission('leads', 'upload')
 */
export function checkPermission(resource: string, action: string) {
  const permKey = `${resource}.${action}`;
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedRoles = PERMISSIONS[permKey];
    if (!allowedRoles) {
      // If no permission defined, deny by default
      return res.status(403).json({ error: `No permission rule for ${permKey}` });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Legacy convenience middlewares — keep for backward compatibility
export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function leadgenOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'lead_gen') {
    return res.status(403).json({ error: 'Lead Gen or Admin access required' });
  }
  next();
}
