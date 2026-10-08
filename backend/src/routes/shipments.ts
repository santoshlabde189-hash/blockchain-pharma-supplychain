import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db';
import { fabricGateway } from '../services/fabricGateway';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const shipmentsRouter = Router();

const createShipmentSchema = z.object({
  shipmentId: z.string().min(2),
  toOrg: z.string(),
  items: z.array(z.string()).min(1)
});

const receiveShipmentSchema = z.object({
  scannedItems: z.array(z.string()).min(1)
});

const rejectShipmentSchema = z.object({
  reason: z.string().min(2)
});

shipmentsRouter.post(
  '/',
  authenticateJwt,
  validateBody(createShipmentSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { shipmentId, toOrg, items } = req.body;
    const fromOrg = req.user!.orgId;

    const existing = db.shipments.find(s => s.shipmentId === shipmentId);
    if (existing) {
      return res.status(400).json({ error: 'Shipment already exists' });
    }

    try {
      const { txId } = await fabricGateway.submitTransaction(
        'createShipment',
        fromOrg,
        req.user!.role,
        shipmentId,
        fromOrg,
        toOrg,
        JSON.stringify(items)
      );

      const shipment = {
        shipmentId,
        fromOrg,
        toOrg,
        status: 'IN_TRANSIT' as const,
        excursion: false,
        createdAt: new Date(),
        txId,
        items
      };
      db.shipments.push(shipment);

      // Update local item status to IN_TRANSIT
      for (const serial of items) {
        const item = db.items.find(i => i.serial === serial);
        if (item) {
          item.status = 'IN_TRANSIT';
        }
      }

      res.status(201).json(shipment);
    } catch (err: any) {
      res.status(400).json({ error: `Ledger error: ${err.message}` });
    }
  }
);

shipmentsRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const userShipments = db.shipments.filter(s => s.fromOrg === orgId || s.toOrg === orgId);
  res.json(userShipments);
});

shipmentsRouter.post(
  '/:id/receive',
  authenticateJwt,
  validateBody(receiveShipmentSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const shipmentId = req.params.id;
    const { scannedItems } = req.body;
    const receiverId = req.user!.orgId;

    try {
      await fabricGateway.submitTransaction(
        'receiveShipment',
        receiverId,
        req.user!.role,
        shipmentId,
        receiverId,
        JSON.stringify(scannedItems)
      );

      const shipment = db.shipments.find(s => s.shipmentId === shipmentId);
      if (shipment) {
        shipment.status = 'RECEIVED';
        shipment.receivedAt = new Date();
      }

      for (const serial of scannedItems) {
        const item = db.items.find(i => i.serial === serial);
        if (item) {
          item.ownerId = receiverId;
          item.status = 'IN_STOCK';
        }
      }

      res.json({ message: 'Shipment successfully received and custody updated', shipment });
    } catch (err: any) {
      res.status(400).json({ error: `Receive error: ${err.message}` });
    }
  }
);

shipmentsRouter.post(
  '/:id/reject',
  authenticateJwt,
  validateBody(rejectShipmentSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const shipmentId = req.params.id;
    const { reason } = req.body;
    const receiverId = req.user!.orgId;

    try {
      await fabricGateway.submitTransaction(
        'rejectShipment',
        receiverId,
        req.user!.role,
        shipmentId,
        receiverId,
        reason
      );

      const shipment = db.shipments.find(s => s.shipmentId === shipmentId);
      if (shipment) {
        shipment.status = 'REJECTED';
      }

      res.json({ message: 'Shipment rejected', shipment });
    } catch (err: any) {
      res.status(400).json({ error: `Reject error: ${err.message}` });
    }
  }
);

shipmentsRouter.get('/:id/telemetry', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const shipmentId = req.params.id;
  const telemetry = db.sensorReadings.filter(s => s.shipmentId === shipmentId);
  res.json(telemetry);
});
