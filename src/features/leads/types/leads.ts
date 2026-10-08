export type LeadStatus = 'New Lead' | 'In Progress' | 'Contacted' | 'Appointment Set' | 'Active Account';

export type LeadSource = 'csv_upload' | 'manual' | 'website' | 'referral' | 'linkedin' | 'other';

export interface StageHistoryEntry {
  stage: string;
  enteredAt: string;
  agent: string;
}

export interface Qualification {
  rightPerson: boolean;
  realNeed: boolean;
  timing: boolean;
  qualifiedAt: string | null;
  qualifiedBy: string;
}

export interface CadenceTouch {
  day: number;
  type: 'call' | 'email' | 'linkedin';
  completed: boolean;
  completedAt?: string;
}

export interface Cadence {
  type: 'cold-14day' | 'warm-fast' | 'custom';
  startedAt: string;
  currentDay: number;
  touches: CadenceTouch[];
}

export interface Lead {
  id: string;
  _id?: string; // Legacy alias for id
  // Core
  date: string;
  source: LeadSource;
  name: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  pipelineStage?: any;
  assignedTo?: any;
  uploader?: { id: string; name: string; email: string; avatar?: string; role?: string };
  title: string;
  companyName: string;
  company?: string | null;
  email: string;
  // Phones
  workDirectPhone: string;
  homePhone: string;
  mobilePhone: string;
  corporatePhone: string;
  otherPhone: string;
  companyPhone: string;
  // Company info
  employeeCount: string | number | null;
  employees: Employee[];
  personLinkedinUrl: string;
  website: string;
  companyLinkedinUrl: string;
  address: string;
  city: string;
  state: string;
  // CRM fields
  status: LeadStatus;
  dealValue?: number | null;
  assignedAgent: string;
  assignedVA?: string;
  activeServiceDate?: string | null;
  contractSignDate?: string | null;
  addedBy: string;
  closedBy: string;
  closedAt: string | null;
  closedReason: string;
  notes: string;
  nextFollowUp: string | null;
  callCount: number;
  lastActivity: string;
  revenue?: number;
  activities: Activity[];
  stageHistory: StageHistoryEntry[];
  phone: string;
  // Batch 2 fields
  priority: 'A' | 'B' | 'C';
  segment: string;
  sourceChannel: string;
  qualityGatePass: boolean;
  qualification: Qualification;
  // Batch 3 fields
  cadence?: Cadence;
}

export interface Activity {
  id: string;
  type: 'call' | 'follow-up' | 'note' | 'status-change' | 'email' | 'linkedin';
  description: string;
  timestamp: string;
  agent: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'agent';
  leadsAssigned: number;
  callsMade: number;
  followUpsCompleted: number;
  followUpsPending: number;
  revenueClosed: number;
}

export interface Call {
  id: string;
  leadId: string;
  leadName: string;
  agentName: string;
  date: string;
  time: string;
  duration: string;
  status: 'Completed' | 'Missed' | 'Follow-up';
  notes: string;
  hasRecording: boolean;
}

export interface Notification {
  id: string;
  type: 'follow-up' | 'overdue' | 'assignment' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  leadId?: string;
}

export interface EmployeePhone {
  type: 'office' | 'direct' | 'home' | 'corporate' | 'company';
  number: string;
  extension?: string;
}

export interface Employee {
  id?: string;
  name: string;
  email: string;
  linkedin?: string;
  phones: EmployeePhone[];
  isDecisionMaker: boolean;
  leftOrganization: boolean;
}
