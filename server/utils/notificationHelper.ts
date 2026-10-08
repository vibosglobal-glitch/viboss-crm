import prisma from '../lib/prisma';
import type { NotificationType } from '@prisma/client';

const TYPE_MAP: Record<string, NotificationType> = {
  assignment: 'lead_assigned',
  stage_change: 'status_change',
  mention: 'system',
  reminder: 'task_due',
  system: 'system',
};

export async function createNotification(data: {
  type: 'assignment' | 'stage_change' | 'mention' | 'reminder' | 'system';
  title: string;
  message: string;
  leadId?: string;
  userId?: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: TYPE_MAP[data.type] || 'system',
        title: data.title,
        message: data.message,
        isRead: false,
        relatedLeadId: data.leadId || null,
        userId: data.userId || '',
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export async function notifyLeadStatusChange(leadId: string, leadName: string, oldStatus: string, newStatus: string, userId?: string) {
  return createNotification({
    type: 'system',
    title: 'Lead Status Changed',
    message: `${leadName} status changed from ${oldStatus} to ${newStatus}`,
    leadId,
    userId,
  });
}

export async function notifyNewLead(leadId: string, leadName: string, assignedAgent: string, userId?: string) {
  return createNotification({
    type: 'assignment',
    title: 'New Lead Assigned',
    message: `New lead ${leadName} assigned to ${assignedAgent}`,
    leadId,
    userId,
  });
}

export async function notifyFollowUpDue(leadId: string, leadName: string, dueDate: Date, userId?: string) {
  return createNotification({
    type: 'reminder',
    title: 'Follow-up Due',
    message: `Follow-up for ${leadName} is due on ${dueDate.toISOString().split('T')[0]}`,
    leadId,
    userId,
  });
}

export async function notifyFollowUpOverdue(leadId: string, leadName: string, userId?: string) {
  return createNotification({
    type: 'reminder',
    title: 'Follow-up Overdue',
    message: `Follow-up for ${leadName} is overdue`,
    leadId,
    userId,
  });
}

export async function notifyLeadImported(count: number, userId?: string) {
  return createNotification({
    type: 'system',
    title: 'CSV Import Complete',
    message: `Successfully imported ${count} leads`,
    userId,
  });
}
