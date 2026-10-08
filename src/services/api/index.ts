import { authApi, LoginResponse, AuthUser } from '@/features/auth/api/auth.api';
import { leadsApi } from '@/features/leads/api/leads.api';
import { callsApi } from '@/features/calls/api/calls.api';
import { agentsApi } from '@/features/agents/api/agents.api';
import { meetingsApi } from '@/features/meetings/api/meetings.api';
import { notificationsApi } from '@/features/notifications/api/notifications.api';
import { notesApi } from '@/features/notes/api/notes.api';
import { hrApi } from '@/features/hr/api/hr.api';
import { tasksApi } from '@/features/calendar/api/tasks.api';
import { healthApi } from './health.api';

// Re-export types consumers rely on
export type { LoginResponse, AuthUser };

// Re-assemble the same shape so `import { api } from '@/services/api'` keeps working
export const api = {
    auth: authApi,
    leads: leadsApi,
    calls: callsApi,
    agents: agentsApi,
    notifications: notificationsApi,
    notes: notesApi,
    hr: hrApi,
    tasks: tasksApi,
    meetings: meetingsApi,
    health: healthApi.check,
};
