import { mqttIngestService } from '../../backend/src/services/mqttIngest';
import { ColdChainSimulator } from '../../iot-simulator/simulator';
import { db } from '../../backend/src/services/db';
import { fabricGateway } from '../../backend/src/services/fabricGateway';
import { startEventListener } from '../../backend/src/services/eventListener';

describe('Phase 5 & 6: Dispense, Recall & IoT Cold Chain Verification', () => {
  beforeAll(() => {
    startEventListener();
  });

  beforeEach(() => {
    db.clear();
  });

  test('IoT Cold Chain: Ingest normal telemetry within thresholds', async () => {
    const simulator = new ColdChainSimulator({ shipmentId: 'SHP-IOT-001', deviceId: 'DEV-COLD-01' });
    const reading = simulator.generateNormalReading();

    expect(reading.temperature).toBeGreaterThanOrEqual(2.0);
    expect(reading.temperature).toBeLessThanOrEqual(8.0);

    const result = await mqttIngestService.processTelemetry(reading);
    expect(result.excursion).toBe(false);

    // Off-chain DB should record reading
    expect(db.sensorReadings.length).toBe(1);
    expect(db.sensorReadings[0].shipmentId).toBe('SHP-IOT-001');
  });

  test('IoT Cold Chain: Detect temperature breach excursion and flag on-chain', async () => {
    // Register shipment first so chaincode has valid asset
    await fabricGateway.submitTransaction(
      'createShipment',
      'MFG001',
      'MANUFACTURER',
      'SHP-IOT-002',
      'MFG001',
      'DIST001',
      JSON.stringify([])
    );
    db.shipments.push({
      shipmentId: 'SHP-IOT-002',
      fromOrg: 'MFG001',
      toOrg: 'DIST001',
      status: 'IN_TRANSIT',
      excursion: false,
      createdAt: new Date(),
      items: []
    });

    const simulator = new ColdChainSimulator({ shipmentId: 'SHP-IOT-002', deviceId: 'DEV-COLD-02' });
    // Simulate excursion (14.5°C)
    const breachReading = simulator.generateExcursionReading(14.5, 75.0);

    const result = await mqttIngestService.processTelemetry(breachReading);
    expect(result.excursion).toBe(true);

    // Verify shipment was flagged
    const shipment = db.shipments.find(s => s.shipmentId === 'SHP-IOT-002');
    if (shipment) {
      expect(shipment.excursion).toBe(true);
    }
  });

  test('IoT Cold Chain: Periodic window hash anchoring on-chain', async () => {
    const simulator = new ColdChainSimulator({ shipmentId: 'SHP-ANCHOR', deviceId: 'DEV-01' });

    // Ingest 3 readings
    for (let i = 0; i < 3; i++) {
      await mqttIngestService.processTelemetry(simulator.generateNormalReading());
    }

    // Anchor hash
    const windowHash = await mqttIngestService.anchorWindow('SHP-ANCHOR');
    expect(windowHash).toBeDefined();
    expect(windowHash?.length).toBe(64); // SHA-256 hash length
  });
});
