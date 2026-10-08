import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import prisma from './lib/prisma';
import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import callRoutes from './routes/calls';
import agentRoutes from './routes/agents';
import notificationRoutes from './routes/notifications';
import taskRoutes from './routes/tasks';
import hrRoutes from './routes/hr';
import noteRoutes from './routes/notes';
import meetingRoutes from './routes/meetings';
import outreachRoutes from './routes/outreach';
import activityRoutes from './routes/activities';
import pipelineRoutes from './routes/pipeline';
import { auditLogMiddleware } from './middleware/auditLog';
import { env } from './config/env';

dotenv.config({ override: false });

const isProduction = env.NODE_ENV === 'production';
export const app = express();

// Trust proxy for edge and load balancers
app.set('trust proxy', isProduction ? 1 : false);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
  next();
});

const allowedOriginsString = env.ALLOWED_ORIGINS || '';
const parsedOrigins = allowedOriginsString
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(url => url.length > 0);

const inferredOrigins = [
  env.APP_URL?.trim().replace(/\/$/, ''),
].filter((origin): origin is string => Boolean(origin));

const allowedOrigins = Array.from(new Set([...parsedOrigins, ...inferredOrigins]));

const corsOptions = {
  origin: isProduction
    ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const normalizedOrigin = origin?.trim().replace(/\/$/, '');
      if (!normalizedOrigin || allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.error(`CORS BLOCKED Origin: ${origin}`);
        callback(null, false);
      }
    }
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

function deepSanitizeHtml(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, {
      allowedTags: [],
      allowedAttributes: {}
    });
  }
  if (Array.isArray(obj)) return obj.map(deepSanitizeHtml);
  if (obj !== null && typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      clean[key] = deepSanitizeHtml(obj[key]);
    }
    return clean;
  }
  return obj;
}

app.use((req: Request, _res: Response, nextMiddleware: NextFunction) => {
  if (req.body) req.body = deepSanitizeHtml(req.body);
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: deepSanitizeHtml(req.query as Record<string, unknown>),
      writable: true,
      configurable: true,
    });
  }
  if (req.params) req.params = deepSanitizeHtml(req.params);
  nextMiddleware();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.method === 'OPTIONS',
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', apiLimiter);

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many auth attempts, please try again in 15 minutes' },
});
app.use('/api/auth/login', strictAuthLimiter);
app.use('/api/auth/forgot-password', strictAuthLimiter);
app.use('/api/auth/reset-password', strictAuthLimiter);
app.use('/api/auth/impersonate', strictAuthLimiter);

app.disable('x-powered-by');

// Routes
app.use('/api/auth/impersonate', auditLogMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/leads', auditLogMiddleware, leadRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/calls', auditLogMiddleware, callRoutes);
app.use('/api/agents', auditLogMiddleware, agentRoutes);
app.use('/api/meetings', auditLogMiddleware, meetingRoutes);
app.use('/api/outreach', auditLogMiddleware, outreachRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/notes', noteRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api', (req: Request, res: Response) => {
  if (!res.headersSent) {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Global API error handler
app.use((err: Error & { status?: number; statusCode?: number; code?: string; name?: string; errors?: unknown }, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;

  let status = err.statusCode || err.status || 500;
  if (err.name === 'ZodError') status = 400;
  if (typeof err.code === 'string') {
    if (err.code === 'P2002') status = 409;
    if (err.code === 'P2003') status = 400;
    if (err.code === 'P2025') status = 404;
  }
  if (status < 400 || status > 599) status = 500;

  const isApiRequest = req.originalUrl?.startsWith('/api');
  const message = status >= 500
    ? (isProduction ? 'Internal server error' : err.message || 'Internal server error')
    : (err.message || 'Request failed');

  if (isApiRequest) {
    return res.status(status).json({
      error: message,
      ...(err.name === 'ZodError' ? { details: err.errors } : {}),
    });
  }

  res.status(status).send(message);
});

export default app;
