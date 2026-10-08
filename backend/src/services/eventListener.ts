import { fabricGateway, ChaincodeEventPayload } from './fabricGateway';
import { db } from './db';
import { notifyService } from './notify';

export function startEventListener() {
  fabricGateway.on('chaincodeEvent', (event: ChaincodeEventPayload) => {
    const { eventName, payload, txId, blockNumber } = event;

    switch (eventName) {
      case 'BatchCreated': {
        const existing = db.batches.find(b => b.batchId === payload.batchId);
        if (existing) {
          existing.txId = txId;
        }
        break;
      }

      case 'ShipmentCreated': {
        const shipment = db.shipments.find(s => s.shipmentId === payload.shipmentId);
        if (shipment) {
          shipment.txId = txId;
        }
        // Notify receiver
        notifyService.emitToOrg(payload.toId, 'shipment:update', {
          shipmentId: payload.shipmentId,
          status: 'IN_TRANSIT',
          from: payload.fromId
        });
        break;
      }

      case 'ShipmentReceived': {
        const shipment = db.shipments.find(s => s.shipmentId === payload.shipmentId);
        if (shipment) {
          shipment.status = 'RECEIVED';
          shipment.receivedAt = new Date();
        }
        break;
      }

      case 'ExcursionFlagged': {
        const shipment = db.shipments.find(s => s.shipmentId === payload.shipmentId);
        if (shipment) {
          shipment.excursion = true;
        }
        // Broadcast excursion alert
        notifyService.broadcast('excursion:alert', {
          shipmentId: payload.shipmentId,
          details: payload.details,
          txId
        });
        break;
      }

      case 'ItemDispensed': {
        const item = db.items.find(i => i.serial === payload.serial);
        if (item) {
          item.status = 'DISPENSED';
          item.updatedAt = new Date();
        }
        break;
      }

      case 'BatchRecalled': {
        const batch = db.batches.find(b => b.batchId === payload.batchId);
        if (batch) {
          batch.status = 'RECALLED';
        }
        // Find all current holders of items from this batch
        const affectedItems = db.items.filter(i => i.batchId === payload.batchId);
        const holderOrgs = Array.from(new Set(affectedItems.map(i => i.ownerId)));

        for (const orgId of holderOrgs) {
          db.notifications.push({
            id: db.getNextNotifId(),
            orgId,
            type: 'RECALL',
            message: `URGENT: Batch ${payload.batchId} has been recalled. Reason: ${payload.reason}`,
            isRead: false,
            createdAt: new Date()
          });

          notifyService.emitToOrg(orgId, 'recall:new', {
            batchId: payload.batchId,
            reason: payload.reason,
            affectedCount: affectedItems.filter(i => i.ownerId === orgId).length
          });
        }
        break;
      }
    }
  });
}
