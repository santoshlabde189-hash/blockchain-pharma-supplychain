import { Router, Response } from 'express';
import { db } from '../services/db';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';

export const alertsRouter = Router();

alertsRouter.get('/notifications', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.orgId;
  const notifs = db.notifications.filter(n => n.orgId === orgId);
  res.json(notifs);
});

alertsRouter.patch('/notifications/:id/read', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const notifId = parseInt(req.params.id as string, 10);
  const notif = db.notifications.find(n => n.id === notifId && n.orgId === req.user!.orgId);
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notif.isRead = true;
  res.json(notif);
});

alertsRouter.get('/audit/transactions', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  // Aggregate transactions across assets
  const txs: any[] = [];
  db.batches.forEach(b => b.txId && txs.push({ type: 'BATCH_CREATED', id: b.batchId, txId: b.txId, date: b.createdAt }));
  db.shipments.forEach(s => s.txId && txs.push({ type: 'SHIPMENT_CREATED', id: s.shipmentId, txId: s.txId, date: s.createdAt }));
  db.recalls.forEach(r => r.txId && txs.push({ type: 'BATCH_RECALLED', id: r.batchId, txId: r.txId, date: r.createdAt }));
  res.json(txs);
});

alertsRouter.get('/reports/export', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const type = req.query.type || 'csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-report.csv"');
  let csv = 'Type,ID,TxID,Date\n';
  db.batches.forEach(b => b.txId && (csv += `BATCH_CREATED,${b.batchId},${b.txId},${b.createdAt.toISOString()}\n`));
  db.shipments.forEach(s => s.txId && (csv += `SHIPMENT_CREATED,${s.shipmentId},${s.txId},${s.createdAt.toISOString()}\n`));
  res.send(csv);
});
