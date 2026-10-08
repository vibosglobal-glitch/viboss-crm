import { Prisma } from '@prisma/client';
import type { Response } from 'express';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function sendRouteError(res: Response, err: unknown, context: string) {
  if (err instanceof HttpError) {
    console.error(`${context}:`, err.message);
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid relation reference' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
  }

  const message = err && typeof err === 'object' && 'message' in err
    ? (err as { message: string }).message
    : String(err);

  console.error(`${context}:`, message);

  return res.status(500).json({ error: message });
}
