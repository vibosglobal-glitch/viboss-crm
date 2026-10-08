import { Router, Response } from 'express';
import { LeadSource, Prisma } from '@prisma/client';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { authenticateToken, checkPermission, AuthRequest } from '../middleware/auth.js';
import { emitLeadChangedToRoles } from '../socket.js';
import { validate } from '../middleware/validate.js';
import { createLeadSchema, updateLeadSchema } from '../validators/lead.js';
import { USER_WITH_ROLE_SELECT, STAGE_SELECT, LEAD_LIST_SELECT } from '../lib/selects.js';
import { parsePagination, buildDateRange } from '../lib/queryUtils.js';
import { sendRouteError } from '../lib/routeError.js';

const router = Router();

const STATUS_ORDER: Record<string, number> = {
  'New Lead': 1,
  'In Progress': 2,
  'Contacted': 3,
  'Appointment Set': 4,
  'Active Account': 5,
};
const CANONICAL_LEAD_STATUSES = Object.keys(STATUS_ORDER);
const CONTACTED_STATUS_ORDER = STATUS_ORDER.Contacted;

const IMPORT_STATUS_ALIASES: Record<string, string> = {
  'new': 'New Lead',
  'newlead': 'New Lead',
  'inprogress': 'In Progress',
  'progress': 'In Progress',
  'working': 'In Progress',
  'contacted': 'Contacted',
  'connected': 'Contacted',
  'meetingbooked': 'Appointment Set',
  'appointmentbooked': 'Appointment Set',
  'appointmentset': 'Appointment Set',
  'appointment': 'Appointment Set',
  'booked': 'Appointment Set',
  'closedwon': 'Active Account',
  'closed won': 'Active Account',
  'activeaccount': 'Active Account',
  'active account (closed won)': 'Active Account',
  'won': 'Active Account',
};

function normalizeStatusLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeStatusAliasKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function resolveCanonicalImportStatus(
  rawStatus: string | null | undefined,
  statusValueMappings?: Record<string, string>,
) {
  if (!rawStatus) return null;

  const normalizedLookup = normalizeStatusLookupKey(rawStatus);
  if (!normalizedLookup) return null;

  if (statusValueMappings && statusValueMappings[normalizedLookup]) {
    const mapped = statusValueMappings[normalizedLookup];
    if (CANONICAL_LEAD_STATUSES.includes(mapped)) {
      return mapped;
    }
  }

  const canonical = CANONICAL_LEAD_STATUSES.find(
    (status) => normalizeStatusLookupKey(status) === normalizedLookup,
  );
  if (canonical) return canonical;

  const aliasMatch = IMPORT_STATUS_ALIASES[normalizeStatusAliasKey(rawStatus)];
  return aliasMatch && CANONICAL_LEAD_STATUSES.includes(aliasMatch) ? aliasMatch : null;
}

function buildStatusValueMappingLookup(statusValueMappings?: Record<string, string>) {
  const lookup: Record<string, string> = {};
  if (!statusValueMappings || typeof statusValueMappings !== 'object') return lookup;

  for (const [rawValue, mappedValue] of Object.entries(statusValueMappings)) {
    if (!rawValue || !mappedValue) continue;
    if (!CANONICAL_LEAD_STATUSES.includes(mappedValue)) continue;
    const normalizedKey = normalizeStatusLookupKey(rawValue);
    if (!normalizedKey) continue;
    lookup[normalizedKey] = mappedValue;
  }

  return lookup;
}

const ALLOWED_EXTENSIONS = ['.csv', '.tsv', '.txt', '.xlsx', '.xls'];
const ALLOWED_MIMES = [
  'text/csv', 'text/tab-separated-values', 'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const IMPORT_INSERT_CHUNK_SIZE = 1000;
const IMPORT_DEDUPE_CHUNK_SIZE = 5000;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Supported formats: CSV, TSV, Excel (.xlsx, .xls)'));
    }
  },
});

/** Parse any supported file buffer into { headers, rows } where rows is string[][] */
function parseFileToRows(buffer: Buffer, filename: string): { headers: string[]; rows: string[][] } {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (data.length < 2) throw new Error('File must have a header and at least one data row');
    const headers = data[0].map((h: any) => String(h).trim());
    const rows = data.slice(1).filter(r => r.some((c: any) => String(c).trim()));
    return { headers, rows: rows.map(r => r.map((c: any) => String(c).trim())) };
  }

  // CSV / TSV / TXT
  const text = buffer.toString('utf-8');
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const parsedRows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentValue.trim());
      if (currentRow.some((value) => value.length > 0)) {
        parsedRows.push(currentRow);
      }

      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((value) => value.length > 0)) {
      parsedRows.push(currentRow);
    }
  }

  if (parsedRows.length < 2) throw new Error('File must have a header and at least one data row');

  const headers = parsedRows[0].map(h => h.replace(/^"|"$/g, ''));
  const rows = parsedRows.slice(1);
  return { headers, rows };
}

async function getDefaultStage() {
  return prisma.pipelineStage.findFirst({
    where: { name: 'New Lead', isActive: true },
    orderBy: { order: 'asc' },
  });
}

const LEAD_INCLUDE = {
  assignedTo: { select: USER_WITH_ROLE_SELECT },
  uploader: { select: USER_WITH_ROLE_SELECT },
  pipelineStage: { select: STAGE_SELECT },
};

function sanitizeCsvValue(val: string): string {
  const trimmed = val.trim();
  if (/^[=+\-@|\t\r]/.test(trimmed)) return "'" + trimmed;
  return trimmed;
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return null;

  return normalized;
}

function normalizeOptionalDateTime(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return null;

  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
  const parsed = dateOnlyMatch
    ? new Date(`${normalized}T00:00:00.000Z`)
    : new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeLeadWriteData<T extends Record<string, any>>(data: T): T {
  const normalized: Record<string, any> = { ...data };

  if (Object.prototype.hasOwnProperty.call(normalized, 'employeeCount')) {
    normalized.employeeCount = normalizeOptionalString(normalized.employeeCount);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'assignedVA')) {
    normalized.assignedVA = normalizeOptionalString(normalized.assignedVA);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'sourceChannel')) {
    normalized.sourceChannel = normalizeOptionalString(normalized.sourceChannel);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'contractSignDate')) {
    normalized.contractSignDate = normalizeOptionalDateTime(normalized.contractSignDate);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'activeServiceDate')) {
    normalized.activeServiceDate = normalizeOptionalDateTime(normalized.activeServiceDate);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'nextFollowUp')) {
    normalized.nextFollowUp = normalizeOptionalDateTime(normalized.nextFollowUp);
  }

  return normalized as T;
}

/** Clean a CSV value for database import — trim, normalize nulls, no formula prefix corruption */
function cleanImportValue(val: string | undefined | null): string {
  if (val === undefined || val === null) return '';
  const trimmed = String(val).trim();
  const lower = trimmed.toLowerCase();
  if (trimmed === '' || lower === 'null' || lower === 'n/a' || lower === 'na' || lower === 'none' || trimmed === '-' || trimmed === '--') return '';
  return trimmed;
}

async function resolveDeleteableLeadIds(
  user: NonNullable<AuthRequest['user']>,
  leadIds: unknown,
  options?: { requireCsvUpload?: boolean; requireOwnUpload?: boolean },
) {
  const uniqueLeadIds = Array.from(new Set(
    Array.isArray(leadIds)
      ? leadIds.filter((leadId): leadId is string => typeof leadId === 'string' && leadId.trim().length > 0)
      : [],
  ));

  if (uniqueLeadIds.length === 0) {
    return { uniqueLeadIds, matchedLeadIds: [] as string[] };
  }

  const where: any = { id: { in: uniqueLeadIds } };

  if (options?.requireCsvUpload) {
    where.source = 'csv_upload';
  }

  if (user.role === 'lead_gen' || options?.requireOwnUpload) {
    where.uploadedById = user.id;
  }

  const matchedLeads = await prisma.lead.findMany({
    where,
    select: { id: true },
  });

  return {
    uniqueLeadIds,
    matchedLeadIds: matchedLeads.map((lead) => lead.id),
  };
}

async function permanentlyDeleteLeads(leadIds: string[]) {
  if (leadIds.length === 0) {
    return { deleted: 0 };
  }

  return prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: { relatedLeadId: { in: leadIds } },
    });

    await tx.call.deleteMany({
      where: { leadId: { in: leadIds } },
    });

    await tx.activity.updateMany({
      where: { leadId: { in: leadIds } },
      data: { leadId: null },
    });

    await tx.meeting.updateMany({
      where: { leadId: { in: leadIds } },
      data: { leadId: null },
    });

    await tx.note.updateMany({
      where: { leadId: { in: leadIds } },
      data: { leadId: null },
    });

    await tx.task.updateMany({
      where: { leadId: { in: leadIds } },
      data: { leadId: null },
    });

    const deletedLeads = await tx.lead.deleteMany({
      where: { id: { in: leadIds } },
    });

    return { deleted: deletedLeads.count };
  });
}

// ═══ GET /api/leads ═══
router.get('/', authenticateToken, checkPermission('leads', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      status, assignedTo, agent, pipelineStage, source, search,
      state, priority, hasFollowUp,
      employeeCountMin, employeeCountMax,
      dateFrom, dateTo,
    } = req.query as Record<string, string>;

    const isFollowUpMode = hasFollowUp === 'true';
    const defaultSortBy = isFollowUpMode ? 'nextFollowUp' : 'createdAt';
    const defaultSortOrder = isFollowUpMode ? 'asc' : 'desc';
    const { sortBy = defaultSortBy, sortOrder = defaultSortOrder } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.LeadWhereInput = { isDeleted: false };
    const assignedToId = assignedTo || agent;
    const role = req.user!.role;
    if (role === 'sdr' || role === 'closer') {
      // Show leads assigned to OR uploaded by this SDR so imports are visible before assignment
      where.OR = [
        { assignedToId: req.user!.id },
        { uploadedById: req.user!.id },
      ];
    } else if (role === 'lead_gen') {
      where.uploadedById = req.user!.id;
    }

    if (status) where.status = status;
    if (isFollowUpMode) where.nextFollowUp = { not: null };
    if (pipelineStage) where.pipelineStageId = pipelineStage;
    if (source) {
      if (!Object.values(LeadSource).includes(source as LeadSource)) {
        return res.status(400).json({ error: 'Invalid source filter' });
      }
      where.source = source as LeadSource;
    }
    if (assignedToId && role !== 'sdr' && role !== 'closer') {
      where.assignedToId = assignedToId;
    }
    if (priority) where.priority = priority;
    if (state) where.state = { equals: state, mode: 'insensitive' as const };
    const createdAtRange = buildDateRange(dateFrom, dateTo);
    if (createdAtRange) {
      where.createdAt = createdAtRange;
    }
    if (search) {
      const searchFilter = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      };
      if (where.OR) {
        const roleOr = where.OR;
        delete where.OR;
        where.AND = [{ OR: roleOr }, searchFilter];
      } else {
        where.OR = searchFilter.OR;
      }
    }

    const minEmployees = employeeCountMin ? parseInt(employeeCountMin, 10) : undefined;
    const maxEmployees = employeeCountMax ? parseInt(employeeCountMax, 10) : undefined;

    if (minEmployees !== undefined || maxEmployees !== undefined) {
      const candidateLeads = await prisma.lead.findMany({
        where,
        select: { id: true, employeeCount: true },
      });

      const matchingIds = candidateLeads
        .filter((lead) => {
          const raw = String(lead.employeeCount ?? '').trim();
          if (!raw) return false;

          // Extract all numbers from the string — handles both "250" and "Small (1–10 employees)" or "11-50"
          const nums = raw.match(/\d+/g)?.map(Number) ?? [];
          if (nums.length === 0) return false;

          // Use the representative value: single number → that value, range string → average of first two
          const representative = nums.length >= 2 ? Math.round((nums[0] + nums[1]) / 2) : nums[0];

          if (minEmployees !== undefined && representative < minEmployees) return false;
          if (maxEmployees !== undefined && representative > maxEmployees) return false;

          return true;
        })
        .map((lead) => lead.id);

      where.id = matchingIds.length > 0 ? { in: matchingIds } : { in: ['__no_matching_leads__'] };
    }

    const sortFieldMap: Record<string, string> = {
      createdAt: 'createdAt', updatedAt: 'updatedAt', firstName: 'firstName',
      lastName: 'lastName', status: 'status', company: 'company', employeeCount: 'employeeCount',
      nextFollowUp: 'nextFollowUp',
    };
    const orderField = sortFieldMap[sortBy] || 'createdAt';

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        select: LEAD_LIST_SELECT,
        orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/leads error');
  }
});

// ═══ GET /api/leads/unassigned ═══
router.get('/unassigned', authenticateToken, checkPermission('leads', 'assign'), async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(req.query as Record<string, string | undefined>);

    const where: Prisma.LeadWhereInput = { assignedToId: null, isDeleted: false };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { company: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where, include: LEAD_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/leads/unassigned error');
  }
});

// ═══ GET /api/leads/kpis ═══
router.get('/kpis', authenticateToken, checkPermission('leads', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const { dateFrom, dateTo } = req.query as Record<string, string>;

    const baseWhere: any = { isDeleted: false };
    if (role === 'sdr' || role === 'closer') {
      baseWhere.OR = [
        { assignedToId: req.user!.id },
        { uploadedById: req.user!.id },
      ];
    } else if (role === 'lead_gen') {
      baseWhere.uploadedById = req.user!.id;
    }

    if (dateFrom || dateTo) {
      baseWhere.createdAt = {};
      if (dateFrom) baseWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        baseWhere.createdAt.lte = end;
      }
    }

    const followUpWhere: any = { type: 'follow_up', isCompleted: false, scheduledAt: { lte: new Date() } };
    if (role === 'sdr' || role === 'closer') followUpWhere.userId = req.user!.id;

    const [totalLeads, newLeads, inProgress, contacted, appointmentSet, activeAccount, followUpsDue] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.count({ where: { ...baseWhere, status: 'New Lead' } }),
      prisma.lead.count({ where: { AND: [baseWhere, { OR: [{ status: 'In Progress' }, { nextFollowUp: { not: null } }] }] } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'Contacted' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'Appointment Set' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'Active Account' } }),
      prisma.activity.count({ where: followUpWhere }),
    ]);

    const activeLeads = totalLeads - activeAccount;
    res.json({ totalLeads, newLeads, inProgress, contacted, appointmentSet, activeAccount, activeLeads, closedWon: activeAccount, closedLost: 0, followUpsDue });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/leads/kpis error');
  }
});

// ═══ GET /api/leads/funnel ═══
router.get('/funnel', authenticateToken, checkPermission('leads', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const stages = await prisma.pipelineStage.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
    const role = req.user!.role;
    const { dateFrom, dateTo } = req.query as Record<string, string>;

    const baseWhere: any = { isDeleted: false };
    if (role === 'sdr' || role === 'closer') {
      baseWhere.assignedToId = req.user!.id;
    } else if (role === 'lead_gen') {
      baseWhere.uploadedById = req.user!.id;
    }

    if (dateFrom || dateTo) {
      baseWhere.createdAt = {};
      if (dateFrom) baseWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        baseWhere.createdAt.lte = end;
      }
    }

    const stageCounts = await prisma.lead.groupBy({
      by: ['pipelineStageId'], where: baseWhere, _count: { id: true },
    });
    const stageCountMap = new Map(stageCounts.map(s => [s.pipelineStageId, s._count.id]));
    const totalLeads = stageCounts.reduce((acc, s) => acc + s._count.id, 0);
    const closedWon = await prisma.lead.count({ where: { ...baseWhere, status: 'Active Account' } });

    const revenueResult = await prisma.lead.aggregate({ where: { ...baseWhere, status: 'Active Account' }, _sum: { dealValue: true } });
    const totalRevenue = revenueResult._sum.dealValue || 0;

    const newLeads = await prisma.lead.findMany({ where: { ...baseWhere, status: 'New Lead' }, select: { createdAt: true } });
    const now = Date.now();
    const avgDaysNew = newLeads.length > 0
      ? Math.round(newLeads.reduce((acc, l) => acc + (now - l.createdAt.getTime()) / 86400000, 0) / newLeads.length) : 0;

    const stageData = stages.map(stage => ({
      stage: stage.name.toLowerCase().replace(/\s+/g, '_'),
      label: stage.name,
      count: stageCountMap.get(stage.id) || 0,
      pct: totalLeads > 0 ? Math.round(((stageCountMap.get(stage.id) || 0) / totalLeads) * 100) : 0,
    }));

    // Per-agent breakdown
    const agentLeadCounts = await prisma.lead.groupBy({ by: ['assignedToId'], where: { ...baseWhere, assignedToId: { not: null } }, _count: { id: true } });
    const agentWonCounts = await prisma.lead.groupBy({ by: ['assignedToId'], where: { ...baseWhere, assignedToId: { not: null }, status: 'Active Account' }, _count: { id: true } });
    const meetingCounts = await prisma.activity.groupBy({ by: ['userId'], where: { type: 'meeting' }, _count: { id: true } });

    const agentIds = agentLeadCounts.map(a => a.assignedToId!).filter(Boolean);
    const agents = await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } });
    const agentNameMap = new Map(agents.map(a => [a.id, a.name]));
    const wonCountMap = new Map(agentWonCounts.map(a => [a.assignedToId, a._count.id]));
    const meetingCountMap = new Map(meetingCounts.map(m => [m.userId, m._count.id]));

    const byAgent = agentLeadCounts
      .map(a => ({
        name: agentNameMap.get(a.assignedToId!) || 'Unknown',
        total: a._count.id,
        closedWon: wonCountMap.get(a.assignedToId) || 0,
        meetings: meetingCountMap.get(a.assignedToId!) || 0,
      }))
      .sort((a, b) => b.closedWon - a.closedWon);

    res.json({ totalLeads, closedWon, totalRevenue, avgDaysNew, stages: stageData, byAgent });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/leads/funnel error');
  }
});

// ═══ GET /api/leads/:id ═══
router.get('/:id', authenticateToken, checkPermission('leads', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: (req.params.id as string) }, include: LEAD_INCLUDE });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const role = req.user!.role;
    if ((role === 'sdr' || role === 'closer') &&
      lead.assignedToId !== req.user!.id &&
      lead.uploadedById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to view this lead' });
    }

    const activities = await prisma.activity.findMany({
      where: { leadId: lead.id },
      include: { user: { select: { name: true, avatar: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ lead, activities });
  } catch (err) {
    return sendRouteError(res, err, 'GET /api/leads/:id error');
  }
});

// ═══ POST /api/leads ═══
router.post('/', authenticateToken, validate(createLeadSchema), async (req: AuthRequest, res: Response) => {
  try {
    const defaultStage = await getDefaultStage();
    const { pipelineStage, assignedTo, assignedAgent, jobTitle, title, company, companyName, name, firstName, lastName, ...body } = req.body;
    const normalizedBody = normalizeLeadWriteData(body);

    let finalFirstName = firstName;
    let finalLastName = lastName;

    if (!finalFirstName && !finalLastName && name) {
      const parts = name.trim().split(/\s+/);
      finalFirstName = parts[0] || '';
      finalLastName = parts.slice(1).join(' ') || '';
    }

    const lead = await prisma.lead.create({
      data: {
        ...normalizedBody,
        firstName: finalFirstName || 'Unknown',
        lastName: finalLastName || '',
        jobTitle: jobTitle || title || normalizedBody.jobTitle,
        company: company || companyName || normalizedBody.company,
        uploadedById: req.user!.id,
        pipelineStageId: pipelineStage || defaultStage?.id || undefined,
        assignedToId: assignedTo || undefined,
        status: 'New Lead',
        source: normalizedBody.source || 'manual',
      },
      include: LEAD_INCLUDE,
    });

    await prisma.activity.create({
      data: { leadId: lead.id, userId: req.user!.id, type: 'upload', description: `Lead created by ${req.user!.name}` },
    });

    emitLeadChangedToRoles('created', { leadId: lead.id });
    res.status(201).json(lead);
  } catch (err: any) {
    console.error('POST /api/leads error:', err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'A lead with this email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ PATCH /api/leads/:id ═══
router.patch('/:id', authenticateToken, checkPermission('leads', 'edit'), validate(updateLeadSchema), async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: (req.params.id as string) } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const role = req.user!.role;
    if ((role === 'sdr' || role === 'closer') &&
      lead.assignedToId !== req.user!.id &&
      lead.uploadedById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to edit this lead' });
    }

    const oldStatus = lead.status;
    const { pipelineStage, assignedTo, assignedAgent, jobTitle, title, company, companyName, name, firstName, lastName, ...updates } = req.body;
    const data: any = normalizeLeadWriteData(updates);

    if (jobTitle !== undefined || title !== undefined) data.jobTitle = jobTitle || title;
    if (company !== undefined || companyName !== undefined) data.company = company || companyName;

    if (name && !firstName && !lastName) {
      const parts = name.trim().split(/\s+/);
      data.firstName = parts[0] || '';
      data.lastName = parts.slice(1).join(' ') || '';
    } else {
      if (firstName !== undefined) data.firstName = firstName;
      if (lastName !== undefined) data.lastName = lastName;
    }

    // Handle assignment changes
    if (assignedTo && assignedTo !== lead.assignedToId) {
      data.assignedToId = assignedTo;
      data.assignedAt = new Date();
      if (lead.status === 'New Lead') data.status = 'In Progress';
    } else if (assignedAgent !== undefined) {
      if (assignedAgent) {
        const sdrUser = await prisma.user.findFirst({ where: { name: assignedAgent, role: 'sdr' } });
        if (sdrUser) {
          data.assignedToId = sdrUser.id;
          data.assignedAt = new Date();
          if (lead.status === 'New Lead') data.status = 'In Progress';
        }
      } else {
        data.assignedToId = null;
        data.assignedAt = null;
      }
    }

    if (pipelineStage) data.pipelineStageId = pipelineStage;

    // Status regression prevention
    const newStatus = data.status || oldStatus;
    if (data.status && data.status !== oldStatus) {
      const currentOrder = STATUS_ORDER[oldStatus] || 0;
      const newOrder = STATUS_ORDER[data.status] || 0;
      const allowRollbackToContacted = data.status === 'Contacted' && currentOrder > CONTACTED_STATUS_ORDER;
      if (newOrder < currentOrder && !allowRollbackToContacted) {
        return res.status(400).json({ error: `Cannot move status backward from "${oldStatus}" to "${data.status}"` });
      }
    }

    const assignmentChanged = Object.prototype.hasOwnProperty.call(data, 'assignedToId') && data.assignedToId !== lead.assignedToId;

    const updated = await prisma.lead.update({ where: { id: (req.params.id as string) }, data, include: LEAD_INCLUDE });

    if (data.status && data.status !== oldStatus) {
      await prisma.activity.create({
        data: {
          leadId: lead.id, userId: req.user!.id, type: 'status_change',
          fromStatus: oldStatus, toStatus: data.status,
          description: `Status changed from "${oldStatus}" to "${data.status}"`,
        },
      });
    }

    if (assignmentChanged) {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: req.user!.id,
          type: 'assignment',
          description: updated.assignedTo
            ? `Lead assigned to ${updated.assignedTo.name} by ${req.user!.name}`
            : `Lead unassigned by ${req.user!.name}`,
          metadata: { previousAssignee: lead.assignedToId, newAssignee: updated.assignedToId },
        },
      });
    }

    emitLeadChangedToRoles('updated', { leadId: lead.id, assignedUserId: updated.assignedToId });
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/leads/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ DELETE /api/leads/:id ═══
router.delete('/:id', authenticateToken, checkPermission('leads', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: (req.params.id as string) } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (req.user!.role === 'lead_gen' && lead.uploadedById !== req.user!.id) {
      return res.status(403).json({ error: 'You can only delete leads you uploaded' });
    }

    await permanentlyDeleteLeads([lead.id]);
    emitLeadChangedToRoles('deleted', { leadId: lead.id });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('DELETE /api/leads/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══ POST /api/leads/:id/assign ═══
router.post('/:id/assign', authenticateToken, checkPermission('leads', 'assign'), async (req: AuthRequest, res: Response) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ error: 'assignedTo is required' });

    const targetUser = await prisma.user.findUnique({ where: { id: assignedTo } });
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });
    if (!['sdr', 'closer'].includes(targetUser.role)) {
      return res.status(400).json({ error: 'Leads can only be assigned to SDRs or Closers' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: (req.params.id as string) } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const previousAssignee = lead.assignedToId;
    const updated = await prisma.lead.update({
      where: { id: (req.params.id as string) },
      data: { assignedToId: assignedTo, assignedAt: new Date() },
      include: LEAD_INCLUDE,
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id, userId: req.user!.id, type: 'assignment',
        description: `Lead assigned to ${targetUser.name} by ${req.user!.name}`,
        metadata: { previousAssignee, newAssignee: assignedTo },
      },
    });

    emitLeadChangedToRoles('assigned', { leadId: lead.id, assignedUserId: assignedTo });
    res.json(updated);
  } catch (err) {
    console.error('POST /api/leads/:id/assign error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ POST /api/leads/bulk-assign ═══
router.post('/bulk-assign', authenticateToken, checkPermission('leads', 'assign'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds, assignedTo, teamId, method } = req.body;
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    let assignees: string[] = [];
    if (method === 'round_robin' && teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId }, include: { members: { where: { isActive: true, role: { in: ['sdr', 'closer'] } }, select: { id: true } } } });
      if (!team) return res.status(404).json({ error: 'Team not found' });
      assignees = team.members.map(m => m.id);
      if (assignees.length === 0) return res.status(400).json({ error: 'No active SDRs/closers in this team' });
    } else if (assignedTo) {
      const targetUser = await prisma.user.findUnique({ where: { id: assignedTo } });
      if (!targetUser || !['sdr', 'closer'].includes(targetUser.role)) {
        return res.status(400).json({ error: 'Target user must be an SDR or Closer' });
      }
      assignees = [assignedTo];
    } else {
      return res.status(400).json({ error: 'Provide assignedTo or teamId+method' });
    }

    const results: any[] = [];
    for (let i = 0; i < leadIds.length; i++) {
      const targetId = assignees[i % assignees.length];
      try {
        await prisma.lead.update({ where: { id: leadIds[i] }, data: { assignedToId: targetId, assignedAt: new Date() } });
        results.push({ leadId: leadIds[i], assignedTo: targetId });
      } catch { /* skip missing leads */ }
    }

    if (results.length > 0) {
      await prisma.activity.createMany({
        data: results.map(r => ({
          leadId: r.leadId, userId: req.user!.id, type: 'assignment' as const,
          description: `Lead assigned via bulk assignment by ${req.user!.name}`,
          metadata: { newAssignee: r.assignedTo },
        })),
      });
    }

    emitLeadChangedToRoles('bulk_assigned', { count: results.length });
    res.json({ assigned: results.length, results });
  } catch (err) {
    console.error('POST /api/leads/bulk-assign error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ POST /api/leads/:id/unassign ═══
router.post('/:id/unassign', authenticateToken, checkPermission('leads', 'assign'), async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: (req.params.id as string) } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const previousAssignee = lead.assignedToId;
    const updated = await prisma.lead.update({
      where: { id: (req.params.id as string) },
      data: { assignedToId: null, assignedAt: null },
      include: LEAD_INCLUDE,
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id, userId: req.user!.id, type: 'assignment',
        description: `Lead unassigned by ${req.user!.name}`,
        metadata: { previousAssignee, newAssignee: null },
      },
    });

    emitLeadChangedToRoles('unassigned', { leadId: lead.id });
    res.json(updated);
  } catch (err) {
    console.error('POST /api/leads/:id/unassign error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ POST /api/leads/:id/complete-followup ═══
router.post('/:id/complete-followup', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: (req.params.id as string) } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && lead.assignedToId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to complete this follow-up' });
    }

    const followUp = await prisma.activity.findFirst({
      where: { leadId: lead.id, type: 'follow_up', isCompleted: false },
      orderBy: { scheduledAt: 'asc' },
    });

    if (followUp) {
      await prisma.activity.update({ where: { id: followUp.id }, data: { isCompleted: true, completedAt: new Date() } });
    }

    await prisma.lead.update({ where: { id: lead.id }, data: { nextFollowUp: null } });

    await prisma.activity.create({
      data: {
        leadId: lead.id, userId: req.user!.id, type: 'follow_up',
        description: `Follow-up completed by ${req.user!.name}`,
        isCompleted: true, completedAt: new Date(),
      },
    });

    emitLeadChangedToRoles('updated', { leadId: lead.id });
    res.json({ message: 'Follow-up completed' });
  } catch (err) {
    console.error('POST /api/leads/:id/complete-followup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ POST /api/leads/:id/schedule-followup ═══
router.post('/:id/schedule-followup', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid date format' });

    // Ensure follow-up is not in the past (allow today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (parsed < startOfToday) return res.status(400).json({ error: 'Follow-up date cannot be in the past' });

    const lead = await prisma.lead.findUnique({ where: { id: (req.params.id as string) } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const role = req.user!.role;
    if (role !== 'admin' && role !== 'manager' && lead.assignedToId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to schedule follow-ups for this lead' });
    }

    const activity = await prisma.activity.create({
      data: {
        leadId: lead.id, userId: req.user!.id, type: 'follow_up',
        description: `Follow-up scheduled for ${new Date(date).toLocaleDateString()}`,
        scheduledAt: new Date(date), isCompleted: false,
      },
    });

    await prisma.lead.update({ where: { id: lead.id }, data: { nextFollowUp: new Date(date) } });

    // Auto-promote to 'In Progress' if the lead is still a New Lead
    if (lead.status === 'New Lead') {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: 'In Progress' } });
      await prisma.activity.create({
        data: {
          leadId: lead.id, userId: req.user!.id, type: 'status_change',
          fromStatus: 'New Lead', toStatus: 'In Progress',
          description: 'Status auto-changed to "In Progress" after follow-up scheduled',
        },
      });
    }

    emitLeadChangedToRoles('updated', { leadId: lead.id });
    res.status(201).json(activity);
  } catch (err) {
    console.error('POST /api/leads/:id/schedule-followup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ POST /api/leads/bulk-delete ═══
router.post('/bulk-delete', authenticateToken, checkPermission('leads', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) return res.status(400).json({ error: 'leadIds array is required' });

    const { uniqueLeadIds, matchedLeadIds } = await resolveDeleteableLeadIds(req.user!, leadIds);
    if (matchedLeadIds.length !== uniqueLeadIds.length) {
      return res.status(403).json({ error: 'You can only delete leads you uploaded' });
    }

    const result = await permanentlyDeleteLeads(matchedLeadIds);

    emitLeadChangedToRoles('bulk_deleted', { count: result.deleted });
    res.json({ deleted: result.deleted });
  } catch (err) {
    console.error('POST /api/leads/bulk-delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══ POST /api/leads/import/preview ═══
router.post('/import/preview', authenticateToken, checkPermission('leads', 'upload'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { headers, rows } = parseFileToRows(req.file.buffer, req.file.originalname);

    const sampleRows: Record<string, string>[] = [];
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = rows[i][idx] || ''; });
      sampleRows.push(row);
    }

    let mappings: { csvHeader: string; crmField: string | null; confidence: string }[] = [];
    let mergeRules: { type: string; sourceHeaders: string[]; targetField: string }[] = [];
    try {
      const { mapColumns } = await import('../utils/csvColumnMapper.js');
      const result = mapColumns(headers);
      mappings = result.mappings;
      mergeRules = result.mergeRules || [];
    } catch {
      const basicFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'source', 'website', 'address', 'city', 'state', 'notes'];
      mappings = headers.map(h => {
        const lower = h.toLowerCase().replace(/[_\s]+/g, '');
        const match = basicFields.find(f => f.toLowerCase() === lower) || null;
        return { csvHeader: h, crmField: match, confidence: match ? 'exact' : 'unmapped' };
      });
    }

    const columnDistinctSets: Record<string, Set<string>> = {};
    headers.forEach((header) => {
      columnDistinctSets[header] = new Set<string>();
    });

    for (const values of rows) {
      headers.forEach((header, index) => {
        if (columnDistinctSets[header].size >= 25) return;
        const cleaned = cleanImportValue(values[index]);
        if (cleaned) {
          columnDistinctSets[header].add(cleaned);
        }
      });
    }

    const columnDistinctValues: Record<string, string[]> = {};
    for (const header of headers) {
      columnDistinctValues[header] = Array.from(columnDistinctSets[header]);
    }

    const statusHeaders = mappings
      .filter((mapping) => mapping.crmField === 'status')
      .map((mapping) => mapping.csvHeader);
    const statusValues = Array.from(new Set(
      statusHeaders.flatMap((header) => columnDistinctValues[header] || []),
    ));
    const statusSuggestionsByValue: Record<string, string | null> = {};
    statusValues.forEach((value) => {
      statusSuggestionsByValue[value] = resolveCanonicalImportStatus(value);
    });

    res.json({
      headers,
      totalRows: rows.length,
      sampleRows,
      mappings,
      mergeRules,
      columnDistinctValues,
      statusSuggestionsByValue,
    });
  } catch (err: any) {
    console.error('POST /api/leads/import/preview error:', err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// ═══ POST /api/leads/import ═══
router.post('/import', authenticateToken, checkPermission('leads', 'upload'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    console.log('[CSV IMPORT] Started by user:', req.user!.id, 'role:', req.user!.role, 'file:', req.file.originalname);

    const customMappings: Record<string, string | null> = req.body.customMappings ? JSON.parse(req.body.customMappings) : null;
    const statusValueMappingsRaw: Record<string, string> = req.body.statusValueMappings
      ? JSON.parse(req.body.statusValueMappings)
      : {};
    const statusValueMappings = buildStatusValueMappingLookup(statusValueMappingsRaw);

    const { headers, rows } = parseFileToRows(req.file.buffer, req.file.originalname);
    console.log('[CSV IMPORT] Parsed rows:', rows.length, 'headers:', headers);

    let fieldMap: Record<string, string | null> = {};
    if (customMappings) {
      fieldMap = customMappings;
    } else {
      try {
        const { mapColumns } = await import('../utils/csvColumnMapper.js');
        fieldMap = mapColumns(headers).headerMap;
      } catch {
        const basicFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'website', 'address', 'city', 'state', 'notes', 'assigned'];
        for (const h of headers) {
          const lower = h.toLowerCase().replace(/[_\s]+/g, '');
          fieldMap[h] = basicFields.find(f => f.toLowerCase() === lower) || null;
        }
      }
    }
    console.log('[CSV IMPORT] Field mapping:', JSON.stringify(fieldMap));

    const defaultStage = await getDefaultStage();
    if (!defaultStage) {
      console.warn('[CSV IMPORT] No default pipeline stage found. Leads will be imported without a stage.');
    }

    const errors: { row: number; error: string }[] = [];
    const emailsSeen = new Set<string>();
    let duplicatesInFile = 0;
    let duplicatesInDB = 0;
    let assignmentRowsIgnored = 0;
    let statusRowsDefaulted = 0;
    let statusRowsMapped = 0;
    const leadsToInsert: any[] = [];
    // Map from booking key (email or name) to booking info for post-insert meeting creation
    const bookingInfoMap = new Map<string, { bookedDate: string; bookedCallTime?: string; leadName: string }>();
    const canAssignImportedLeads = ['admin', 'manager', 'lead_gen'].includes(req.user!.role);

    const stagesByStatus = await prisma.pipelineStage.findMany({
      where: {
        isActive: true,
        name: { in: CANONICAL_LEAD_STATUSES },
      },
      select: { id: true, name: true },
    });
    const stageIdByStatus = new Map(stagesByStatus.map((stage) => [stage.name, stage.id]));

    // Mapper CRM field names → actual Prisma Lead field names
    const CRM_TO_PRISMA: Record<string, string> = {
      name: 'name', firstName: 'firstName', lastName: 'lastName',
      email: 'email', phone: 'phone',
      title: 'jobTitle', jobTitle: 'jobTitle',
      company: 'company', companyName: 'company',
      website: 'website', address: 'address', city: 'city', state: 'state',
      notes: 'notes', priority: 'priority', segment: 'segment',
      workDirectPhone: 'workDirectPhone', homePhone: 'homePhone',
      mobilePhone: 'mobilePhone', corporatePhone: 'corporatePhone',
      otherPhone: 'otherPhone', companyPhone: 'companyPhone',
      employeeCount: 'employeeCount', personLinkedinUrl: 'personLinkedinUrl',
      companyLinkedinUrl: 'companyLinkedinUrl',
      revenue: 'dealValue',
      bookedDate: 'bookedDate', bookedCallTime: 'bookedCallTime',
      assigned: 'assigned', assignedTo: 'assigned', owner: 'assigned',
    };

    // Pre-fetch active agents to map "assigned" column to user IDs
    const activeAgents = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true }
    });
    const agentMap = new Map<string, string>();
    activeAgents.forEach(a => {
      agentMap.set(a.name.toLowerCase().trim(), a.id);
      agentMap.set(a.email.toLowerCase().trim(), a.id);
    });

    for (let i = 0; i < rows.length; i++) {
      try {
        const values = rows[i];
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          const crmField = fieldMap[h];
          if (crmField) {
            const prismaField = CRM_TO_PRISMA[crmField] || crmField;
            const cleaned = cleanImportValue(values[idx]);
            if (cleaned) row[prismaField] = cleaned;
          }
        });

        const email = (row.email || '').toLowerCase().trim();
        const validEmail = email && email.includes('@') ? email : '';
        if (!validEmail && !row.firstName && !row.lastName && !row.name) {
          errors.push({ row: i + 2, error: 'Missing both email and name' }); continue;
        }
        if (validEmail) {
          if (emailsSeen.has(validEmail)) { duplicatesInFile++; continue; }
          emailsSeen.add(validEmail);
        }

        let firstName = row.firstName || '';
        let lastName = row.lastName || '';
        if (!firstName && !lastName && row.name) {
          const parts = row.name.split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }

        if (!firstName && !lastName && !validEmail) {
          errors.push({ row: i + 2, error: 'No usable name or email' }); continue;
        }

        const lead: any = {
          firstName: firstName || 'Unknown',
          lastName: lastName || '',
          email: validEmail || null,
          source: 'csv_upload',
          uploadedById: req.user!.id,
          status: 'New Lead',
          isDeleted: false,
        };

        if (defaultStage?.id) {
          lead.pipelineStageId = defaultStage.id;
        }

        if (row.status) {
          const mappedStatus = resolveCanonicalImportStatus(row.status, statusValueMappings);
          if (mappedStatus) {
            lead.status = mappedStatus;
            statusRowsMapped++;
            const mappedStageId = stageIdByStatus.get(mappedStatus);
            if (mappedStageId) {
              lead.pipelineStageId = mappedStageId;
            }
          } else {
            statusRowsDefaulted++;
          }
        }

        // Map all optional string fields from the row
        const optionalStrings = [
          'phone', 'company', 'jobTitle', 'website', 'address', 'city', 'state',
          'notes', 'priority', 'segment', 'workDirectPhone', 'homePhone',
          'mobilePhone', 'corporatePhone', 'otherPhone', 'companyPhone',
          'employeeCount', 'personLinkedinUrl', 'companyLinkedinUrl',
        ];
        for (const f of optionalStrings) {
          if (row[f]) lead[f] = row[f];
        }
        if (row.dealValue) {
          const num = parseFloat(row.dealValue.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) lead.dealValue = num;
        }

        // Auto-populate generic phone field for search compatibility
        if (!lead.phone) {
          lead.phone = lead.workDirectPhone || lead.mobilePhone || lead.homePhone
            || lead.corporatePhone || lead.companyPhone || lead.otherPhone || null;
        }

        // Handle booked date/time → sets Appointment Set status and queues meeting creation
        if (row.bookedDate) {
          lead.status = 'Appointment Set';
          const apptStageId = stageIdByStatus.get('Appointment Set');
          if (apptStageId) lead.pipelineStageId = apptStageId;
          const bookingKey = (lead.email || `${lead.firstName}_${lead.lastName}`).toLowerCase();
          bookingInfoMap.set(bookingKey, {
            bookedDate: row.bookedDate,
            bookedCallTime: row.bookedCallTime || undefined,
            leadName: `${lead.firstName} ${lead.lastName}`.trim(),
          });
          // Remove from lead data — not Prisma fields
          delete row.bookedDate;
          delete row.bookedCallTime;
        }

        // Resolving 'assigned' user string
        if (row.assigned) {
          if (canAssignImportedLeads) {
            const matchedId = agentMap.get(row.assigned.toLowerCase().trim());
            if (matchedId) {
              lead.assignedToId = matchedId;
              lead.assignedAt = new Date();
            }
          } else {
            assignmentRowsIgnored++;
          }
        }

        leadsToInsert.push(lead);
      } catch (rowErr) {
        errors.push({ row: i + 2, error: 'Failed to parse row' });
      }
    }

    console.log('[CSV IMPORT] Valid leads after cleaning:', leadsToInsert.length, 'errors:', errors.length);
    if (leadsToInsert.length > 0) {
      console.log('[CSV IMPORT] Sample lead:', JSON.stringify(leadsToInsert[0], null, 2));
    }

    if (leadsToInsert.length === 0) {
      return res.status(400).json({
        error: 'No valid leads found in the file',
        totalRows: rows.length,
        imported: 0,
        skipped: duplicatesInFile,
        errors: errors.length,
        errorDetails: errors,
      });
    }

    // Deduplicate against DB
    const emailsToCheck = leadsToInsert.filter(l => l.email).map(l => l.email);
    if (emailsToCheck.length > 0) {
      const existing: Array<{ email: string | null }> = [];
      const emailChunks = chunkArray(emailsToCheck, IMPORT_DEDUPE_CHUNK_SIZE);

      for (const emailChunk of emailChunks) {
        const existingChunk = await prisma.lead.findMany({
          where: {
            email: { in: emailChunk },
            isDeleted: false,
          },
          select: { email: true },
        });
        existing.push(...existingChunk);
      }

      const existingEmails = new Set(existing.map(e => e.email));
      const filtered = leadsToInsert.filter(l => {
        if (l.email && existingEmails.has(l.email)) { duplicatesInDB++; return false; }
        return true;
      });
      leadsToInsert.length = 0;
      leadsToInsert.push(...filtered);
    }

    let createdCount = 0;
    let createdLeadIds: string[] = [];
    if (leadsToInsert.length > 0) {
      try {
        const insertChunks = chunkArray(leadsToInsert, IMPORT_INSERT_CHUNK_SIZE);
        console.log('[CSV IMPORT] Insert chunks:', insertChunks.length, 'chunkSize:', IMPORT_INSERT_CHUNK_SIZE);

        const createdLeads: Array<{ id: string }> = [];
        for (let chunkIndex = 0; chunkIndex < insertChunks.length; chunkIndex++) {
          const insertChunk = insertChunks[chunkIndex];
          const createdChunk = await prisma.lead.createManyAndReturn({
            data: insertChunk,
            select: { id: true },
          });
          createdLeads.push(...createdChunk);
          console.log('[CSV IMPORT] Inserted chunk', chunkIndex + 1, 'of', insertChunks.length, '- created:', createdChunk.length);
        }

        createdLeadIds = createdLeads.map((lead) => lead.id);
        createdCount = createdLeadIds.length;
        console.log('[CSV IMPORT] ✅ Created:', createdCount, 'leads');

        // Create meetings for leads imported with a Booked Date
        if (bookingInfoMap.size > 0) {
          try {
            const emailKeys = [...bookingInfoMap.keys()].filter(k => k.includes('@'));
            const nameKeys = [...bookingInfoMap.keys()].filter(k => !k.includes('@'));
            const leadsWithBookings: Array<{ id: string; firstName: string; lastName: string; company: string | null; email: string | null }> = [];
            if (emailKeys.length > 0) {
              const found = await prisma.lead.findMany({
                where: { id: { in: createdLeadIds }, email: { in: emailKeys } },
                select: { id: true, firstName: true, lastName: true, company: true, email: true },
              });
              leadsWithBookings.push(...found);
            }
            if (nameKeys.length > 0) {
              const noEmailLeads = await prisma.lead.findMany({
                where: { id: { in: createdLeadIds }, email: null },
                select: { id: true, firstName: true, lastName: true, company: true, email: true },
              });
              for (const l of noEmailLeads) {
                const nameKey = `${l.firstName}_${l.lastName}`.toLowerCase();
                if (nameKeys.includes(nameKey)) leadsWithBookings.push(l);
              }
            }
            for (const l of leadsWithBookings) {
              const key = (l.email || `${l.firstName}_${l.lastName}`).toLowerCase();
              const booking = bookingInfoMap.get(key);
              if (!booking) continue;
              const dateStr = booking.bookedDate.trim();
              const timeStr = (booking.bookedCallTime || '09:00').trim().slice(0, 5);
              let scheduledAt: Date | null = null;
              try {
                const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (isoMatch) {
                  scheduledAt = new Date(`${dateStr}T${timeStr}`);
                } else if (usMatch) {
                  scheduledAt = new Date(`${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}T${timeStr}`);
                } else {
                  scheduledAt = new Date(dateStr);
                }
              } catch { scheduledAt = null; }
              if (!scheduledAt || isNaN(scheduledAt.getTime())) {
                console.warn('[CSV IMPORT] Could not parse booked date:', booking.bookedDate, 'for lead:', l.id);
                continue;
              }
              const leadFullName = `${l.firstName} ${l.lastName}`.trim() || l.company || 'Lead';
              await prisma.meeting.create({
                data: {
                  leadId: l.id,
                  leadName: leadFullName,
                  title: `Appointment – ${leadFullName}`,
                  scheduledAt,
                  time: timeStr,
                  type: 'call',
                  status: 'scheduled',
                  createdById: req.user!.id,
                  createdByName: req.user!.name,
                  description: booking.bookedCallTime ? `Booked call at ${booking.bookedCallTime}` : '',
                },
              });
              await prisma.activity.create({
                data: {
                  leadId: l.id,
                  userId: req.user!.id,
                  type: 'meeting',
                  description: `Appointment scheduled via CSV import for ${scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${booking.bookedCallTime ? ` at ${booking.bookedCallTime}` : ''}`,
                },
              });
            }
            console.log('[CSV IMPORT] ✅ Created meetings for', leadsWithBookings.length, 'leads');
          } catch (meetingErr) {
            console.error('[CSV IMPORT] ⚠️ Failed to create some meetings:', meetingErr);
          }
        }
      } catch (dbErr: any) {
        console.error('[CSV IMPORT] ❌ createMany failed:', dbErr.code, dbErr.meta, dbErr.message);
        if (dbErr.code === 'P2002') {
          return res.status(400).json({ error: 'Duplicate leads detected. Some leads already exist.' });
        }
        if (dbErr.code === 'P2003') {
          return res.status(400).json({ error: 'Foreign key error — check that pipeline stage and user IDs are valid.' });
        }
        if (dbErr.code === 'P2000') {
          return res.status(400).json({ error: 'Data too long for one or more fields. Check CSV for overly long values.' });
        }
        return res.status(500).json({ error: 'Database error: ' + (dbErr.message || 'Unknown error') });
      }
    }

    emitLeadChangedToRoles('bulk_created', { count: createdCount });
    const warnings: string[] = [];
    if (assignmentRowsIgnored > 0) {
      warnings.push(`Ignored assignment values in ${assignmentRowsIgnored} row(s) because your role cannot assign leads.`);
    }
    if (statusRowsDefaulted > 0) {
      warnings.push(`Could not map status in ${statusRowsDefaulted} row(s); defaulted to "New Lead".`);
    }
    if (statusRowsMapped > 0) {
      warnings.push(`Mapped status values for ${statusRowsMapped} row(s).`);
    }

    res.json({
      totalRows: rows.length,
      imported: createdCount,
      created: createdCount,
      createdLeadIds,
      canUndoImport: createdLeadIds.length > 0,
      skipped: duplicatesInFile + duplicatesInDB,
      duplicatesInFile,
      duplicatesInDB,
      errors: errors.length,
      errorDetails: errors,
      warnings,
    });
  } catch (err: any) {
    console.error('[CSV IMPORT] ❌ FULL ERROR:', err);
    res.status(400).json({ error: err.message || 'Server error' });
  }
});

// ═══ POST /api/leads/import/undo ═══
router.post('/import/undo', authenticateToken, checkPermission('leads', 'upload'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    const { uniqueLeadIds, matchedLeadIds } = await resolveDeleteableLeadIds(req.user!, leadIds, {
      requireCsvUpload: true,
      requireOwnUpload: req.user!.role !== 'admin',
    });

    if (matchedLeadIds.length !== uniqueLeadIds.length) {
      return res.status(403).json({ error: 'You can only undo your own imported leads' });
    }

    const result = await permanentlyDeleteLeads(matchedLeadIds);

    emitLeadChangedToRoles('bulk_deleted', { count: result.deleted });
    res.json({ deleted: result.deleted });
  } catch (err) {
    console.error('POST /api/leads/import/undo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
