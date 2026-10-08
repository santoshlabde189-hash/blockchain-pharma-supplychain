import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db';
import { fabricGateway } from '../services/fabricGateway';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const orgsRouter = Router();

const createOrgSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  role: z.enum(['MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY', 'REGULATOR']),
  licenseNo: z.string().min(2),
  address: z.string().optional()
});

orgsRouter.post(
  '/',
  authenticateJwt,
  requireRole(['ADMIN', 'REGULATOR']),
  validateBody(createOrgSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { id, name, role, licenseNo, address } = req.body;

    const existing = db.organizations.find(o => o.id === id || o.licenseNo === licenseNo);
    if (existing) {
      return res.status(400).json({ error: 'Organization ID or License number already exists' });
    }

    try {
      await fabricGateway.submitTransaction('registerParticipant', req.user!.orgId, req.user!.role, id, name, role, licenseNo);
    } catch (err: any) {
      return res.status(500).json({ error: `Ledger error: ${err.message}` });
    }

    const org = {
      id,
      name,
      role,
      licenseNo,
      address,
      status: 'ACTIVE' as const,
      createdAt: new Date()
    };
    db.organizations.push(org);

    res.status(201).json(org);
  }
);

orgsRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const orgs = db.organizations.map(o => ({
    id: o.id,
    name: o.name,
    role: o.role,
    status: o.status
  }));
  res.json(orgs);
});

orgsRouter.patch(
  '/:id/suspend',
  authenticateJwt,
  requireRole(['REGULATOR']),
  async (req: AuthenticatedRequest, res: Response) => {
    const org = db.organizations.find(o => o.id === req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    try {
      await fabricGateway.submitTransaction('suspendParticipant', req.user!.orgId, req.user!.role, org.id);
    } catch (err: any) {
      return res.status(500).json({ error: `Ledger error: ${err.message}` });
    }

    org.status = 'SUSPENDED';
    res.json(org);
  }
);
