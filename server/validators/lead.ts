import { z } from 'zod';

const sanitizeOptionalText = (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    if (!normalized) return undefined;
    const lowered = normalized.toLowerCase();
    if (lowered === 'undefined' || lowered === 'null') return undefined;
    return normalized;
};

const employeePhoneSchema = z.object({
    type: z.enum(['office', 'direct', 'home', 'corporate', 'company']),
    number: z.string().max(100),
    extension: z.string().max(20).optional(),
});

const employeeSchema = z.object({
    id: z.string().optional(),
    name: z.string().max(200),
    email: z.string().email().optional().or(z.literal('')),
    linkedin: z.string().max(500).optional().or(z.literal('')),
    phones: z.array(employeePhoneSchema).optional().default([]),
    isDecisionMaker: z.boolean().optional().default(false),
    leftOrganization: z.boolean().optional().default(false),
});

const qualificationSchema = z.object({
    rightPerson: z.boolean().optional(),
    realNeed: z.boolean().optional(),
    timing: z.boolean().optional(),
    qualifiedAt: z.string().nullable().optional(),
    qualifiedBy: z.string().max(200).optional(),
});

export const leadBodySchema = z.object({
    firstName: z.string().max(100).optional().or(z.literal('')),
    lastName: z.string().max(100).optional().or(z.literal('')),
    name: z.string().max(200).optional().or(z.literal('')),
    email: z.string().email().max(254).optional().or(z.literal('')),
    phone: z.string().max(100).optional().or(z.literal('')),
    company: z.string().max(100).optional().or(z.literal('')),
    companyName: z.string().max(100).optional().or(z.literal('')),
    jobTitle: z.string().max(100).optional().or(z.literal('')),
    title: z.string().max(100).optional().or(z.literal('')),
    status: z.enum(['New Lead', 'In Progress', 'Contacted', 'Appointment Set', 'Active Account']).optional(),
    source: z.string().max(100).optional(),
    pipelineStage: z.string().uuid('Invalid pipeline stage ID').optional().or(z.literal('').transform(() => undefined)).or(z.null()),
    dealValue: z.number().min(0).max(999999999).optional().or(z.string().regex(/^\d+$/).transform(Number)),
    expectedCloseDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date'),
    website: z.string().max(200).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    notes: z.string().max(10000).optional(),
    nextFollowUp: z.string().nullable().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid next follow-up date'),
    personLinkedinUrl: z.string().max(500).optional(),
    companyLinkedinUrl: z.string().max(500).optional(),
    employeeCount: z.union([z.number(), z.string()]).optional().transform(v => {
        if (v === undefined || v === null) return undefined;
        if (typeof v === 'string') return sanitizeOptionalText(v);
        return String(v);
    }),
    employees: z.array(employeeSchema).optional(),
    assignedTo: z.string().uuid('Invalid user ID').optional().or(z.literal('').transform(() => undefined)).or(z.null()),
    assignedAgent: z.string().max(100).optional(),
    segment: z.string().max(100).optional(),
    sourceChannel: z.string().max(100).optional(),
    qualification: qualificationSchema.optional(),
    cadence: z.any().optional(),
    assignedVA: z.string().max(100).optional().transform(sanitizeOptionalText),
    contractSignDate: z.string().nullable().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid contract sign date'),
    activeServiceDate: z.string().nullable().optional().refine(val => !val || !isNaN(Date.parse(val)), 'Invalid active service date'),
    // Priority tiers (A / B / C)
    priority: z.enum(['A', 'B', 'C']).optional(),
    // Phone number fields
    workDirectPhone: z.string().max(100).optional().or(z.literal('')),
    homePhone: z.string().max(100).optional().or(z.literal('')),
    mobilePhone: z.string().max(100).optional().or(z.literal('')),
    corporatePhone: z.string().max(100).optional().or(z.literal('')),
    otherPhone: z.string().max(100).optional().or(z.literal('')),
    companyPhone: z.string().max(100).optional().or(z.literal('')),
    // Quality gate
    qualityGatePass: z.boolean().optional(),
}); // Zod's default is .strip() so extraneous fields will be removed

export const createLeadSchema = z.object({
    body: leadBodySchema,
    query: z.any(),
    params: z.any(),
});

export const updateLeadSchema = z.object({
    body: leadBodySchema,
    query: z.any(),
    params: z.object({ id: z.string().uuid().optional() }).passthrough(),
});
