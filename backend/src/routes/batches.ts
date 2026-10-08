import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db';
import { fabricGateway } from '../services/fabricGateway';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const batchesRouter = Router();

const createBatchSchema = z.object({
  batchId: z.string().min(2),
  gtin: z.string().length(14),
  mfgDate: z.string(),
  expDate: z.string(),
  quantity: z.number().positive(),
  qcCertHash: z.string().optional()
});

const generateSerialsSchema = z.object({
  count: z.number().int().positive().max(1000),
  level: z.enum(['UNIT', 'CARTON', 'PALLET']).default('UNIT')
});

batchesRouter.post(
  '/',
  authenticateJwt,
  requireRole(['MANUFACTURER']),
  validateBody(createBatchSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { batchId, gtin, mfgDate, expDate, quantity, qcCertHash } = req.body;
    const ownerId = req.user!.orgId;

    const existing = db.batches.find(b => b.batchId === batchId);
    if (existing) {
      return res.status(400).json({ error: 'Batch already exists' });
    }

    try {
      const { txId } = await fabricGateway.submitTransaction(
        'createBatch',
        ownerId,
        req.user!.role,
        batchId,
        gtin,
        mfgDate,
        expDate,
        quantity,
        qcCertHash || 'hash_' + Date.now(),
        ownerId
      );

      const batch = {
        batchId,
        gtin,
        mfgDate: new Date(mfgDate),
        expDate: new Date(expDate),
        quantity,
        status: 'ACTIVE' as const,
        qcCertHash: qcCertHash || 'hash_' + Date.now(),
        txId,
        createdAt: new Date()
      };
      db.batches.push(batch);

      res.status(201).json(batch);
    } catch (err: any) {
      res.status(500).json({ error: `Ledger error: ${err.message}` });
    }
  }
);

batchesRouter.get('/:id', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const batch = db.batches.find(b => b.batchId === req.params.id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  res.json(batch);
});

batchesRouter.post(
  '/:id/serials',
  authenticateJwt,
  requireRole(['MANUFACTURER']),
  validateBody(generateSerialsSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const batchId = req.params.id as string;
    const { count, level } = req.body;
    const ownerId = req.user!.orgId;

    const batch = db.batches.find(b => b.batchId === batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const serials: string[] = [];
    const prefix = `${batchId}-SN`;
    const startIdx = db.items.filter(i => i.batchId === batchId).length + 1;

    for (let i = 0; i < count; i++) {
      serials.push(`${prefix}-${(startIdx + i).toString().padStart(6, '0')}`);
    }

    try {
      await fabricGateway.submitTransaction(
        'registerSerials',
        ownerId,
        req.user!.role,
        batchId,
        JSON.stringify(serials),
        level,
        ownerId
      );

      for (const serial of serials) {
        db.items.push({
          serial,
          batchId,
          level,
          ownerId,
          status: 'CREATED',
          updatedAt: new Date()
        });
      }

      res.status(201).json({
        batchId,
        count: serials.length,
        serials
      });
    } catch (err: any) {
      res.status(500).json({ error: `Ledger error: ${err.message}` });
    }
  }
);

batchesRouter.get('/:id/codes', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  const items = db.items.filter(i => i.batchId === batchId);
  const codes = items.map(item => ({
    serial: item.serial,
    qrPayload: `gtin=${item.batchId}&lot=${batchId}&serial=${item.serial}`
  }));
  res.json({ batchId, total: codes.length, codes });
});
