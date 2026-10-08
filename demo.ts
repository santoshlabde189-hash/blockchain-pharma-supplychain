import { app, server } from './backend/src/app';
import { db } from './backend/src/services/db';
import { fabricGateway } from './backend/src/services/fabricGateway';
import { ColdChainSimulator } from './iot-simulator/simulator';
import { mqttIngestService } from './backend/src/services/mqttIngest';
import bcrypt from 'bcryptjs';

async function seedRichDemoData() {
  console.log('\n===============================================================');
  console.log('       SEEDING PHARMATRACE COMPREHENSIVE DEMO DATA             ');
  console.log('===============================================================\n');

  // 1. Seed Demo User Accounts
  const passwordHash = await bcrypt.hash('password123', 10);
  db.users.push(
    {
      id: db.getNextUserId(),
      name: 'Dr. Sarah Connor (Manufacturer)',
      email: 'manufacturer@pharma.com',
      passwordHash,
      orgId: 'MFG001',
      role: 'MANUFACTURER',
      isActive: true,
      createdAt: new Date()
    },
    {
      id: db.getNextUserId(),
      name: 'James Reynolds (Distributor)',
      email: 'distributor@logistics.com',
      passwordHash,
      orgId: 'DIST001',
      role: 'DISTRIBUTOR',
      isActive: true,
      createdAt: new Date()
    },
    {
      id: db.getNextUserId(),
      name: 'Priya Sharma (Pharmacist)',
      email: 'pharmacy@citymed.com',
      passwordHash,
      orgId: 'PHARM001',
      role: 'PHARMACY',
      isActive: true,
      createdAt: new Date()
    },
    {
      id: db.getNextUserId(),
      name: 'Inspector Davis (CDSCO Regulator)',
      email: 'regulator@cdsco.gov',
      passwordHash,
      orgId: 'REG001',
      role: 'REGULATOR',
      isActive: true,
      createdAt: new Date()
    }
  );

  // 2. Register Products
  const products = [
    {
      gtin: '08901234567890',
      name: 'Covishield Vaccine',
      composition: 'Recombinant ChAdOx1-S 5ml',
      dosageForm: 'Injectable Suspension',
      strength: '5ml vial',
      approvalNo: 'CDSCO-BIO-2026-01'
    },
    {
      gtin: '08902222333344',
      name: 'Amoxicillin 500mg',
      composition: 'Amoxicillin Trihydrate IP',
      dosageForm: 'Capsule',
      strength: '500mg',
      approvalNo: 'CDSCO-ANTI-2026-44'
    },
    {
      gtin: '08905555666677',
      name: 'Insulin Glargine 100IU',
      composition: 'Insulin Glargine 100 units/mL',
      dosageForm: 'Injection Cartridge',
      strength: '3ml',
      approvalNo: 'CDSCO-BIO-2026-88'
    }
  ];

  for (const prod of products) {
    await fabricGateway.submitTransaction(
      'registerProduct',
      'MFG001',
      'MANUFACTURER',
      prod.gtin,
      prod.name,
      prod.composition,
      prod.dosageForm,
      'MFG001',
      prod.approvalNo
    );
    db.products.push({ ...prod, manufacturerId: 'MFG001' });
  }

  // 3. Batches
  // Batch A: Active Cold Chain Vaccine
  await fabricGateway.submitTransaction(
    'createBatch',
    'MFG001',
    'MANUFACTURER',
    'LOT-COVI-2026A',
    '08901234567890',
    '2026-01-10',
    '2028-01-09',
    5000,
    'sha256:qc_covishield_e3b0c44',
    'MFG001'
  );
  db.batches.push({
    batchId: 'LOT-COVI-2026A',
    gtin: '08901234567890',
    mfgDate: new Date('2026-01-10'),
    expDate: new Date('2028-01-09'),
    quantity: 5000,
    status: 'ACTIVE',
    qcCertHash: 'sha256:qc_covishield_e3b0c44',
    createdAt: new Date()
  });

  // Batch B: Active Antibiotic
  await fabricGateway.submitTransaction(
    'createBatch',
    'MFG001',
    'MANUFACTURER',
    'LOT-AMOX-2026B',
    '08902222333344',
    '2026-02-01',
    '2028-02-01',
    10000,
    'sha256:qc_amox_99f2b1',
    'MFG001'
  );
  db.batches.push({
    batchId: 'LOT-AMOX-2026B',
    gtin: '08902222333344',
    mfgDate: new Date('2026-02-01'),
    expDate: new Date('2028-02-01'),
    quantity: 10000,
    status: 'ACTIVE',
    qcCertHash: 'sha256:qc_amox_99f2b1',
    createdAt: new Date()
  });

  // Batch C: Recalled Insulin Batch (Simulating recall by CDSCO)
  await fabricGateway.submitTransaction(
    'createBatch',
    'MFG001',
    'MANUFACTURER',
    'LOT-INSU-RECALL',
    '08905555666677',
    '2025-11-01',
    '2027-11-01',
    2000,
    'sha256:qc_insu_bad_batch',
    'MFG001'
  );
  db.batches.push({
    batchId: 'LOT-INSU-RECALL',
    gtin: '08905555666677',
    mfgDate: new Date('2025-11-01'),
    expDate: new Date('2027-11-01'),
    quantity: 2000,
    status: 'RECALLED',
    qcCertHash: 'sha256:qc_insu_bad_batch',
    createdAt: new Date()
  });

  // 4. Register Serialized Items
  // Item 1: Genuine In-Transit
  const serial1 = 'LOT-COVI-2026A-SN-000001';
  // Item 2: Genuine In Pharmacy Stock
  const serial2 = 'LOT-COVI-2026A-SN-000002';
  // Item 3: Genuine Dispensed to Patient
  const serial3 = 'LOT-AMOX-2026B-SN-000003';
  // Item 4: Recalled Unit
  const serial4 = 'LOT-INSU-RECALL-SN-000004';

  await fabricGateway.submitTransaction('registerSerials', 'MFG001', 'MANUFACTURER', 'LOT-COVI-2026A', JSON.stringify([serial1, serial2]), 'UNIT', 'MFG001');
  await fabricGateway.submitTransaction('registerSerials', 'MFG001', 'MANUFACTURER', 'LOT-AMOX-2026B', JSON.stringify([serial3]), 'UNIT', 'MFG001');
  await fabricGateway.submitTransaction('registerSerials', 'MFG001', 'MANUFACTURER', 'LOT-INSU-RECALL', JSON.stringify([serial4]), 'UNIT', 'MFG001');

  // 5. Transfer serial2 & serial3 to Pharmacy
  // First ship to Distributor
  await fabricGateway.submitTransaction('createShipment', 'MFG001', 'MANUFACTURER', 'SHP-COLD-001', 'MFG001', 'DIST001', JSON.stringify([serial1, serial2]));
  await fabricGateway.submitTransaction('receiveShipment', 'DIST001', 'DISTRIBUTOR', 'SHP-COLD-001', 'DIST001', JSON.stringify([serial1, serial2]));

  // Ship serial2 to Pharmacy
  await fabricGateway.submitTransaction('createShipment', 'DIST001', 'DISTRIBUTOR', 'SHP-PHARM-002', 'DIST001', 'PHARM001', JSON.stringify([serial2]));
  await fabricGateway.submitTransaction('receiveShipment', 'PHARM001', 'PHARMACY', 'SHP-PHARM-002', 'PHARM001', JSON.stringify([serial2]));

  // Move serial3 directly to Pharmacy and DISPENSE
  await fabricGateway.submitTransaction('createShipment', 'MFG001', 'MANUFACTURER', 'SHP-DIR-003', 'MFG001', 'PHARM001', JSON.stringify([serial3]));
  await fabricGateway.submitTransaction('receiveShipment', 'PHARM001', 'PHARMACY', 'SHP-DIR-003', 'PHARM001', JSON.stringify([serial3]));
  await fabricGateway.submitTransaction('dispenseItem', 'PHARM001', 'PHARMACY', serial3, 'PHARM001');

  // 6. Execute Recall on LOT-INSU-RECALL
  await fabricGateway.submitTransaction('recallBatch', 'REG001', 'REGULATOR', 'LOT-INSU-RECALL', 'Class I Recall: Sub-potency and packaging seal defect detected');
  db.recalls.push({
    id: db.getNextRecallId(),
    batchId: 'LOT-INSU-RECALL',
    initiatedBy: 'REG001',
    reason: 'Class I Recall: Sub-potency and packaging seal defect detected',
    severity: 'CLASS_I',
    createdAt: new Date()
  });

  // Sync items in off-chain database
  db.items.push(
    { serial: serial1, batchId: 'LOT-COVI-2026A', level: 'UNIT', ownerId: 'DIST001', status: 'IN_STOCK', updatedAt: new Date() },
    { serial: serial2, batchId: 'LOT-COVI-2026A', level: 'UNIT', ownerId: 'PHARM001', status: 'IN_STOCK', updatedAt: new Date() },
    { serial: serial3, batchId: 'LOT-AMOX-2026B', level: 'UNIT', ownerId: 'PHARM001', status: 'DISPENSED', updatedAt: new Date() },
    { serial: serial4, batchId: 'LOT-INSU-RECALL', level: 'UNIT', ownerId: 'MFG001', status: 'RECALLED', updatedAt: new Date() }
  );

  // 7. Cold chain sensor readings for SHP-COLD-001
  const sim = new ColdChainSimulator({ shipmentId: 'SHP-COLD-001', deviceId: 'SENSOR-TRUCK-01' });
  await mqttIngestService.processTelemetry(sim.generateNormalReading());
  await mqttIngestService.processTelemetry(sim.generateNormalReading());

  console.log('SUCCESS: Demo data loaded into ledger and off-chain database.');
  console.log('Ready for testing!\n');
}

const PORT = 5000;
server.listen(PORT, async () => {
  await seedRichDemoData();
  console.log(`API Gateway listening on http://localhost:${PORT}`);
});
