import { app } from '../../backend/src/app';
import request from 'supertest';
import { db } from '../../backend/src/services/db';
import { mqttIngestService } from '../../backend/src/services/mqttIngest';
import { ColdChainSimulator } from '../../iot-simulator/simulator';
import { startEventListener } from '../../backend/src/services/eventListener';

describe('Phase 8: End-to-End PharmaTrace Supply Chain Flow', () => {
  let mfgToken: string;
  let distToken: string;
  let pharmToken: string;
  let regToken: string;

  beforeAll(async () => {
    startEventListener();
    db.clear();

    // Setup actors
    const mfgRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Mfg Admin',
      email: 'mfg@e2e.com',
      password: 'password123',
      orgId: 'MFG001',
      role: 'MANUFACTURER'
    });
    const logMfg = await request(app).post('/api/v1/auth/login').send({ email: 'mfg@e2e.com', password: 'password123' });
    mfgToken = logMfg.body.token;

    await request(app).post('/api/v1/auth/register').send({
      name: 'Dist Admin',
      email: 'dist@e2e.com',
      password: 'password123',
      orgId: 'DIST001',
      role: 'DISTRIBUTOR'
    });
    const logDist = await request(app).post('/api/v1/auth/login').send({ email: 'dist@e2e.com', password: 'password123' });
    distToken = logDist.body.token;

    await request(app).post('/api/v1/auth/register').send({
      name: 'Pharm Admin',
      email: 'pharm@e2e.com',
      password: 'password123',
      orgId: 'PHARM001',
      role: 'PHARMACY'
    });
    const logPharm = await request(app).post('/api/v1/auth/login').send({ email: 'pharm@e2e.com', password: 'password123' });
    pharmToken = logPharm.body.token;

    await request(app).post('/api/v1/auth/register').send({
      name: 'Reg Inspector',
      email: 'reg@e2e.com',
      password: 'password123',
      orgId: 'REG001',
      role: 'REGULATOR'
    });
    const logReg = await request(app).post('/api/v1/auth/login').send({ email: 'reg@e2e.com', password: 'password123' });
    regToken = logReg.body.token;
  });

  test('Complete Traceability Lifecycle: Batch -> Serials -> IoT In-transit -> Dispense -> Recall Block', async () => {
    // 1. Register Product & Batch
    await request(app).post('/api/v1/products').set('Authorization', `Bearer ${mfgToken}`).send({
      gtin: '08909999999999',
      name: 'Insulin Glargine',
      composition: 'Insulin 100 IU/ml',
      dosageForm: 'Injection',
      strength: '100 IU/ml',
      approvalNo: 'CDSCO-BIO-09'
    });

    await request(app).post('/api/v1/batches').set('Authorization', `Bearer ${mfgToken}`).send({
      batchId: 'LOT-E2E-BIO-1',
      gtin: '08909999999999',
      mfgDate: '2026-01-01',
      expDate: '2027-01-01',
      quantity: 50
    });

    // 2. Generate Serials
    const serialsRes = await request(app)
      .post('/api/v1/batches/LOT-E2E-BIO-1/serials')
      .set('Authorization', `Bearer ${mfgToken}`)
      .send({ count: 2, level: 'UNIT' });
    const [serial1, serial2] = serialsRes.body.serials;

    // 3. Create Shipment (MFG -> DIST)
    await request(app).post('/api/v1/shipments').set('Authorization', `Bearer ${mfgToken}`).send({
      shipmentId: 'SHP-E2E-001',
      toOrg: 'DIST001',
      items: [serial1, serial2]
    });

    // 4. Simulate Cold Chain In-Transit telemetry with excursion breach
    const sim = new ColdChainSimulator({ shipmentId: 'SHP-E2E-001', deviceId: 'SENSOR-BIO-1' });
    await mqttIngestService.processTelemetry(sim.generateNormalReading());
    const excursionRes = await mqttIngestService.processTelemetry(sim.generateExcursionReading(16.2, 70.0));
    expect(excursionRes.excursion).toBe(true);

    // 5. Distributor receives shipment
    await request(app)
      .post('/api/v1/shipments/SHP-E2E-001/receive')
      .set('Authorization', `Bearer ${distToken}`)
      .send({ scannedItems: [serial1, serial2] });

    // 6. Distributor transfers to Pharmacy
    await request(app).post('/api/v1/shipments').set('Authorization', `Bearer ${distToken}`).send({
      shipmentId: 'SHP-E2E-002',
      toOrg: 'PHARM001',
      items: [serial1]
    });

    await request(app)
      .post('/api/v1/shipments/SHP-E2E-002/receive')
      .set('Authorization', `Bearer ${pharmToken}`)
      .send({ scannedItems: [serial1] });

    // 7. Pharmacy dispenses unit
    const dispRes = await request(app)
      .post('/api/v1/dispense')
      .set('Authorization', `Bearer ${pharmToken}`)
      .send({ serial: serial1 });
    expect(dispRes.status).toBe(200);

    // 8. Public verification reflects DISPENSED status
    const verifyDisp = await request(app).get(`/api/v1/verify?serial=${serial1}`);
    expect(verifyDisp.body.status).toBe('DISPENSED');

    // 9. Regulator triggers recall on batch
    const recallRes = await request(app).post('/api/v1/recalls').set('Authorization', `Bearer ${regToken}`).send({
      batchId: 'LOT-E2E-BIO-1',
      reason: 'Temperature threshold exceeded in distribution lane',
      severity: 'CLASS_I'
    });
    expect(recallRes.status).toBe(201);

    // 10. Remaining unit (serial2) is immediately flagged as RECALLED
    const verifyRecalled = await request(app).get(`/api/v1/verify?serial=${serial2}`);
    expect(verifyRecalled.body.status).toBe('RECALLED');
  });
});
