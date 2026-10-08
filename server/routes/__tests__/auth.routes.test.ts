import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../../lib/prisma', () => ({ default: prismaMock }));
vi.mock('../../services/email', () => ({
  sendPasswordResetEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

import authRouter from '../auth';
import { env } from '../../config/env';

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(null);
  });

  it('POST /api/auth/login returns 400 when email or password is missing', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/login').send({ email: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email and password are required');
  });

  it('POST /api/auth/login returns 401 for unknown user', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('POST /api/auth/refresh returns 401 when refresh cookie is absent', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/refresh').send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No refresh token');
  });

  it('POST /api/auth/change-password returns 401 without auth token', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/auth/change-password').send({
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token, authorization denied');
  });

  it('POST /api/auth/change-password returns 400 for missing fields with valid token', async () => {
    const app = buildApp();
    const token = jwt.sign(
      { id: 'user-1', role: 'admin', email: 'admin@example.com', name: 'Admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Current password and new password are required');
  });

  it('POST /api/auth/login succeeds for V!BOS admin suhail@vibosglobal.com', async () => {
    const app = buildApp();
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash('Vibos@2026', 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'admin-sohil',
      email: 'suhail@vibosglobal.com',
      name: 'Sohil',
      role: 'admin',
      password: passwordHash,
      isActive: true,
      tokenVersion: 0,
      refreshTokens: [],
    } as any);

    const res = await request(app).post('/api/auth/login').send({
      email: 'suhail@vibosglobal.com',
      password: 'Vibos@2026',
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'suhail@vibosglobal.com',
      name: 'Sohil',
      role: 'admin',
    });
  });

  it('POST /api/auth/login succeeds for V!BOS staff stuart.young@vibosglobal.com', async () => {
    const app = buildApp();
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash('Vibos@2026', 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'staff-stuart',
      email: 'stuart.young@vibosglobal.com',
      name: 'Stuart Young',
      role: 'sdr',
      password: passwordHash,
      isActive: true,
      tokenVersion: 0,
      refreshTokens: [],
    } as any);

    const res = await request(app).post('/api/auth/login').send({
      email: 'stuart.young@vibosglobal.com',
      password: 'Vibos@2026',
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'stuart.young@vibosglobal.com',
      name: 'Stuart Young',
      role: 'sdr',
    });
  });
});
