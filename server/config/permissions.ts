import type { UserRole } from '@prisma/client';

/**
 * RBAC permission map.
 * Maps resource.action to an array of roles that are allowed.
 */
export const PERMISSIONS: Record<string, UserRole[]> = {
    // Leads
    'leads.read': ['admin', 'lead_gen', 'sdr', 'closer', 'manager', 'hr'],
    'leads.upload': ['admin', 'lead_gen', 'manager', 'sdr'],
    'leads.assign': ['admin', 'lead_gen', 'manager'],
    'leads.viewOwn': ['admin', 'lead_gen', 'sdr', 'closer', 'manager', 'hr'],
    'leads.viewAll': ['admin', 'manager', 'hr'],
    'leads.edit': ['admin', 'sdr', 'closer', 'manager'],
    'leads.delete': ['admin', 'lead_gen'],
    'leads.moveStage': ['admin', 'sdr', 'closer', 'manager'],

    // Agents
    'agents.read': ['admin', 'manager', 'hr', 'lead_gen'],
    'agents.create': ['admin'],
    'agents.edit': ['admin', 'manager'],
    'agents.delete': ['admin'],

    // Activities
    'activities.create': ['admin', 'lead_gen', 'sdr', 'closer', 'manager'],
    'activities.read': ['admin', 'lead_gen', 'sdr', 'closer', 'manager', 'hr'],
    'activities.complete': ['admin', 'lead_gen', 'sdr', 'closer', 'manager', 'hr'],
    'activities.viewAll': ['admin', 'manager', 'hr'],

    // Calls
    'calls.read': ['admin', 'manager', 'sdr', 'closer', 'hr'],
    'calls.create': ['admin', 'manager', 'sdr', 'closer'],
    'calls.edit': ['admin', 'manager', 'sdr', 'closer'],

    // Meetings
    'meetings.read': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'meetings.create': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'meetings.edit': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'meetings.delete': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],

    // Notes
    'notes.read': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'notes.create': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'notes.edit': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'notes.delete': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],

    // Notifications
    'notifications.read': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'notifications.edit': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],

    // Tasks
    'tasks.read': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'tasks.create': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'tasks.edit': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'tasks.delete': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],

    // Analytics
    'analytics.viewTeam': ['admin', 'manager', 'hr'],
    'analytics.view_all': ['admin', 'manager', 'hr'],

    // Users
    'users.manage': ['admin', 'hr'],

    // HR
    'hr.read': ['admin', 'hr', 'manager'],

    // Teams
    'teams.manage': ['admin', 'manager'],

    // Pipeline
    'pipeline.read': ['admin', 'manager', 'sdr', 'closer', 'lead_gen', 'hr'],
    'pipeline.manageStages': ['admin'],
    'pipeline.create': ['admin'],
    'pipeline.edit': ['admin'],

    // Outreach
    'outreach.create': ['admin', 'sdr', 'closer', 'manager', 'lead_gen'],
    'outreach.read': ['admin', 'sdr', 'closer', 'manager', 'lead_gen', 'hr'],
};
