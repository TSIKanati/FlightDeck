import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: { message: 'Email and password required' } });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
      id: string;
      email: string;
      password_hash: string;
      role: string;
      mfa_enabled: number;
    } | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      return;
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      return;
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Get permissions
    const permissions = db
      .prepare('SELECT permission FROM permissions WHERE user_id = ?')
      .all(user.id) as { permission: string }[];

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (user_id, action, details, result)
      VALUES (?, 'auth.login', '{}', 'success')
    `).run(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: permissions.map((p) => p.permission)
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '4h'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: { message: 'Login failed' } });
  }
});

// Logout
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (user_id, action, details, result)
      VALUES (?, 'auth.logout', '{}', 'success')
    `).run(req.user?.id);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Logout failed' } });
  }
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, role, created_at, last_login FROM users WHERE id = ?').get(req.user?.id);

    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        ...user,
        permissions: req.user?.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to get user' } });
  }
});

// Change password
router.put('/password', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: { message: 'Current and new password required' } });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: { message: 'Password must be at least 8 characters' } });
      return;
    }

    const db = getDb();
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user?.id) as { password_hash: string } | undefined;

    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      res.status(401).json({ success: false, error: { message: 'Current password is incorrect' } });
      return;
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, req.user?.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (user_id, action, details, result)
      VALUES (?, 'auth.password_change', '{}', 'success')
    `).run(req.user?.id);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to change password' } });
  }
});

export { router as authRouter };
