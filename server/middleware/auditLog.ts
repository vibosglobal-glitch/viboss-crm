import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const entityModelMap: Record<string, string> = {
    'leads': 'lead',
    'calls': 'call',
    'meetings': 'meeting',
    'outreach': 'outreach',
    'users': 'user',
    'agents': 'user',
    'auth': 'user'
};

// Prisma model lookup for fetching old values before mutation
const prismaFindById: Record<string, (id: string) => Promise<any>> = {
    lead: (id) => prisma.lead.findUnique({ where: { id } }),
    call: (id) => prisma.call.findUnique({ where: { id } }),
    meeting: (id) => prisma.meeting.findUnique({ where: { id } }),
    outreach: (id) => prisma.outreach.findUnique({ where: { id } }),
    user: (id) => prisma.user.findUnique({ where: { id } }),
};

export const auditLogMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
        return next();
    }

    const pathParts = req.baseUrl ? req.baseUrl.split('/') : req.path.split('/');
    const baseEntity = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

    const entityType = entityModelMap[baseEntity] || 'unknown';
    const entityId = req.params.id || req.params.leadId || req.body?.id || req.body?.leadId;

    const MAX_CAPTURE_SIZE = 64 * 1024;
    const originalSend = res.send;
    let responseBody: any;
    res.send = function (body) {
        if (typeof body === 'string' && body.length <= MAX_CAPTURE_SIZE) {
            responseBody = body;
        } else if (Buffer.isBuffer(body) && body.length <= MAX_CAPTURE_SIZE) {
            responseBody = body.toString('utf-8');
        }
        return originalSend.apply(this, arguments as any);
    };

    try {
        let oldValue = undefined;
        let action = req.method;

        if (req.path.includes('impersonate')) action = 'IMPERSONATE';
        else if (req.path.includes('bulk')) action = 'BULK_UPDATE';

        if (entityId && prismaFindById[entityType] && req.method !== 'POST') {
            try {
                const doc = await prismaFindById[entityType](entityId);
                if (doc) oldValue = doc;
            } catch {
                // ID invalid or model not found
            }
        }

        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                let newValue = undefined;
                try {
                    if (responseBody) newValue = JSON.parse(responseBody);
                } catch {
                    // non-JSON response
                }

                const userId = (req as any).user?.id || 'anonymous';
                const userEmail = (req as any).user?.email || 'anonymous';

                prisma.auditLog.create({
                    data: {
                        action,
                        userId,
                        adminId: userId,
                        adminEmail: userEmail,
                        entityType,
                        entityId: entityId || null,
                        oldValue: oldValue || undefined,
                        newValue: newValue || undefined,
                        ip: req.ip || null,
                        targetId: entityId || null,
                    },
                }).catch((err) => {
                    console.error('Audit log write failed:', err.message);
                });
            }
        });

        next();
    } catch (error) {
        next(error);
    }
};
