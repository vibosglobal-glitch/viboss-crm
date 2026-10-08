const STATUS_ALIASES: Record<string, string[]> = {
  'new lead': ['new lead'],
  'in progress': ['in progress', 'working'],
  contacted: ['contacted', 'connected'],
  'appointment set': ['appointment set', 'meeting booked'],
  'active account': ['active account', 'closed won', 'active account (closed won)'],
};

function normalizeStatus(status?: string | null) {
  return String(status || '').trim().toLowerCase();
}

export function matchesLeadStatus(rawStatus: string | null | undefined, targetStatus: string) {
  const normalizedStatus = normalizeStatus(rawStatus);
  const normalizedTarget = normalizeStatus(targetStatus);
  const aliases = STATUS_ALIASES[normalizedTarget] || [normalizedTarget];
  return aliases.includes(normalizedStatus);
}

export function countLeadsByStatus<T extends { status?: string | null }>(leads: T[], targetStatus: string) {
  return leads.filter((lead) => matchesLeadStatus(lead.status, targetStatus)).length;
}

export function getLeadActivityDate(lead: {
  updatedAt?: Date | string | null;
  lastActivity?: Date | string | null;
  createdAt?: Date | string | null;
  date?: Date | string | null;
}) {
  return lead.updatedAt || lead.lastActivity || lead.createdAt || lead.date || null;
}