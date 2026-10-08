import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db';
import { fabricGateway } from '../services/fabricGateway';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const recallsRouter = Router();

const createRecallSchema = z.object({
  batchId: z.string().min(2),
  reason: z.string().min(3),
  severity: z.enum(['CLASS_I', 'CLASS_II', 'CLASS_III'])
});

recallsRouter.post(
  '/',
  authenticateJwt,
  requireRole(['MANUFACTURER', 'REGULATOR']),
  validateBody(createRecallSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { batchId, reason, severity } = req.body;
    const initiatedBy = req.user!.orgId;

    try {
      const { txId } = await fabricGateway.submitTransaction(
        'recallBatch',
        initiatedBy,
        req.user!.role,
        batchId,
        reason
      );

      const recall = {
        id: db.getNextRecallId(),
        batchId,
        initiatedBy,
        reason,
        severity,
        txId,
        createdAt: new Date()
      };
      db.recalls.push(recall);

      res.status(201).json(recall);
    } catch (err: any) {
      res.status(400).json({ error: `Recall error: ${err.message}` });
    }
  }
);

recallsRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  res.json(db.recalls);
});

recallsRouter.get('/:id/holders', authenticateJwt, requireRole(['MANUFACTURER', 'REGULATOR']), (req: AuthenticatedRequest, res: Response) => {
  const recallId = parseInt(req.params.id as string, 10);
  const recall = db.recalls.find(r => r.id === recallId);
  if (!recall) {
    return res.status(404).json({ error: 'Recall not found' });
  }

  const items = db.items.filter(i => i.batchId === recall.batchId);
  const holdersMap: Record<string, { org: any; count: number; serials: string[] }> = {};

  for (const item of items) {
    if (!holdersMap[item.ownerId]) {
      const org = db.organizations.find(o => o.id === item.ownerId);
      holdersMap[item.ownerId] = { org, count: 0, serials: [] };
    }
    holdersMap[item.ownerId].count++;
    holdersMap[item.ownerId].serials.push(item.serial);
  }

  res.json({
    recall,
    holders: Object.values(holdersMap)
  });
});
