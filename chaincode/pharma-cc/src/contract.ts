import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Participant, Product, Batch, Item, Shipment, ParticipantRole } from './models';

@Info({ title: 'PharmaContract', description: 'Smart contract for PharmaTrace pharmaceutical supply chain' })
export class PharmaContract extends Contract {
  constructor() {
    super('PharmaContract');
  }

  // --- Helper Methods ---

  private async getAsset<T>(ctx: Context, key: string): Promise<T | null> {
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      return null;
    }
    return JSON.parse(bytes.toString()) as T;
  }

  private async putAsset(ctx: Context, key: string, asset: any): Promise<void> {
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(asset)));
  }

  private getClientAttribute(ctx: Context, attrName: string): string {
    const attr = ctx.clientIdentity.getAttributeValue(attrName);
    return attr || '';
  }

  // --- 3.2 Chaincode Functions ---

  @Transaction()
  public async registerParticipant(
    ctx: Context,
    id: string,
    name: string,
    role: ParticipantRole,
    licenseNo: string
  ): Promise<string> {
    const existing = await this.getAsset<Participant>(ctx, `PARTICIPANT_${id}`);
    if (existing) {
      throw new Error(`Participant ${id} already exists`);
    }

    const participant: Participant = {
      docType: 'participant',
      id,
      name,
      role,
      licenseNo,
      status: 'ACTIVE'
    };

    await this.putAsset(ctx, `PARTICIPANT_${id}`, participant);
    return JSON.stringify(participant);
  }

  @Transaction()
  public async suspendParticipant(ctx: Context, id: string): Promise<string> {
    const participant = await this.getAsset<Participant>(ctx, `PARTICIPANT_${id}`);
    if (!participant) {
      throw new Error(`Participant ${id} not found`);
    }

    participant.status = 'SUSPENDED';
    await this.putAsset(ctx, `PARTICIPANT_${id}`, participant);
    ctx.stub.setEvent('ParticipantSuspended', Buffer.from(JSON.stringify({ id })));
    return JSON.stringify(participant);
  }

  @Transaction()
  public async registerProduct(
    ctx: Context,
    gtin: string,
    name: string,
    composition: string,
    dosageForm: string,
    manufacturerId: string,
    approvalNo: string
  ): Promise<string> {
    const existing = await this.getAsset<Product>(ctx, `PRODUCT_${gtin}`);
    if (existing) {
      throw new Error(`Product with GTIN ${gtin} already exists`);
    }

    const product: Product = {
      docType: 'product',
      gtin,
      name,
      composition,
      dosageForm,
      manufacturerId,
      approvalNo
    };

    await this.putAsset(ctx, `PRODUCT_${gtin}`, product);
    return JSON.stringify(product);
  }

  @Transaction()
  public async createBatch(
    ctx: Context,
    batchId: string,
    gtin: string,
    mfgDate: string,
    expDate: string,
    quantity: number,
    qcCertHash: string,
    ownerId: string
  ): Promise<string> {
    const existing = await this.getAsset<Batch>(ctx, `BATCH_${batchId}`);
    if (existing) {
      throw new Error(`Batch ${batchId} already exists`);
    }

    const now = new Date().toISOString();
    const batch: Batch = {
      docType: 'batch',
      batchId,
      gtin,
      mfgDate,
      expDate,
      quantity,
      status: 'ACTIVE',
      qcCertHash,
      ownerId,
      createdAt: now
    };

    await this.putAsset(ctx, `BATCH_${batchId}`, batch);
    ctx.stub.setEvent('BatchCreated', Buffer.from(JSON.stringify({ batchId, gtin, ownerId })));
    return JSON.stringify(batch);
  }

  @Transaction()
  public async registerSerials(
    ctx: Context,
    batchId: string,
    serialsJson: string,
    level: 'UNIT' | 'CARTON' | 'PALLET',
    ownerId: string,
    parentSerial?: string
  ): Promise<string> {
    const batch = await this.getAsset<Batch>(ctx, `BATCH_${batchId}`);
    if (!batch) {
      throw new Error(`Batch ${batchId} does not exist`);
    }

    const serials: string[] = JSON.parse(serialsJson);
    const registered: Item[] = [];

    for (const serial of serials) {
      const existing = await this.getAsset<Item>(ctx, `ITEM_${serial}`);
      if (existing) {
        throw new Error(`Serial ${serial} already exists`);
      }

      const item: Item = {
        docType: 'item',
        serial,
        level,
        parentSerial: parentSerial || undefined,
        batchId,
        ownerId,
        status: 'CREATED'
      };

      await this.putAsset(ctx, `ITEM_${serial}`, item);
      registered.push(item);
    }

    return JSON.stringify({ count: registered.length });
  }

  @Transaction()
  public async createShipment(
    ctx: Context,
    shipmentId: string,
    fromId: string,
    toId: string,
    itemsJson: string
  ): Promise<string> {
    const existing = await this.getAsset<Shipment>(ctx, `SHIPMENT_${shipmentId}`);
    if (existing) {
      throw new Error(`Shipment ${shipmentId} already exists`);
    }

    const items: string[] = JSON.parse(itemsJson);

    // Validate that sender owns every item and items are not in invalid states
    for (const serial of items) {
      const item = await this.getAsset<Item>(ctx, `ITEM_${serial}`);
      if (!item) {
        throw new Error(`Item ${serial} not found`);
      }
      if (item.ownerId !== fromId) {
        throw new Error(`Sender ${fromId} does not own item ${serial}`);
      }
      if (['DISPENSED', 'DESTROYED', 'RECALLED'].includes(item.status)) {
        throw new Error(`Item ${serial} cannot be transferred because status is ${item.status}`);
      }
      // Update item status to IN_TRANSIT
      item.status = 'IN_TRANSIT';
      await this.putAsset(ctx, `ITEM_${serial}`, item);
    }

    const shipment: Shipment = {
      docType: 'shipment',
      shipmentId,
      fromId,
      toId,
      items,
      status: 'IN_TRANSIT',
      excursion: false,
      createdAt: new Date().toISOString()
    };

    await this.putAsset(ctx, `SHIPMENT_${shipmentId}`, shipment);
    ctx.stub.setEvent('ShipmentCreated', Buffer.from(JSON.stringify({ shipmentId, fromId, toId, count: items.length })));
    return JSON.stringify(shipment);
  }

  @Transaction()
  public async receiveShipment(
    ctx: Context,
    shipmentId: string,
    receiverId: string,
    scannedItemsJson: string
  ): Promise<string> {
    const shipment = await this.getAsset<Shipment>(ctx, `SHIPMENT_${shipmentId}`);
    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }
    if (shipment.toId !== receiverId) {
      throw new Error(`Shipment ${shipmentId} destination is ${shipment.toId}, not ${receiverId}`);
    }
    if (shipment.status !== 'IN_TRANSIT') {
      throw new Error(`Shipment ${shipmentId} is already ${shipment.status}`);
    }

    const scannedItems: string[] = JSON.parse(scannedItemsJson);
    const originalSet = new Set(shipment.items);
    const scannedSet = new Set(scannedItems);

    if (originalSet.size !== scannedSet.size || ![...originalSet].every(s => scannedSet.has(s))) {
      throw new Error(`Scanned items do not match shipment manifest`);
    }

    for (const serial of shipment.items) {
      const item = await this.getAsset<Item>(ctx, `ITEM_${serial}`);
      if (item) {
        item.ownerId = receiverId;
        item.status = 'IN_STOCK';
        await this.putAsset(ctx, `ITEM_${serial}`, item);
      }
    }

    shipment.status = 'RECEIVED';
    shipment.receivedAt = new Date().toISOString();
    await this.putAsset(ctx, `SHIPMENT_${shipmentId}`, shipment);

    ctx.stub.setEvent('ShipmentReceived', Buffer.from(JSON.stringify({ shipmentId, receiverId })));
    return JSON.stringify(shipment);
  }

  @Transaction()
  public async rejectShipment(
    ctx: Context,
    shipmentId: string,
    receiverId: string,
    reason: string
  ): Promise<string> {
    const shipment = await this.getAsset<Shipment>(ctx, `SHIPMENT_${shipmentId}`);
    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }
    if (shipment.toId !== receiverId) {
      throw new Error(`Shipment destination mismatch`);
    }

    // Revert items back to sender
    for (const serial of shipment.items) {
      const item = await this.getAsset<Item>(ctx, `ITEM_${serial}`);
      if (item) {
        item.status = 'IN_STOCK';
        await this.putAsset(ctx, `ITEM_${serial}`, item);
      }
    }

    shipment.status = 'REJECTED';
    await this.putAsset(ctx, `SHIPMENT_${shipmentId}`, shipment);

    ctx.stub.setEvent('ShipmentRejected', Buffer.from(JSON.stringify({ shipmentId, reason })));
    return JSON.stringify(shipment);
  }

  @Transaction()
  public async flagExcursion(ctx: Context, shipmentId: string, details: string): Promise<string> {
    const shipment = await this.getAsset<Shipment>(ctx, `SHIPMENT_${shipmentId}`);
    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    shipment.excursion = true;
    await this.putAsset(ctx, `SHIPMENT_${shipmentId}`, shipment);

    ctx.stub.setEvent('ExcursionFlagged', Buffer.from(JSON.stringify({ shipmentId, details })));
    return JSON.stringify(shipment);
  }

  @Transaction()
  public async anchorSensorHash(ctx: Context, shipmentId: string, windowHash: string, timestamp: string): Promise<string> {
    const key = `SENSOR_HASH_${shipmentId}_${timestamp}`;
    const record = { shipmentId, windowHash, timestamp };
    await this.putAsset(ctx, key, record);
    return JSON.stringify(record);
  }

  @Transaction()
  public async dispenseItem(ctx: Context, serial: string, pharmacyId: string): Promise<string> {
    const item = await this.getAsset<Item>(ctx, `ITEM_${serial}`);
    if (!item) {
      throw new Error(`Item ${serial} not found`);
    }
    if (item.ownerId !== pharmacyId) {
      throw new Error(`Item ${serial} is not owned by pharmacy ${pharmacyId}`);
    }
    if (item.status === 'DISPENSED') {
      throw new Error(`Item ${serial} has already been dispensed`);
    }
    if (item.status === 'RECALLED') {
      throw new Error(`Cannot dispense item ${serial} because batch is recalled`);
    }

    // Check batch expiry
    const batch = await this.getAsset<Batch>(ctx, `BATCH_${item.batchId}`);
    if (batch && new Date(batch.expDate) < new Date()) {
      throw new Error(`Cannot dispense item ${serial}: batch ${batch.batchId} is expired`);
    }

    item.status = 'DISPENSED';
    await this.putAsset(ctx, `ITEM_${serial}`, item);

    ctx.stub.setEvent('ItemDispensed', Buffer.from(JSON.stringify({ serial, pharmacyId, batchId: item.batchId })));
    return JSON.stringify(item);
  }

  @Transaction()
  public async recallBatch(ctx: Context, batchId: string, reason: string): Promise<string> {
    const batch = await this.getAsset<Batch>(ctx, `BATCH_${batchId}`);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    batch.status = 'RECALLED';
    await this.putAsset(ctx, `BATCH_${batchId}`, batch);

    ctx.stub.setEvent('BatchRecalled', Buffer.from(JSON.stringify({ batchId, reason })));
    return JSON.stringify(batch);
  }

  // --- Read & Verification Queries ---

  @Transaction(false)
  @Returns('string')
  public async verifyProduct(ctx: Context, serial: string): Promise<string> {
    const item = await this.getAsset<Item>(ctx, `ITEM_${serial}`);
    if (!item) {
      return JSON.stringify({ status: 'UNKNOWN', message: 'Serial not found in ledger' });
    }

    const batch = await this.getAsset<Batch>(ctx, `BATCH_${item.batchId}`);
    const product = batch ? await this.getAsset<Product>(ctx, `PRODUCT_${batch.gtin}`) : null;

    let status = 'GENUINE';
    if (batch?.status === 'RECALLED' || item.status === 'RECALLED') {
      status = 'RECALLED';
    } else if (item.status === 'DISPENSED') {
      status = 'DISPENSED';
    } else if (batch && new Date(batch.expDate) < new Date()) {
      status = 'EXPIRED';
    }

    return JSON.stringify({
      status,
      serial: item.serial,
      batchId: item.batchId,
      product: product?.name || 'Unknown Product',
      manufacturer: product?.manufacturerId || 'Unknown Manufacturer',
      expDate: batch?.expDate,
      recalled: status === 'RECALLED',
      dispensed: status === 'DISPENSED',
      ownerId: item.ownerId
    });
  }

  @Transaction(false)
  @Returns('string')
  public async getItem(ctx: Context, serial: string): Promise<string> {
    const item = await this.getAsset<Item>(ctx, `ITEM_${serial}`);
    if (!item) {
      throw new Error(`Item ${serial} does not exist`);
    }
    return JSON.stringify(item);
  }
}
