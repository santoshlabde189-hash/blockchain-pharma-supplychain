import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db';
import { fabricGateway } from '../services/fabricGateway';
import { authenticateJwt, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const productsRouter = Router();

const createProductSchema = z.object({
  gtin: z.string().length(14),
  name: z.string().min(2),
  composition: z.string(),
  dosageForm: z.string(),
  strength: z.string(),
  approvalNo: z.string()
});

productsRouter.post(
  '/',
  authenticateJwt,
  requireRole(['MANUFACTURER']),
  validateBody(createProductSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { gtin, name, composition, dosageForm, strength, approvalNo } = req.body;
    const manufacturerId = req.user!.orgId;

    const existing = db.products.find(p => p.gtin === gtin);
    if (existing) {
      return res.status(400).json({ error: 'Product with this GTIN already exists' });
    }

    try {
      const { txId } = await fabricGateway.submitTransaction(
        'registerProduct',
        manufacturerId,
        req.user!.role,
        gtin,
        name,
        composition,
        dosageForm,
        manufacturerId,
        approvalNo
      );

      const product = {
        gtin,
        name,
        composition,
        dosageForm,
        strength,
        manufacturerId,
        txId
      };
      db.products.push(product);

      res.status(201).json(product);
    } catch (err: any) {
      res.status(500).json({ error: `Ledger error: ${err.message}` });
    }
  }
);

productsRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  res.json(db.products);
});
