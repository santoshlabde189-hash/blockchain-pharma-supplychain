import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db';
import { fabricGateway } from '../services/fabricGateway';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const inventoryRouter = Router();

const dispenseSchema = z.object({
  serial: z.string().min(2)
});

const returnSchema = z.object({
  serial: z.string().min(2),
  toOrg: z.string()
});

const destroySchema = z.object({
  serial: z.string().min(2),
  reason: z.string()
});

inventoryRouter.get('/inventory', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const items = db.items.filter(i => i.ownerId === orgId);
  res.json(items);
});

inventoryRouter.post(
  '/dispense',
  authenticateJwt,
  requireRole(['PHARMACY']),
  validateBody(dispenseSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { serial } = req.body;
    const pharmacyId = req.user!.orgId;

    try {
      const { result, txId } = await fabricGateway.submitTransaction(
        'dispenseItem',
        pharmacyId,
        req.user!.role,
        serial,
        pharmacyId
      );

      const item = db.items.find(i => i.serial === serial);
      if (item) {
        item.status = 'DISPENSED';
        item.updatedAt = new Date();
      }

      res.json({ message: 'Item dispensed successfully', item: result, txId });
    } catch (err: any) {
      res.status(400).json({ error: `Dispense error: ${err.message}` });
    }
  }
);

inventoryRouter.post(
  '/returns',
  authenticateJwt,
  requireRole(['PHARMACY', 'DISTRIBUTOR']),
  validateBody(returnSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { serial, toOrg } = req.body;
    const callerOrg = req.user!.orgId;

    const item = db.items.find(i => i.serial === serial);
    if (!item || item.ownerId !== callerOrg) {
      return res.status(400).json({ error: 'Item not found or not owned by caller' });
    }

    item.ownerId = toOrg;
    item.status = 'IN_STOCK';
    item.updatedAt = new Date();

    res.json({ message: 'Item returned successfully', item });
  }
);

inventoryRouter.post(
  '/destroy',
  authenticateJwt,
  validateBody(destroySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { serial, reason } = req.body;
    const callerOrg = req.user!.orgId;

    const item = db.items.find(i => i.serial === serial);
    if (!item || item.ownerId !== callerOrg) {
      return res.status(400).json({ error: 'Item not found or not owned by caller' });
    }

    item.status = 'DESTROYED';
    item.updatedAt = new Date();

    res.json({ message: 'Item marked destroyed', item, reason });
  }
);
