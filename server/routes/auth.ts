import { Router, Request, Response, CookieOptions } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { auth, AuthRequest } from '../middleware/auth';
import { sendRouteError } from '../lib/routeError.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/email';

const router = Router();

import { env } from '../config/env';

const IS_PROD = env.NODE_ENV === 'production';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL = '7d';

/** Strip sensitive fields from user object before sending to client */
function sanitizeUser(user: Record<string, any>) {
  const { password, resetTokenHash, resetTokenExpiry, refreshTokens, failedLoginAttempts, lockUntil, tokenVersion, ...safe } = user;
  return safe;
}

function buildSessionResponse(user: Record<string, any>, impersonatedBy: string | null = null) {
  return {
    user: sanitizeUser(user),
    impersonatedBy,
  };
}

function getCookieOptions(): { base: CookieOptions; refreshPath: string; backupPath: string } {
  const configuredSameSite = env.COOKIE_SAMESITE as ('lax' | 'strict' | 'none' | undefined);
  const requestedSameSite = configuredSameSite || (IS_PROD ? 'none' : 'lax');
  const sameSite = !IS_PROD && requestedSameSite === 'none' ? 'lax' : requestedSameSite;
  const secure = IS_PROD;
  const domain = IS_PROD ? env.COOKIE_DOMAIN?.trim() || undefined : undefined;

  const base: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    ...(domain ? { domain } : {}),
  };

  return {
    base,
    refreshPath: '/',
    backupPath: '/api/auth/exit-impersonation',
  };
}

function getJwtSecret(): string {
  const s = env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not configured');
  return s;
}

function getRefreshSecret(): string {
  if (env.JWT_REFRESH_SECRET) return env.JWT_REFRESH_SECRET;
  return crypto.createHmac('sha256', env.JWT_SECRET).update('refresh_token_secret').digest('hex');
}

/** Set both httpOnly cookies for a rolling 7-day session. */
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const { base, refreshPath } = getCookieOptions();

  res.cookie('insurelead_access', accessToken, {
    ...base,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });

  res.cookie('insurelead_refresh', refreshToken, {
    ...base,
    maxAge: SESSION_MAX_AGE_MS,
    path: refreshPath,
  });
}

function clearAuthCookies(res: Response) {
  const { base, refreshPath } = getCookieOptions();
  res.clearCookie('insurelead_access', { ...base, path: '/' });
  res.clearCookie('insurelead_refresh', { ...base, path: refreshPath });
  res.clearCookie('insurelead_refresh', { ...base, path: '/api/auth/refresh' });
}

function getAdminBackupSecret(): string {
  return crypto.createHmac('sha256', getJwtSecret()).update('admin_backup_secret').digest('hex');
}

function setAdminBackupCookie(res: Response, adminId: string, adminEmail: string) {
  const { base, backupPath } = getCookieOptions();
  const token = jwt.sign(
    { adminId, adminEmail },
    getAdminBackupSecret(),
    { expiresIn: '2h' },
  );
  res.cookie('insurelead_admin_backup', token, {
    ...base,
    maxAge: 2 * 60 * 60 * 1000,
    path: backupPath,
  });
}

function clearAdminBackupCookie(res: Response) {
  const { base, backupPath } = getCookieOptions();
  res.clearCookie('insurelead_admin_backup', { ...base, path: backupPath });
}

function issueTokenPair(payload: { id: string; role: string; email: string; name?: string; team?: string | null; tokenVersion?: number; impersonatedBy?: string }) {
  const accessToken = jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign({ id: payload.id, tokenVersion: payload.tokenVersion ?? 0 }, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_TTL });
  return { accessToken, refreshToken };
}

function validatePasswordFormat(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}


// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user) {
      console.warn(`[LOGIN] No user found for email: ${trimmedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      console.warn(`[LOGIN] Deactivated user attempted login: ${trimmedEmail}`);
      return res.status(401).json({ error: 'This account has been deactivated. Contact your administrator.' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(401).json({ error: `Account locked. Try again in ${waitMinutes} minutes.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newAttempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          ...(newAttempts >= 10 ? { lockUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
        },
      });
      console.warn(`[LOGIN] Password mismatch for email: ${trimmedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = issueTokenPair({
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      team: user.teamId,
      tokenVersion: user.tokenVersion,
    });

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        refreshTokens: { push: refreshHash },
      },
    });

    console.log(`[LOGIN] Successful login for: ${trimmedEmail} (role: ${user.role})`);
    setAuthCookies(res, accessToken, refreshToken);
    res.json(buildSessionResponse(user));
  } catch (err) {
    return sendRouteError(res, err, 'Login error');
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = (req as any).cookies?.insurelead_refresh;
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, getRefreshSecret()) as { id: string };
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (user) {
        const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshTokens: { set: user.refreshTokens.filter(t => t !== refreshHash) } },
        });
      }
    } catch { /* ignore expired token on logout */ }
  }
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
});

// ─── POST /api/auth/logout-all ───────────────────────────────────────────────
router.post('/logout-all', auth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { refreshTokens: { set: [] } },
    });
    clearAuthCookies(res);
    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    return sendRouteError(res, err, 'Logout all error');
  }
});

// ─── POST /api/auth/refresh ──────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = (req as any).cookies?.insurelead_refresh;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    let payload: { id: string; tokenVersion?: number };
    try {
      payload = jwt.verify(refreshToken, getRefreshSecret()) as { id: string; tokenVersion?: number };
    } catch {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      clearAuthCookies(res);
      return res.status(401).json({ error: !user ? 'User not found' : 'Account deactivated' });
    }

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenIndex = user.refreshTokens.indexOf(refreshHash);
    if (tokenIndex === -1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokens: { set: [] } },
      });
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token reuse detected' });
    }

    const currentVersion = user.tokenVersion;
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== currentVersion) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Token invalidated by password change' });
    }

    const { accessToken, refreshToken: newRefresh } = issueTokenPair({
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      team: user.teamId,
      tokenVersion: currentVersion,
    });

    const newRefreshHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
    const updatedTokens = [...user.refreshTokens];
    updatedTokens.splice(tokenIndex, 1);
    updatedTokens.push(newRefreshHash);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokens: { set: updatedTokens } },
    });

    setAuthCookies(res, accessToken, newRefresh);
    res.json(buildSessionResponse(user));
  } catch (err) {
    return sendRouteError(res, err, 'Refresh error');
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { team: { select: { id: true, name: true, description: true } } },
    });
    if (!user || !user.isActive) {
      clearAuthCookies(res);
      return res.status(401).json({ error: !user ? 'User not found' : 'Account deactivated' });
    }
    res.json(buildSessionResponse(user, req.user?.impersonatedBy ?? null));
  } catch (err) {
    return sendRouteError(res, err, 'Get session error');
  }
});

// ─── POST /api/auth/impersonate ──────────────────────────────────────────────
router.post('/impersonate', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.auditLog.create({
      data: {
        action: 'impersonate',
        adminId: req.user.id,
        adminEmail: req.user.email,
        targetId: target.id,
        targetEmail: target.email,
        targetRole: target.role,
        ip: req.ip || null,
      },
    });

    setAdminBackupCookie(res, req.user.id, req.user.email);

    const accessToken = jwt.sign(
      {
        id: target.id,
        role: target.role,
        email: target.email,
        name: target.name,
        impersonatedBy: req.user.email,
      },
      getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const { base, refreshPath } = getCookieOptions();
    res.cookie('insurelead_access', accessToken, {
      ...base,
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });
    res.clearCookie('insurelead_refresh', { ...base, path: refreshPath });

    res.json(buildSessionResponse(target, req.user.email));
  } catch (err) {
    return sendRouteError(res, err, 'Impersonate error');
  }
});

// ─── POST /api/auth/exit-impersonation ───────────────────────────────────────
router.post('/exit-impersonation', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.impersonatedBy) {
      clearAdminBackupCookie(res);
      return res.status(403).json({ error: 'You are not currently impersonating a user' });
    }

    const backupToken = (req as any).cookies?.insurelead_admin_backup;
    if (!backupToken) {
      return res.status(401).json({ error: 'No impersonation session found' });
    }

    let payload: { adminId: string; adminEmail: string };
    try {
      payload = jwt.verify(backupToken, getAdminBackupSecret()) as {
        adminId: string;
        adminEmail: string;
      };
    } catch {
      clearAdminBackupCookie(res);
      return res.status(401).json({ error: 'Impersonation session expired — please log in again' });
    }

    if (req.user.impersonatedBy.toLowerCase() !== payload.adminEmail.toLowerCase()) {
      clearAuthCookies(res);
      clearAdminBackupCookie(res);
      return res.status(403).json({ error: 'Impersonation session mismatch' });
    }

    const admin = await prisma.user.findUnique({ where: { id: payload.adminId } });
    if (!admin || admin.role !== 'admin') {
      clearAdminBackupCookie(res);
      return res.status(401).json({ error: 'Admin account not found' });
    }

    const { accessToken, refreshToken } = issueTokenPair({
      id: admin.id,
      role: admin.role,
      email: admin.email,
      name: admin.name,
      tokenVersion: admin.tokenVersion,
    });

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    let updatedTokens = [...admin.refreshTokens, refreshHash];
    if (updatedTokens.length > 10) {
      updatedTokens = updatedTokens.slice(-10);
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: { refreshTokens: { set: updatedTokens } },
    });

    setAuthCookies(res, accessToken, refreshToken);
    clearAdminBackupCookie(res);
    res.json(buildSessionResponse(admin));
  } catch (err) {
    return sendRouteError(res, err, 'Exit impersonation error');
  }
});

// ─── POST /api/auth/register (admin-only) ────────────────────────────────────
router.post('/register', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, email, role, avatar } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'name, email, and role are required' });
    }

    const VALID_ROLES = ['admin', 'lead_gen', 'sdr', 'closer', 'manager', 'hr'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing && existing.isActive) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }

    const tempPassword = crypto.randomBytes(10).toString('base64url').slice(0, 14);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    let newUser;
    if (existing && !existing.isActive) {
      // Reactivate the previously deactivated user
      newUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: String(name).trim(),
          password: hashedPassword,
          role,
          isActive: true,
          avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          failedLoginAttempts: 0,
          lockUntil: null,
          refreshTokens: { set: [] },
          tokenVersion: { increment: 1 },
        },
      });
    } else {
      newUser = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: trimmedEmail,
          password: hashedPassword,
          role,
          avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        },
      });
    }

    sendWelcomeEmail(newUser.email, newUser.name, tempPassword, role).catch((e) =>
      console.error('Welcome email failed:', e)
    );

    res.status(201).json({ user: sanitizeUser(newUser) });
  } catch (err) {
    return sendRouteError(res, err, 'Register error');
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });

    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: tokenHash,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    sendPasswordResetEmail(user.email, user.name, plainToken).catch((e) =>
      console.error('Reset email failed:', e)
    );

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    return sendRouteError(res, err, 'Forgot password error');
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (!validatePasswordFormat(String(password))) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetTokenHash: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 },
        refreshTokens: { set: [] },
      },
    });

    res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    return sendRouteError(res, err, 'Reset password error');
  }
});

// ─── POST /api/auth/change-password (authenticated) ──────────────────────────
router.post('/change-password', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (!validatePasswordFormat(String(newPassword))) {
      return res.status(400).json({ error: 'New password must be at least 8 characters and include uppercase, lowercase, and a number' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
        refreshTokens: { set: [] },
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    return sendRouteError(res, err, 'Change password error');
  }
});

export default router;
