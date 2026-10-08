import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env';
import { authenticateToken, checkPermission, type AuthRequest } from '../auth';

function createResponseMock() {
  const state = { statusCode: 200, body: null as unknown };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
  };

  return { res, state };
}

describe('authenticateToken middleware', () => {
  it('returns 401 when token is missing', async () => {
    const req = { header: vi.fn().mockReturnValue(undefined), cookies: {} } as unknown as AuthRequest;
    const { res, state } = createResponseMock();
    const next = vi.fn();

    await authenticateToken(req, res as any, next as any);

    expect(state.statusCode).toBe(401);
    expect((state.body as Record<string, string>).error).toBe('No token, authorization denied');
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user and calls next for valid bearer token', async () => {
    const token = jwt.sign(
      { id: 'u-1', role: 'admin', email: 'admin@example.com', name: 'Admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const req = {
      header: vi.fn().mockImplementation((name: string) => {
        if (name === 'Authorization') return `Bearer ${token}`;
        return undefined;
      }),
      cookies: {},
    } as unknown as AuthRequest;
    const { res } = createResponseMock();
    const next = vi.fn();

    await authenticateToken(req, res as any, next as any);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user?.id).toBe('u-1');
    expect(req.user?.role).toBe('admin');
  });
});

describe('checkPermission middleware', () => {
  it('returns 401 when user is missing', () => {
    const middleware = checkPermission('leads', 'read');
    const req = {} as AuthRequest;
    const { res, state } = createResponseMock();
    const next = vi.fn();

    middleware(req, res as any, next as any);

    expect(state.statusCode).toBe(401);
    expect((state.body as Record<string, string>).error).toBe('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when permission key is undefined', () => {
    const middleware = checkPermission('nonexistent', 'action');
    const req = {
      user: { id: 'u-1', role: 'admin', email: 'admin@example.com', name: 'Admin' },
    } as AuthRequest;
    const { res, state } = createResponseMock();
    const next = vi.fn();

    middleware(req, res as any, next as any);

    expect(state.statusCode).toBe(403);
    expect((state.body as Record<string, string>).error).toContain('No permission rule');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows when role has permission', () => {
    const middleware = checkPermission('leads', 'read');
    const req = {
      user: { id: 'u-1', role: 'manager', email: 'manager@example.com', name: 'Manager' },
    } as AuthRequest;
    const { res } = createResponseMock();
    const next = vi.fn();

    middleware(req, res as any, next as any);

    expect(next).toHaveBeenCalledOnce();
  });
});
