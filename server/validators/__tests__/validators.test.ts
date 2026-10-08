import { describe, it, expect } from 'vitest';
import { createCallSchema, updateCallSchema, updateRecordingSchema } from '../call';
import { createMeetingSchema, updateMeetingSchema } from '../meeting';
import { createNoteSchema } from '../note';
import { createTaskSchema, updateTaskSchema } from '../task';
import { createOutreachSchema } from '../outreach';
import { createNotificationSchema } from '../notification';
import { createAgentSchema, updateAgentSchema } from '../agent';
import { createStageSchema, updateStageSchema } from '../pipelineStage';

// ── Call validators ──────────────────────────────────────────────

describe('createCallSchema', () => {
  it('accepts valid input', () => {
    const result = createCallSchema.safeParse({
      body: { leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', notes: 'Good call' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing leadId', () => {
    const result = createCallSchema.safeParse({
      body: { notes: 'No lead' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for leadId', () => {
    const result = createCallSchema.safeParse({
      body: { leadId: 'not-a-uuid' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects notes exceeding max length', () => {
    const result = createCallSchema.safeParse({
      body: { leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', notes: 'x'.repeat(10001) },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('updateRecordingSchema', () => {
  it('accepts valid recordingUrl', () => {
    const result = updateRecordingSchema.safeParse({
      body: { recordingUrl: 'https://example.com/recording.mp3' },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty recordingUrl', () => {
    const result = updateRecordingSchema.safeParse({
      body: { recordingUrl: '' },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(false);
  });
});

// ── Meeting validators ───────────────────────────────────────────

describe('createMeetingSchema', () => {
  it('accepts valid input', () => {
    const result = createMeetingSchema.safeParse({
      body: { title: 'Weekly sync', scheduledAt: '2025-06-15T10:00:00Z' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const result = createMeetingSchema.safeParse({
      body: { scheduledAt: '2025-06-15T10:00:00Z' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date', () => {
    const result = createMeetingSchema.safeParse({
      body: { title: 'Test', scheduledAt: 'not-a-date' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Note validators ──────────────────────────────────────────────

describe('createNoteSchema', () => {
  it('accepts valid input', () => {
    const result = createNoteSchema.safeParse({
      body: { leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', content: 'Some notes' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = createNoteSchema.safeParse({
      body: { leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', content: '' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Task validators ──────────────────────────────────────────────

describe('createTaskSchema', () => {
  it('accepts valid input', () => {
    const result = createTaskSchema.safeParse({
      body: { title: 'Follow up', priority: 'high' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const result = createTaskSchema.safeParse({
      body: { priority: 'high' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid priority', () => {
    const result = createTaskSchema.safeParse({
      body: { title: 'Test', priority: 'super_ultra_high' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Outreach validators ──────────────────────────────────────────

describe('createOutreachSchema', () => {
  it('accepts valid input', () => {
    const result = createOutreachSchema.safeParse({
      body: { emailsSent: 50, replies: 5 },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects emailsSent < 1', () => {
    const result = createOutreachSchema.safeParse({
      body: { emailsSent: 0 },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Notification validators ──────────────────────────────────────

describe('createNotificationSchema', () => {
  it('accepts valid input', () => {
    const result = createNotificationSchema.safeParse({
      body: { title: 'Alert', message: 'Something happened' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing message', () => {
    const result = createNotificationSchema.safeParse({
      body: { title: 'Alert' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Agent validators ─────────────────────────────────────────────

describe('createAgentSchema', () => {
  it('accepts valid input', () => {
    const result = createAgentSchema.safeParse({
      body: { name: 'Jane', email: 'jane@example.com', password: 'secure123', role: 'sdr' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createAgentSchema.safeParse({
      body: { name: 'Jane', email: 'not-an-email', password: 'secure123', role: 'sdr' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = createAgentSchema.safeParse({
      body: { name: 'Jane', email: 'jane@example.com', password: 'short', role: 'sdr' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = createAgentSchema.safeParse({
      body: { name: 'Jane', email: 'jane@example.com', password: 'secure123', role: 'super_admin' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Pipeline Stage validators ────────────────────────────────────

describe('createStageSchema', () => {
  it('accepts valid input', () => {
    const result = createStageSchema.safeParse({
      body: { name: 'Prospecting', color: '#ff6600' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createStageSchema.safeParse({
      body: { name: '', color: '#ff6600' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects probability > 100', () => {
    const result = createStageSchema.safeParse({
      body: { name: 'Test', probability: 150 },
      query: {},
      params: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Strips extra fields ──────────────────────────────────────────

describe('schema stripping', () => {
  it('strips unknown fields from call body', () => {
    const result = createCallSchema.safeParse({
      body: { leadId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', __proto__: 'hack', evil: 'yes' },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).not.toHaveProperty('evil');
    }
  });

  it('strips unknown fields from agent body', () => {
    const result = createAgentSchema.safeParse({
      body: { name: 'Jane', email: 'jane@example.com', password: 'secure123', role: 'sdr', isAdmin: true },
      query: {},
      params: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).not.toHaveProperty('isAdmin');
    }
  });
});

// ── Lead validators ──────────────────────────────────────────────

import { updateLeadSchema, createLeadSchema } from '../lead';

describe('updateLeadSchema – priority field', () => {
  it('accepts valid priority A', () => {
    const result = updateLeadSchema.safeParse({
      body: { priority: 'A' },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.priority).toBe('A');
    }
  });

  it('accepts valid priority B', () => {
    const result = updateLeadSchema.safeParse({
      body: { priority: 'B' },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid priority C', () => {
    const result = updateLeadSchema.safeParse({
      body: { priority: 'C' },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid priority value', () => {
    const result = updateLeadSchema.safeParse({
      body: { priority: 'D' },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(false);
  });

  it('does NOT strip priority from body (regression guard)', () => {
    const result = updateLeadSchema.safeParse({
      body: { priority: 'A', status: 'In Progress' },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toHaveProperty('priority', 'A');
    }
  });
});

describe('updateLeadSchema – phone fields', () => {
  it('passes through all phone fields without stripping', () => {
    const result = updateLeadSchema.safeParse({
      body: {
        workDirectPhone: '555-1234',
        homePhone: '555-5678',
        mobilePhone: '555-9012',
        corporatePhone: '555-3456',
        otherPhone: '555-7890',
        companyPhone: '555-2468',
      },
      query: {},
      params: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.workDirectPhone).toBe('555-1234');
      expect(result.data.body.mobilePhone).toBe('555-9012');
    }
  });
});
