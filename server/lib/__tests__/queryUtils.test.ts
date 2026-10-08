import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { buildDateRange, parseBooleanQuery, parsePagination } from '../queryUtils';
import { HttpError, sendRouteError } from '../routeError';

describe('parsePagination', () => {
  it('returns safe defaults', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 25, skip: 0 });
  });

  it('clamps invalid and oversized values', () => {
    const result = parsePagination({ page: '-10', limit: '999' }, { maxLimit: 50 });
    expect(result).toEqual({ page: 1, limit: 50, skip: 0 });
  });

  it('calculates skip correctly', () => {
    const result = parsePagination({ page: '3', limit: '20' });
    expect(result).toEqual({ page: 3, limit: 20, skip: 40 });
  });
});

describe('buildDateRange', () => {
  it('builds a valid range', () => {
    const result = buildDateRange('2026-01-01', '2026-01-10');
    expect(result?.gte).toBeInstanceOf(Date);
    expect(result?.lte).toBeInstanceOf(Date);
  });

  it('throws on invalid dateFrom', () => {
    expect(() => buildDateRange('invalid-date', '2026-01-10')).toThrow(HttpError);
  });

  it('returns undefined when both dates are missing', () => {
    expect(buildDateRange()).toBeUndefined();
  });
});

describe('parseBooleanQuery', () => {
  it('parses booleans and undefined', () => {
    expect(parseBooleanQuery('true')).toBe(true);
    expect(parseBooleanQuery('false')).toBe(false);
    expect(parseBooleanQuery(undefined)).toBeUndefined();
  });

  it('throws on invalid boolean string', () => {
    expect(() => parseBooleanQuery('yes')).toThrow(HttpError);
  });
});

describe('sendRouteError', () => {
  function createMockResponse() {
    const state = { statusCode: 200, body: {} as Record<string, unknown> };
    const res = {
      status(code: number) {
        state.statusCode = code;
        return this;
      },
      json(payload: Record<string, unknown>) {
        state.body = payload;
        return this;
      },
    };
    return { res, state };
  }

  it('maps HttpError status', () => {
    const { res, state } = createMockResponse();
    sendRouteError(res as any, new HttpError(400, 'Bad request'), 'test');
    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'Bad request' });
  });

  it('maps Prisma P2002 to conflict', () => {
    const { res, state } = createMockResponse();
    const prismaErr = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    sendRouteError(res as any, prismaErr, 'test');
    expect(state.statusCode).toBe(409);
    expect(state.body).toEqual({ error: 'Resource already exists' });
  });
}
);