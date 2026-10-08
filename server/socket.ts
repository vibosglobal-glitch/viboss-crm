import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

export interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
  userEmail?: string;
  userName?: string;
}

let io: SocketIOServer;

import { env } from './config/env';

function getJwtSecret(): string {
  return env.JWT_SECRET;
}
/** Parse the insurelead_access cookie from a raw Cookie header string */
function parseCookieToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').find((c) => c.trim().startsWith('insurelead_access='));
  if (!match) return null;
  return match.trim().slice('insurelead_access='.length);
}

export function initIO(httpServer: HttpServer): SocketIOServer {
  const isProduction = env.NODE_ENV === 'production';

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: isProduction
        ? (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
        : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // ── JWT auth middleware ──────────────────────────────────────────────────
  io.use((socket: AuthSocket, next) => {
    // Try httpOnly cookie first. Keep auth.token fallback only outside production.
    const cookieHeader = socket.handshake.headers.cookie;
    const fallbackToken = isProduction
      ? null
      : (socket.handshake.auth?.token as string | undefined);

    const token =
      parseCookieToken(cookieHeader) ??
      fallbackToken ??
      null;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret()) as {
        id: string;
        role: string;
        email: string;
        name: string;
      };
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userEmail = decoded.email;
      socket.userName = decoded.name;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────
  io.on('connection', (socket: AuthSocket) => {
    const role = socket.userRole ?? 'unknown';
    const userId = socket.userId ?? 'unknown';
    console.log(`Socket connected: ${socket.id} | role=${role} | user=${socket.userEmail}`);

    // Join role-based rooms so we can emit targeted events
    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/**
 * Emit lead:changed to the appropriate room(s) based on who should see it.
 * - admins, leadgen, hr: see all lead changes (role rooms)
 * - sdr: only see changes for leads assigned to them (user room)
 */
export function emitLeadChangedToRoles(action: string, data?: Record<string, unknown>) {
  if (!io) return;
  const payload = { action, ...(data ?? {}) };
  io.to('role:admin').to('role:leadgen').to('role:hr').emit('lead:changed', payload);

  // For SDR, emit to the specific user room if assignedAgentId is known
  if (data?.assignedUserId) {
    io.to(`user:${data.assignedUserId}`).emit('lead:changed', payload);
  }
}
