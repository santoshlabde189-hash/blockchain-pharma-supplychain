import request from 'supertest';
import { app } from '../../backend/src/app';
import { db } from '../../backend/src/services/db';

describe('Backend API Integration Tests', () => {
  let mfgToken: string;
  let distToken: string;
  let pharmToken: string;
  let regToken: string;

  beforeAll(async () => {
    db.clear();

    // 1. Register Manufacturer User
    const regMfg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Manufacturer Admin',
        email: 'mfg@pharma.com',
        password: 'password123',
        orgId: 'MFG001',
        role: 'MANUFACTURER'
      });
    expect(regMfg.status).toBe(201);

    // Login Manufacturer
    const logMfg = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'mfg@pharma.com', password: 'password123' });
    expect(logMfg.status).toBe(200);
    mfgToken = logMfg.body.token;

    // 2. Register & Login Distributor User
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Distributor User',
        email: 'dist@logistics.com',
        password: 'password123',
        orgId: 'DIST001',
        role: 'DISTRIBUTOR'
      });
    const logDist = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dist@logistics.com', password: 'password123' });
    distToken = logDist.body.token;

    // 3. Register & Login Pharmacy User
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Pharmacy Pharmacist',
        email: 'pharm@apollo.com',
        password: 'password123',
        orgId: 'PHARM001',
        role: 'PHARMACY'
      });
    const logPharm = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'pharm@apollo.com', password: 'password123' });
    pharmToken = logPharm.body.token;

    // 4. Register & Login Regulator User
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Regulator Inspector',
        email: 'reg@cdsco.gov',
        password: 'password123',
        orgId: 'REG001',
        role: 'REGULATOR'
      });
    const logReg = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reg@cdsco.gov', password: 'password123' });
    regToken = logReg.body.token;
  });

  test('Flow 1: Manufacturer registers product, batch, and serials', async () => {
    // Register Product
    const prodRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({
        gtin: '08901234567890',
        name: 'Paracetamol 500mg',
        composition: 'Paracetamol IP 500mg',
        dosageForm: 'Tablet',
        strength: '500mg',
        approvalNo: 'CDSCO-001'
      });
    expect(prodRes.status).toBe(201);

    // Create Batch
    const batchRes = await request(app)
      .post('/api/v1/batches')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({
        batchId: 'LOT2026A01',
        gtin: '08901234567890',
        mfgDate: '2026-01-01',
        expDate: '2028-01-01',
        quantity: 100
      });
    expect(batchRes.status).toBe(201);
    expect(batchRes.body.batchId).toBe('LOT2026A01');

    // Generate Serials
    const serialsRes = await request(app)
      .post('/api/v1/batches/LOT2026A01/serials')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ count: 2, level: 'UNIT' });
    expect(serialsRes.status).toBe(201);
    expect(serialsRes.body.serials.length).toBe(2);
  });

  test('Flow 2: Shipment transfer and receive (MFG -> DIST)', async () => {
    const items = ['LOT2026A01-SN-000001', 'LOT2026A01-SN-000002'];

    // Create Shipment
    const shipRes = await request(app)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({
        shipmentId: 'SHP-001',
        toOrg: 'DIST001',
        items
      });
    expect(shipRes.status).toBe(201);
    expect(shipRes.body.status).toBe('IN_TRANSIT');

    // Distributor receives shipment
    const recvRes = await request(app)
      .post('/api/v1/shipments/SHP-001/receive')
      .set('Authorization', `Bearer ${distToken}`)
      .send({ scannedItems: items });
    expect(recvRes.status).toBe(200);
    expect(recvRes.body.shipment.status).toBe('RECEIVED');
  });

  test('Flow 3: Distributor transfers to Pharmacy, Pharmacy dispenses', async () => {
    const serial = 'LOT2026A01-SN-000001';

    // Distributor ships to Pharmacy
    const shipRes = await request(app)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${distToken}`)
      .send({
        shipmentId: 'SHP-002',
        toOrg: 'PHARM001',
        items: [serial]
      });
    expect(shipRes.status).toBe(201);

    // Pharmacy receives
    const recvRes = await request(app)
      .post('/api/v1/shipments/SHP-002/receive')
      .set('Authorization', `Bearer ${pharmToken}`)
      .send({ scannedItems: [serial] });
    expect(recvRes.status).toBe(200);

    // Pharmacy dispenses unit
    const dispRes = await request(app)
      .post('/api/v1/dispense')
      .set('Authorization', `Bearer ${pharmToken}`)
      .send({ serial });
    expect(dispRes.status).toBe(200);
    expect(dispRes.body.item.status).toBe('DISPENSED');

    // Duplicate dispense must fail
    const dupRes = await request(app)
      .post('/api/v1/dispense')
      .set('Authorization', `Bearer ${pharmToken}`)
      .send({ serial });
    expect(dupRes.status).toBe(400);
  });

  test('Flow 4: Public verification of genuine, dispensed, and recalled items', async () => {
    const dispensedSerial = 'LOT2026A01-SN-000001';
    const activeSerial = 'LOT2026A01-SN-000002';

    // Verify dispensed unit
    const verifyDisp = await request(app).get(`/api/v1/verify?serial=${dispensedSerial}`);
    expect(verifyDisp.status).toBe(200);
    expect(verifyDisp.body.status).toBe('DISPENSED');

    // Verify active unit
    const verifyActive = await request(app).get(`/api/v1/verify?serial=${activeSerial}`);
    expect(verifyActive.status).toBe(200);
    expect(verifyActive.body.status).toBe('GENUINE');

    // Verify non-existent unit
    const verifyUnknown = await request(app).get('/api/v1/verify?serial=UNKNOWN-999');
    expect(verifyUnknown.status).toBe(200);
    expect(verifyUnknown.body.status).toBe('UNKNOWN');
  });

  test('Flow 5: Regulator recalls batch and holds are targeted', async () => {
    const recallRes = await request(app)
      .post('/api/v1/recalls')
      .set('Authorization', `Bearer ${regToken}`)
      .send({
        batchId: 'LOT2026A01',
        reason: 'Impurity detected during surveillance audit',
        severity: 'CLASS_I'
      });
    expect(recallRes.status).toBe(201);

    // Verify product is now marked RECALLED on public verify
    const verifyRecall = await request(app).get('/api/v1/verify?serial=LOT2026A01-SN-000002');
    expect(verifyRecall.status).toBe(200);
    expect(verifyRecall.body.status).toBe('RECALLED');

    // Regulator inspects holders
    const holdersRes = await request(app)
      .get(`/api/v1/recalls/${recallRes.body.id}/holders`)
      .set('Authorization', `Bearer ${regToken}`);
    expect(holdersRes.status).toBe(200);
    expect(holdersRes.body.holders.length).toBeGreaterThan(0);
  });
});
