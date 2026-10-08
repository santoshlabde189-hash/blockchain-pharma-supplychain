import { PharmaContract } from '../../chaincode/pharma-cc/src/contract';
import { MockContext } from './mockContext';

describe('PharmaContract Chaincode Unit Tests', () => {
  let contract: PharmaContract;
  let ctx: any;

  beforeEach(() => {
    contract = new PharmaContract();
    ctx = new MockContext({ role: 'MANUFACTURER', orgId: 'MFG001' });
  });

  test('Scenario 1: Register product and batch', async () => {
    // 1. Register Manufacturer
    await contract.registerParticipant(ctx, 'MFG001', 'PharmaCorp', 'MANUFACTURER', 'LIC-001');

    // 2. Register Product
    const prodRes = await contract.registerProduct(
      ctx,
      '08901234567890',
      'Amoxicillin 500mg',
      'Amoxicillin Trihydrate',
      'Capsule',
      'MFG001',
      'CDSCO-1234'
    );
    const prod = JSON.parse(prodRes);
    expect(prod.gtin).toBe('08901234567890');

    // 3. Create Batch
    const batchRes = await contract.createBatch(
      ctx,
      'LOT2026A01',
      '08901234567890',
      '2026-01-01',
      '2028-01-01',
      5000,
      'hash123',
      'MFG001'
    );
    const batch = JSON.parse(batchRes);
    expect(batch.batchId).toBe('LOT2026A01');
    expect(batch.status).toBe('ACTIVE');
  });

  test('Scenario 2: Register serials and transfer ownership to distributor', async () => {
    await contract.createBatch(ctx, 'LOT1', 'GTIN1', '2026-01-01', '2028-01-01', 10, 'h1', 'MFG001');
    await contract.registerSerials(ctx, 'LOT1', JSON.stringify(['SN001', 'SN002']), 'UNIT', 'MFG001');

    // Create Shipment
    const shipRes = await contract.createShipment(
      ctx,
      'SHP-001',
      'MFG001',
      'DIST001',
      JSON.stringify(['SN001', 'SN002'])
    );
    const shipment = JSON.parse(shipRes);
    expect(shipment.status).toBe('IN_TRANSIT');

    // Receive Shipment
    const recvRes = await contract.receiveShipment(
      ctx,
      'SHP-001',
      'DIST001',
      JSON.stringify(['SN001', 'SN002'])
    );
    const receivedShipment = JSON.parse(recvRes);
    expect(receivedShipment.status).toBe('RECEIVED');

    // Check item owner is updated
    const item = JSON.parse(await contract.getItem(ctx, 'SN001'));
    expect(item.ownerId).toBe('DIST001');
    expect(item.status).toBe('IN_STOCK');
  });

  test('Scenario 3: Non-owner transfer must fail', async () => {
    await contract.createBatch(ctx, 'LOT1', 'GTIN1', '2026-01-01', '2028-01-01', 10, 'h1', 'MFG001');
    await contract.registerSerials(ctx, 'LOT1', JSON.stringify(['SN100']), 'UNIT', 'MFG001');

    // Attempt transfer by non-owner DIST001
    await expect(
      contract.createShipment(ctx, 'SHP-FAIL', 'DIST001', 'PHARM001', JSON.stringify(['SN100']))
    ).rejects.toThrow('Sender DIST001 does not own item SN100');
  });

  test('Scenario 4: Dispense item and block repeat dispensing', async () => {
    await contract.createBatch(ctx, 'LOT1', 'GTIN1', '2026-01-01', '2028-01-01', 10, 'h1', 'PHARM001');
    await contract.registerSerials(ctx, 'LOT1', JSON.stringify(['SN-DISP']), 'UNIT', 'PHARM001');

    // First dispense succeeds
    const dispRes = await contract.dispenseItem(ctx, 'SN-DISP', 'PHARM001');
    expect(JSON.parse(dispRes).status).toBe('DISPENSED');

    // Second dispense attempt fails
    await expect(contract.dispenseItem(ctx, 'SN-DISP', 'PHARM001')).rejects.toThrow(
      'Item SN-DISP has already been dispensed'
    );
  });

  test('Scenario 5: Recall batch and public verify returns RECALLED', async () => {
    await contract.registerProduct(ctx, 'GTIN-REC', 'ColdPill', 'Active1', 'Tablet', 'MFG001', 'APP-1');
    await contract.createBatch(ctx, 'LOT-REC', 'GTIN-REC', '2026-01-01', '2028-01-01', 10, 'h1', 'PHARM001');
    await contract.registerSerials(ctx, 'LOT-REC', JSON.stringify(['SN-REC']), 'UNIT', 'PHARM001');

    // Recall batch
    await contract.recallBatch(ctx, 'LOT-REC', 'Contamination detected');

    // Public verify
    const verifyRes = JSON.parse(await contract.verifyProduct(ctx, 'SN-REC'));
    expect(verifyRes.status).toBe('RECALLED');
    expect(verifyRes.recalled).toBe(true);
  });

  test('Scenario 6: Flag temperature excursion on shipment', async () => {
    await contract.createBatch(ctx, 'LOT1', 'GTIN1', '2026-01-01', '2028-01-01', 10, 'h1', 'MFG001');
    await contract.registerSerials(ctx, 'LOT1', JSON.stringify(['SN-COLD']), 'UNIT', 'MFG001');
    await contract.createShipment(ctx, 'SHP-COLD', 'MFG001', 'DIST001', JSON.stringify(['SN-COLD']));

    const excursionRes = await contract.flagExcursion(ctx, 'SHP-COLD', 'Temperature spiked to 14.5C');
    expect(JSON.parse(excursionRes).excursion).toBe(true);
  });
});
