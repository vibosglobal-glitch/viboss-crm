import { z } from 'zod';

export const LeadStatusSchema = z.enum([
    'New Lead', 'In Progress', 'Contacted', 'Appointment Set', 'Active Account'
]);

export const LeadSourceSchema = z.enum([
    'csv_upload', 'manual', 'website', 'referral', 'linkedin', 'other',
]);

export const ActivitySchema = z.object({
    id: z.string(),
    type: z.enum(['call', 'follow-up', 'note', 'status-change', 'email', 'linkedin']),
    description: z.string(),
    timestamp: z.string(),
    agent: z.string(),
});

export const StageHistoryEntrySchema = z.object({
    stage: z.string(),
    enteredAt: z.string(),
    agent: z.string(),
});

export const QualificationSchema = z.object({
    rightPerson: z.boolean(),
    realNeed: z.boolean(),
    timing: z.boolean(),
    qualifiedAt: z.string().nullable(),
    qualifiedBy: z.string(),
});

export const CadenceTouchSchema = z.object({
    day: z.number(),
    type: z.enum(['call', 'email', 'linkedin']),
    completed: z.boolean(),
    completedAt: z.string().optional(),
});

export const CadenceSchema = z.object({
    type: z.enum(['cold-14day', 'warm-fast', 'custom']),
    startedAt: z.string(),
    currentDay: z.number(),
    touches: z.array(CadenceTouchSchema),
});

export const EmployeePhoneSchema = z.object({
    type: z.enum(['office', 'direct', 'home', 'corporate', 'company']),
    number: z.string(),
    extension: z.string().optional(),
});

export const EmployeeSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string().default(''),
    linkedin: z.string().optional(),
    phones: z.array(EmployeePhoneSchema).default([]),
    isDecisionMaker: z.boolean().default(false),
    leftOrganization: z.boolean().default(false),
});

export const LeadSchema = z.object({
    id: z.string(),
    date: z.string(),
    source: LeadSourceSchema.catch('other'),
    name: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    createdAt: z.string().optional(),
    pipelineStage: z.any().optional(),
    assignedTo: z.any().optional(),
    title: z.string().default(''),
    companyName: z.string().default(''),
    email: z.string().default(''),
    workDirectPhone: z.string().default(''),
    homePhone: z.string().default(''),
    mobilePhone: z.string().default(''),
    corporatePhone: z.string().default(''),
    otherPhone: z.string().default(''),
    companyPhone: z.string().default(''),
    employeeCount: z.union([z.string(), z.number()]).nullable().default(null),
    employees: z.array(EmployeeSchema).default([]),
    personLinkedinUrl: z.string().default(''),
    website: z.string().default(''),
    companyLinkedinUrl: z.string().default(''),
    address: z.string().default(''),
    city: z.string().default(''),
    state: z.string().default(''),
    status: LeadStatusSchema.catch('New Lead'),
    dealValue: z.number().nullable().optional(),
    assignedAgent: z.string().default(''),
    assignedVA: z.string().optional(),
    activeServiceDate: z.string().nullable().optional(),
    contractSignDate: z.string().nullable().optional(),
    addedBy: z.string().default(''),
    closedBy: z.string().default(''),
    closedAt: z.string().nullable().default(null),
    closedReason: z.string().default(''),
    notes: z.string().default(''),
    nextFollowUp: z.string().nullable().default(null),
    callCount: z.number().default(0),
    lastActivity: z.string().default(''),
    revenue: z.number().optional(),
    activities: z.array(ActivitySchema).default([]),
    stageHistory: z.array(StageHistoryEntrySchema).default([]),
    phone: z.string().default(''),
    priority: z.enum(['A', 'B', 'C']).catch('C'),
    segment: z.string().default(''),
    sourceChannel: z.string().default(''),
    qualityGatePass: z.boolean().default(false),
    qualification: QualificationSchema.default({
        rightPerson: false,
        realNeed: false,
        timing: false,
        qualifiedAt: null,
        qualifiedBy: '',
    }),
    cadence: CadenceSchema.optional(),
    // Legacy alias for id
    _id: z.string().optional(),
});

export const LeadsListSchema = z.array(LeadSchema);

export const KPIsSchema = z.object({
    totalLeads: z.number(),
    newLeads: z.number(),
    inProgress: z.number(),
    contacted: z.number(),
    appointmentSet: z.number(),
    activeAccount: z.number(),
    activeLeads: z.number(),
    closedWon: z.number(),
    closedLost: z.number(),
    followUpsDue: z.number(),
}).partial();

// Form schemas (for react-hook-form)
export const CreateLeadFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').or(z.literal('')),
    companyName: z.string().optional(),
    title: z.string().optional(),
    source: LeadSourceSchema.optional(),
    phone: z.string().optional(),
    state: z.string().optional(),
    notes: z.string().optional(),
});

export const UpdateLeadStatusSchema = z.object({
    status: LeadStatusSchema,
});

export type Lead = z.infer<typeof LeadSchema>;
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export type LeadSource = z.infer<typeof LeadSourceSchema>;
export type KPIs = z.infer<typeof KPIsSchema>;
export type CreateLeadForm = z.infer<typeof CreateLeadFormSchema>;
