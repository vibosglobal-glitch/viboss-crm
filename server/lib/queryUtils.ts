import { HttpError } from './routeError.js';

export function parsePagination(
  query: Record<string, string | undefined>,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
) {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 25;
  const maxLimit = defaults.maxLimit ?? 100;

  const rawPage = query.page ?? String(defaultPage);
  const rawLimit = query.limit ?? String(defaultLimit);

  const page = Number.parseInt(rawPage, 10);
  const limit = Number.parseInt(rawLimit, 10);

  const safePage = Number.isFinite(page) ? Math.max(1, page) : defaultPage;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(maxLimit, Math.max(1, limit))
    : defaultLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function buildDateRange(dateFrom?: string, dateTo?: string) {
  const range: { gte?: Date; lte?: Date } = {};

  if (dateFrom) {
    const start = new Date(dateFrom);
    if (Number.isNaN(start.getTime())) {
      throw new HttpError(400, 'Invalid dateFrom');
    }
    range.gte = start;
  }

  if (dateTo) {
    const end = new Date(dateTo);
    if (Number.isNaN(end.getTime())) {
      throw new HttpError(400, 'Invalid dateTo');
    }
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  return Object.keys(range).length > 0 ? range : undefined;
}

export function parseBooleanQuery(value?: string) {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new HttpError(400, 'Invalid boolean query value');
}
