import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { fabricGateway } from '../services/fabricGateway';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';

export const verifyRouter = Router();

verifyRouter.get('/verify', async (req: Request, res: Response) => {
  const { serial } = req.query;

  if (!serial || typeof serial !== 'string') {
    return res.status(400).json({ error: 'Query parameter serial is required' });
  }

  try {
    const result = await fabricGateway.evaluateTransaction('verifyProduct', 'PUBLIC', 'PUBLIC', serial);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Verification error: ${err.message}` });
  }
});

verifyRouter.get('/trace/:serial', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  const serial = req.params.serial as string;
  const item = db.items.find(i => i.serial === serial);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const batch = db.batches.find(b => b.batchId === item.batchId);
  const product = batch ? db.products.find(p => p.gtin === batch.gtin) : null;
  const shipments = db.shipments.filter(s => s.items.includes(serial));

  res.json({
    item,
    batch,
    product,
    history: shipments.map(s => ({
      shipmentId: s.shipmentId,
      from: s.fromOrg,
      to: s.toOrg,
      status: s.status,
      timestamp: s.createdAt,
      excursion: s.excursion
    }))
  });
});
