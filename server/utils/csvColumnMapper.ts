/**
 * Robust CSV Column Mapper
 *
 * Maps arbitrary spreadsheet column headers to Lead model fields using:
 *  1. Exact synonym dictionary (100+ entries)
 *  2. Partial / substring matching
 *  3. Levenshtein edit-distance fuzzy matching
 *  4. First-name + Last-name auto-merge detection
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type MatchConfidence = 'exact' | 'partial' | 'fuzzy' | 'unmapped';

export interface ColumnMapping {
    csvHeader: string;
    crmField: string | null;
    confidence: MatchConfidence;
}

export interface MergeRule {
    type: 'name';
    sourceHeaders: string[];   // e.g. ['First Name', 'Last Name']
    targetField: string;       // 'name'
}

export interface MappingResult {
    mappings: ColumnMapping[];
    headerMap: Record<string, string | null>;
    unmapped: string[];
    mergeRules: MergeRule[];
}

// ─── Valid model fields ─────────────────────────────────────────────────────

export const VALID_LEAD_FIELDS = [
    'firstName', 'lastName', 'phone',
    'date', 'source', 'name', 'title', 'companyName', 'email',
    'workDirectPhone', 'homePhone', 'mobilePhone', 'corporatePhone',
    'otherPhone', 'companyPhone', 'employeeCount', 'personLinkedinUrl',
    'website', 'companyLinkedinUrl', 'address', 'city', 'state',
    'status', 'assignedAgent', 'notes', 'nextFollowUp',
    'priority', 'segment', 'sourceChannel', 'revenue',
    'bookedDate', 'bookedCallTime',
] as const;

// ─── Synonym Dictionary (lowercase, stripped of special chars) ──────────────
//
// Keys are normalised column names.  Values are model field names.
// Phone fields are SPECIFICALLY mapped to their distinct types.

export const SYNONYM_MAP: Record<string, string> = {
    // ── Date ───────────────────────────────────────────────────────────────
    'date': 'date',
    'added date': 'date',
    'created': 'date',
    'created date': 'date',
    'date added': 'date',
    'date created': 'date',
    'creation date': 'date',
    'entry date': 'date',

    // ── Source ─────────────────────────────────────────────────────────────
    'source': 'source',
    'lead source': 'source',
    'origin': 'source',
    'channel': 'sourceChannel',
    'source channel': 'sourceChannel',
    'marketing channel': 'sourceChannel',
    'acquisition channel': 'sourceChannel',

    // ── Name ───────────────────────────────────────────────────────────────
    'name': 'name',
    'full name': 'name',
    'fullname': 'name',
    'contact name': 'name',
    'lead name': 'name',
    'prospect name': 'name',
    'contact': 'name',
    'person': 'name',
    'person name': 'name',
    'poc': 'name',
    'point of contact': 'name',
    'decision maker': 'name',
    'prospect': 'name',
    'lead': 'name',
    'contact person': 'name',
    'customer name': 'name',

    // Special: first/last handled via merge rules, but map individually too
    'first name': '__firstName',
    'firstname': '__firstName',
    'first': '__firstName',
    'given name': '__firstName',
    'last name': '__lastName',
    'lastname': '__lastName',
    'last': '__lastName',
    'surname': '__lastName',
    'family name': '__lastName',

    // ── Title ──────────────────────────────────────────────────────────────
    'title': 'title',
    'job title': 'title',
    'position': 'title',
    'role': 'title',
    'designation': 'title',
    'job function': 'title',
    'occupation': 'title',
    'seniority': 'title',
    'job role': 'title',
    'job position': 'title',

    // ── Company ────────────────────────────────────────────────────────────
    'company name': 'companyName',
    'company': 'companyName',
    'companyname': 'companyName',
    'organization': 'companyName',
    'organisation': 'companyName',
    'org': 'companyName',
    'firm': 'companyName',
    'employer': 'companyName',
    'agency name': 'companyName',
    'agency': 'companyName',
    'business name': 'companyName',
    'business': 'companyName',
    'account name': 'companyName',
    'account': 'companyName',
    'client name': 'companyName',
    'client': 'companyName',
    'brand': 'companyName',
    'brand name': 'companyName',
    'customer': 'companyName',
    'vendor': 'companyName',
    'vendor name': 'companyName',
    'institution': 'companyName',
    'entity': 'companyName',
    'entity name': 'companyName',
    'corporate name': 'companyName',

    // ── Email ──────────────────────────────────────────────────────────────
    'email': 'email',
    'email address': 'email',
    'emailaddress': 'email',
    'e-mail': 'email',
    'e mail': 'email',
    'mail': 'email',
    'email id': 'email',
    'contact email': 'email',
    'work email': 'email',
    'business email': 'email',
    'personal email': 'email',

    // ── Work Direct Phone (primary phone) ─────────────────────────────────
    'work direct phone': 'workDirectPhone',
    'work phone': 'workDirectPhone',
    'direct phone': 'workDirectPhone',
    'office phone': 'workDirectPhone',
    'business phone': 'workDirectPhone',
    'phone': 'workDirectPhone',
    'phone number': 'workDirectPhone',
    'telephone': 'workDirectPhone',
    'tel': 'workDirectPhone',
    'direct dial': 'workDirectPhone',
    'direct line': 'workDirectPhone',
    'work number': 'workDirectPhone',
    'work tel': 'workDirectPhone',
    'desk phone': 'workDirectPhone',
    'office number': 'workDirectPhone',
    'office line': 'workDirectPhone',
    'main phone': 'workDirectPhone',
    'primary phone': 'workDirectPhone',
    'contact phone': 'workDirectPhone',
    'contact number': 'workDirectPhone',
    'daytime phone': 'workDirectPhone',

    // ── Home Phone ─────────────────────────────────────────────────────────
    'home phone': 'homePhone',
    'home phone number': 'homePhone',
    'home number': 'homePhone',
    'home tel': 'homePhone',
    'residence phone': 'homePhone',
    'personal phone': 'homePhone',
    'personal number': 'homePhone',
    'evening phone': 'homePhone',

    // ── Mobile Phone ───────────────────────────────────────────────────────
    'mobile phone': 'mobilePhone',
    'mobile': 'mobilePhone',
    'mobile number': 'mobilePhone',
    'cell': 'mobilePhone',
    'cell phone': 'mobilePhone',
    'cellphone': 'mobilePhone',
    'cell number': 'mobilePhone',
    'cellular': 'mobilePhone',
    'cellular phone': 'mobilePhone',
    'mobile tel': 'mobilePhone',
    'smartphone': 'mobilePhone',
    'whatsapp': 'mobilePhone',
    'whatsapp number': 'mobilePhone',
    'sms': 'mobilePhone',
    'sms number': 'mobilePhone',
    'text number': 'mobilePhone',

    // ── Corporate Phone ────────────────────────────────────────────────────
    'corporate phone': 'corporatePhone',
    'corporate number': 'corporatePhone',
    'corporate tel': 'corporatePhone',
    'corporate line': 'corporatePhone',
    'hq phone': 'corporatePhone',
    'headquarters phone': 'corporatePhone',
    'head office phone': 'corporatePhone',
    'switchboard': 'corporatePhone',

    // ── Other Phone ────────────────────────────────────────────────────────
    'other phone': 'otherPhone',
    'other number': 'otherPhone',
    'alt phone': 'otherPhone',
    'alternate phone': 'otherPhone',
    'alternative phone': 'otherPhone',
    'secondary phone': 'otherPhone',
    'second phone': 'otherPhone',
    'fax': 'otherPhone',
    'fax number': 'otherPhone',

    // ── Company Phone ─────────────────────────────────────────────────────
    'company phone': 'companyPhone',
    'company number': 'companyPhone',
    'company tel': 'companyPhone',
    'company line': 'companyPhone',
    'business line': 'companyPhone',
    'org phone': 'companyPhone',
    'organization phone': 'companyPhone',

    // ── Employee Count ─────────────────────────────────────────────────────
    'employees': 'employeeCount',
    'employee count': 'employeeCount',
    'employeecount': 'employeeCount',
    '# employees': 'employeeCount',
    'number of employees': 'employeeCount',
    'num employees': 'employeeCount',
    'company size': 'employeeCount',
    'company size est': 'employeeCount',
    'company size estimated': 'employeeCount',
    'headcount': 'employeeCount',
    'staff count': 'employeeCount',
    'team size': 'employeeCount',
    'total employees': 'employeeCount',
    'no of employees': 'employeeCount',

    // ── LinkedIn ───────────────────────────────────────────────────────────
    'person linkedin url': 'personLinkedinUrl',
    'linkedin': 'personLinkedinUrl',
    'linkedin url': 'personLinkedinUrl',
    'linkedin profile': 'personLinkedinUrl',
    'personal linkedin': 'personLinkedinUrl',
    'contact linkedin': 'personLinkedinUrl',
    'linkedin link': 'personLinkedinUrl',
    'linkedin page': 'personLinkedinUrl',

    'company linkedin url': 'companyLinkedinUrl',
    'company linkedin': 'companyLinkedinUrl',
    'org linkedin': 'companyLinkedinUrl',
    'business linkedin': 'companyLinkedinUrl',
    'organization linkedin': 'companyLinkedinUrl',

    // ── Website ────────────────────────────────────────────────────────────
    'website': 'website',
    'company website': 'website',
    'website link': 'website',
    'web link': 'website',
    'url': 'website',
    'web': 'website',
    'site': 'website',
    'webpage': 'website',
    'web url': 'website',
    'homepage': 'website',
    'domain': 'website',
    'company url': 'website',
    'company domain': 'website',

    // ── Address ────────────────────────────────────────────────────────────
    'address': 'address',
    'street': 'address',
    'street address': 'address',
    'address line 1': 'address',
    'address line': 'address',
    'full address': 'address',
    'mailing address': 'address',
    'location': 'address',
    'company address': 'address',
    'headquarters': 'address',
    'hq': 'address',
    'zip': 'address',
    'zip code': 'address',
    'zipcode': 'address',
    'postal code': 'address',
    'postcode': 'address',

    // ── City ───────────────────────────────────────────────────────────────
    'city': 'city',
    'town': 'city',
    'metro': 'city',
    'metro area': 'city',
    'municipality': 'city',

    // ── State ──────────────────────────────────────────────────────────────
    'state': 'state',
    'province': 'state',
    'region': 'state',
    'county': 'state',
    'country': 'state',
    'area': 'state',
    'territory': 'state',
    'state province': 'state',
    'state/province': 'state',

    // ── Status ─────────────────────────────────────────────────────────────
    'status': 'status',
    'lead status': 'status',
    'stage': 'status',
    'pipeline stage': 'status',
    'deal stage': 'status',
    'funnel stage': 'status',

    // ── Assigned Agent ─────────────────────────────────────────────────────
    'assigned': 'assignedAgent',
    'assigned agent': 'assignedAgent',
    'agent': 'assignedAgent',
    'owner': 'assignedAgent',
    'rep': 'assignedAgent',
    'sales rep': 'assignedAgent',
    'account owner': 'assignedAgent',
    'account manager': 'assignedAgent',
    'assigned to': 'assignedAgent',
    'assigned rep': 'assignedAgent',
    'bdm': 'assignedAgent',
    'sdr': 'assignedAgent',
    'salesperson': 'assignedAgent',

    // ── Notes ──────────────────────────────────────────────────────────────
    'notes': 'notes',
    'note': 'notes',
    'comments': 'notes',
    'comment': 'notes',
    'description': 'notes',
    'remarks': 'notes',
    'remark': 'notes',
    'memo': 'notes',
    'additional info': 'notes',
    'additional information': 'notes',
    'details': 'notes',

    // ── Follow-up / Booked Date ────────────────────────────────────────────
    'follow-up date': 'nextFollowUp',
    'follow up date': 'nextFollowUp',
    'followup': 'nextFollowUp',
    'next follow up': 'nextFollowUp',
    'followup date': 'nextFollowUp',
    'next contact date': 'nextFollowUp',
    'callback date': 'nextFollowUp',
    'reminder date': 'nextFollowUp',
    'next action date': 'nextFollowUp',
    'booked date': 'bookedDate',
    'booking date': 'bookedDate',
    'appointment date': 'bookedDate',
    'scheduled date': 'bookedDate',
    'call date': 'bookedDate',

    // ── Booked Call Time ────────────────────────────────────────────────────
    'booked call time': 'bookedCallTime',
    'booked time': 'bookedCallTime',
    'call time': 'bookedCallTime',
    'appointment time': 'bookedCallTime',
    'scheduled time': 'bookedCallTime',
    'booking time': 'bookedCallTime',

    // ── Revenue / Deal Value ───────────────────────────────────────────────
    'revenue': 'revenue',
    'deal value': 'revenue',
    'deal size': 'revenue',
    'contract value': 'revenue',
    'annual revenue': 'revenue',
    'arr': 'revenue',
    'mrr': 'revenue',
    'value': 'revenue',
    'amount': 'revenue',
    'opportunity value': 'revenue',

    // ── Priority ───────────────────────────────────────────────────────────
    'priority': 'priority',
    'tier': 'priority',
    'lead score': 'priority',
    'lead grade': 'priority',
    'rating': 'priority',
    'importance': 'priority',
    'urgency': 'priority',

    // ── Segment / Industry ─────────────────────────────────────────────────
    'segment': 'segment',
    'industry': 'segment',
    'sector': 'segment',
    'vertical': 'segment',
    'niche': 'segment',
    'market': 'segment',
    'department': 'segment',
    'business type': 'segment',
    'company type': 'segment',
    'industry vertical': 'segment',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalise a raw header: lowercase, strip non-alphanumeric (keep spaces), collapse whitespace */
export function normalizeHeader(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Levenshtein edit distance between two strings */
export function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Try to fuzzy-match `input` against all synonym keys.
 * Returns the best match if edit distance ≤ threshold (default: 2).
 */
function fuzzyMatchSynonym(input: string, threshold = 2): { field: string; confidence: MatchConfidence } | null {
    let bestField: string | null = null;
    let bestDist = Infinity;

    for (const [synonym, field] of Object.entries(SYNONYM_MAP)) {
        // Skip internal merge markers
        if (field.startsWith('__')) continue;

        const dist = levenshtein(input, synonym);
        if (dist < bestDist && dist <= threshold) {
            bestDist = dist;
            bestField = field;
        }
    }

    return bestField ? { field: bestField, confidence: 'fuzzy' } : null;
}

/**
 * Partial / substring matching for critical fields.
 * Handles cases where a column contains a known keyword.
 *
 * Phone fields are matched SPECIFICALLY — each phone type detects its own
 * distinguishing keywords before falling through to a generic phone match.
 */
function partialMatchField(clean: string, noSpace: string): string | null {
    // Email
    if (clean.includes('email') || clean.includes('e mail')) return 'email';

    // Company (must check before generic 'name')
    if (
        clean.includes('company') && (clean.includes('name') || noSpace === 'company') ||
        clean.includes('agency') || clean.includes('business name') ||
        clean.includes('account name') || clean.includes('client name') ||
        clean.includes('brand name') || clean.includes('organisation') ||
        clean.includes('organization')
    ) return 'companyName';

    // Name
    if (clean.includes('name') || clean.includes('contact') || clean.includes('prospect')) return 'name';

    // Title
    if (clean.includes('title') || clean.includes('position') || clean.includes('designation')) return 'title';

    // ── Phone fields (specific before generic) ─────────────────────────────

    // Mobile
    if (clean.includes('mobile') || clean.includes('cell') || clean.includes('cellular') || clean.includes('whatsapp') || clean.includes('sms')) return 'mobilePhone';

    // Home
    if ((clean.includes('home') || clean.includes('residence') || clean.includes('evening') || clean.includes('personal')) && (clean.includes('phone') || clean.includes('number') || clean.includes('tel'))) return 'homePhone';

    // Corporate
    if ((clean.includes('corporate') || clean.includes('hq') || clean.includes('headquarters') || clean.includes('switchboard') || clean.includes('head office')) && (clean.includes('phone') || clean.includes('number') || clean.includes('tel') || clean.includes('line'))) return 'corporatePhone';

    // Company Phone
    if ((clean.includes('company') || clean.includes('org')) && (clean.includes('phone') || clean.includes('number') || clean.includes('tel') || clean.includes('line'))) return 'companyPhone';

    // Other Phone
    if ((clean.includes('other') || clean.includes('alt') || clean.includes('alternate') || clean.includes('secondary') || clean.includes('fax')) && (clean.includes('phone') || clean.includes('number') || clean.includes('tel'))) return 'otherPhone';

    // Generic phone → workDirectPhone (only after all specific types checked)
    if (clean.includes('phone') || clean.includes('tel') || clean.includes('dial') || clean.includes('direct')) return 'workDirectPhone';

    // LinkedIn
    if (clean.includes('linkedin')) {
        return clean.includes('company') || clean.includes('org') || clean.includes('business')
            ? 'companyLinkedinUrl'
            : 'personLinkedinUrl';
    }

    // Website
    if (clean.includes('website') || clean.includes('domain') || clean.includes('homepage')) return 'website';
    if (clean.includes('url') || clean.includes('web')) return 'website';

    // Address
    if (clean.includes('address') || clean.includes('street')) return 'address';
    if (clean.includes('zip') || clean.includes('postal') || clean.includes('postcode')) return 'address';

    // City
    if (clean.includes('city') || clean.includes('town') || clean.includes('metro')) return 'city';

    // State
    if (clean.includes('state') || clean.includes('province') || clean.includes('region') || clean.includes('county') || clean.includes('country') || clean.includes('territory')) return 'state';

    // Employee Count
    if (clean.includes('employee') || clean.includes('headcount') || clean.includes('staff')) return 'employeeCount';
    if (clean.includes('size') && (clean.includes('company') || clean.includes('org') || clean.includes('team'))) return 'employeeCount';

    // Notes
    if (clean.includes('note') || clean.includes('comment') || clean.includes('remark') || clean.includes('memo')) return 'notes';

    // Status
    if (clean.includes('status') || clean.includes('stage') || clean.includes('funnel') || clean.includes('pipeline')) return 'status';

    // Assigned Agent
    if (clean.includes('agent') || clean.includes('owner') || clean.includes('rep') || clean.includes('assign') || clean.includes('sdr') || clean.includes('bdm') || clean.includes('salesperson')) return 'assignedAgent';

    // Revenue
    if (clean.includes('revenue') || clean.includes('deal value') || clean.includes('contract value') || clean.includes('amount') || clean.includes('arr') || clean.includes('mrr')) return 'revenue';

    // Priority
    if (clean.includes('priority') || clean.includes('tier') || clean.includes('lead score') || clean.includes('lead grade') || clean.includes('rating')) return 'priority';

    // Segment / Industry
    if (clean.includes('industry') || clean.includes('sector') || clean.includes('vertical') || clean.includes('segment') || clean.includes('niche')) return 'segment';

    // Follow-up
    if (clean.includes('follow') || clean.includes('callback') || clean.includes('reminder')) return 'nextFollowUp';

    // Booked Date
    if (clean.includes('booked') && (clean.includes('date') || clean.includes('appoint') || clean.includes('sched'))) return 'bookedDate';
    if (clean.includes('appointment') && clean.includes('date')) return 'bookedDate';

    // Booked Call Time
    if (clean.includes('booked') && (clean.includes('time') || clean.includes('call'))) return 'bookedCallTime';
    if (clean.includes('appointment') && clean.includes('time')) return 'bookedCallTime';

    // Source
    if (clean.includes('source') || clean.includes('origin')) return 'source';

    // Date
    if (clean.includes('date') && (clean.includes('added') || clean.includes('created') || clean.includes('creation') || clean.includes('entry'))) return 'date';

    return null;
}

// ─── Main Mapping Function ──────────────────────────────────────────────────

/**
 * Map an array of raw CSV headers to Lead model fields.
 *
 * Strategy (in order):
 *  1. Exact match in SYNONYM_MAP
 *  2. No-space version match in SYNONYM_MAP
 *  3. Exact schema field name match
 *  4. Partial / substring keyword match
 *  5. Levenshtein fuzzy match (≤2 edits)
 *  6. Unmapped → goes to notes
 */
export function mapColumns(headers: string[]): MappingResult {
    const mappings: ColumnMapping[] = [];
    const headerMap: Record<string, string | null> = {};
    const unmapped: string[] = [];
    const mergeRules: MergeRule[] = [];
    const usedFields = new Set<string>();

    // First pass: detect firstName / lastName for merge
    let firstNameHeader: string | null = null;
    let lastNameHeader: string | null = null;
    let hasNameColumn = false;

    for (const h of headers) {
        const clean = normalizeHeader(h);
        const noSpace = clean.replace(/\s/g, '');

        const directMatch = SYNONYM_MAP[clean] || SYNONYM_MAP[noSpace];
        if (directMatch === '__firstName') firstNameHeader = h;
        if (directMatch === '__lastName') lastNameHeader = h;
        if (directMatch === 'name') hasNameColumn = true;
    }

    // If we have first+last but no name column, create a merge rule
    if (firstNameHeader && lastNameHeader && !hasNameColumn) {
        mergeRules.push({
            type: 'name',
            sourceHeaders: [firstNameHeader, lastNameHeader],
            targetField: 'name',
        });
    }

    // Second pass: map every header
    for (const h of headers) {
        if (!h.trim()) continue;

        const clean = normalizeHeader(h);
        const noSpace = clean.replace(/\s/g, '');

        // 1. Exact match in synonym map
        let field = SYNONYM_MAP[clean] || SYNONYM_MAP[noSpace] || null;
        let confidence: MatchConfidence = field ? 'exact' : 'unmapped';

        // Handle internal merge markers — always map to individual fields
        if (field === '__firstName' || field === '__lastName') {
            field = field === '__firstName' ? 'firstName' : 'lastName';
            confidence = 'exact';
        }

        // 2. Exact schema field name match
        if (!field) {
            const schemaMatch = VALID_LEAD_FIELDS.find(f => f.toLowerCase() === noSpace);
            if (schemaMatch) {
                field = schemaMatch;
                confidence = 'exact';
            }
        }

        // 3. Partial / substring match
        if (!field) {
            const partial = partialMatchField(clean, noSpace);
            if (partial) {
                field = partial;
                confidence = 'partial';
            }
        }

        // 4. Levenshtein fuzzy match
        if (!field) {
            const fuzzy = fuzzyMatchSynonym(clean);
            if (fuzzy) {
                field = fuzzy.field;
                confidence = fuzzy.confidence;
            }
        }

        // Avoid double-mapping the same CRM field (first occurrence wins)
        if (field && usedFields.has(field)) {
            // Allow multiple unmapped to notes, but skip duplicate field mappings
            // Exception: phone fields — if already used, try next best phone type
            field = null;
            confidence = 'unmapped';
        }

        if (field) usedFields.add(field);

        mappings.push({ csvHeader: h, crmField: field, confidence });
        headerMap[h] = field;
        if (!field && confidence === 'unmapped') unmapped.push(h);
    }

    return { mappings, headerMap, unmapped, mergeRules };
}

/**
 * Apply merge rules to a single row.
 * Returns the processed row with merged fields.
 */
export function applyMergeRules(
    row: Record<string, string>,
    mergeRules: MergeRule[],
): Record<string, string> {
    const merged = { ...row };

    for (const rule of mergeRules) {
        if (rule.type === 'name') {
            const parts = rule.sourceHeaders
                .map(h => (row[h] || '').trim())
                .filter(Boolean);
            if (parts.length > 0) {
                merged[rule.targetField] = parts.join(' ');
            }
        }
    }

    return merged;
}
