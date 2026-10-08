export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
} as const;

export const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const;

export const USER_SELECT_WITH_ACTIVE = {
  ...USER_SELECT,
  isActive: true,
  createdAt: true,
} as const;

export const USER_WITH_ROLE_SELECT = USER_SELECT;
export const USER_ADMIN_LIST_SELECT = USER_SELECT_WITH_ACTIVE;

export const STAGE_SELECT = {
  id: true,
  name: true,
  color: true,
  order: true,
  probability: true,
} as const;

export const STAGE_SELECT_WITH_FLAGS = {
  ...STAGE_SELECT,
  isActive: true,
  isDefault: true,
} as const;

export const STAGE_CORE_SELECT = {
  id: true,
  name: true,
  color: true,
  order: true,
} as const;

export const STAGE_LIST_SELECT = STAGE_SELECT_WITH_FLAGS;

/**
 * Minimal select used on the GET /api/leads list endpoint.
 * Keep in sync with LeadListParams and the leads table column set.
 * The detail endpoint (GET /api/leads/:id) continues to use LEAD_INCLUDE
 * so it still returns all fields for the full Lead detail panel.
 */
export const LEAD_LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  status: true,
  source: true,
  priority: true,
  segment: true,
  sourceChannel: true,
  employeeCount: true,
  state: true,
  city: true,
  nextFollowUp: true,
  createdAt: true,
  updatedAt: true,
  assignedToId: true,
  uploadedById: true,
  pipelineStageId: true,
  dealValue: true,
  // Relations
  assignedTo: { select: USER_WITH_ROLE_SELECT },
  uploader: { select: USER_WITH_ROLE_SELECT },
  pipelineStage: { select: STAGE_SELECT },
} as const;
