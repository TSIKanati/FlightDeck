import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'flightdeck-secret-key-change-in-production';

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    // Get user permissions from database
    const db = getDb();
    const permissions = db
      .prepare('SELECT permission FROM permissions WHERE user_id = ?')
      .all(decoded.userId) as { permission: string }[];

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: permissions.map((p) => p.permission)
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // SuperAdmin has all permissions
    if (req.user.role === 'SuperAdmin') {
      next();
      return;
    }

    // Check for specific permission or wildcard
    const hasPermission =
      req.user.permissions.includes(permission) ||
      req.user.permissions.includes('all_apps.full') ||
      req.user.permissions.some((p) => p.endsWith('.full') && permission.startsWith(p.replace('.full', '')));

    if (!hasPermission) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '4h' }
  );
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}
