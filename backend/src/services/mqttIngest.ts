import { db } from './db';
import { fabricGateway } from './fabricGateway';
import { notifyService } from './notify';
import crypto from 'crypto';

export interface TelemetryPayload {
  deviceId: string;
  shipmentId: string;
  temperature: number;
  humidity: number;
  lat: number;
  lng: number;
  ts: string;
  sig?: string;
}

export class MqttIngestService {
  private readingsBuffer: Map<string, TelemetryPayload[]> = new Map();

  // Storage class temperature thresholds per docs/07-IoT-Cold-Chain.md
  // Cold chain: 2°C to 8°C. Controlled room temp: 15°C to 25°C. Max humidity: 65%
  private minTemp = 2.0;
  private maxTemp = 8.0;
  private maxHumidity = 65.0;

  public async processTelemetry(payload: TelemetryPayload): Promise<{ excursion: boolean }> {
    const { deviceId, shipmentId, temperature, humidity, lat, lng, ts } = payload;

    // 1. Store reading off-chain in DB
    const reading = {
      id: db.getNextSensorId(),
      shipmentId,
      deviceId,
      temperatureC: temperature,
      humidityPct: humidity,
      latitude: lat,
      longitude: lng,
      recordedAt: new Date(ts)
    };
    db.sensorReadings.push(reading);

    // 2. Buffer for periodic hash anchoring
    if (!this.readingsBuffer.has(shipmentId)) {
      this.readingsBuffer.set(shipmentId, []);
    }
    this.readingsBuffer.get(shipmentId)!.push(payload);

    // 3. Check for Cold Chain Excursion
    const isExcursion = temperature < this.minTemp || temperature > this.maxTemp || humidity > this.maxHumidity;

    if (isExcursion) {
      const details = `Cold-chain breach: Temp=${temperature}°C (Limit 2-8°C), Humidity=${humidity}% (Limit <65%)`;

      // Flag on blockchain ledger
      await fabricGateway.submitTransaction(
        'flagExcursion',
        'IOT_GATEWAY',
        'SYSTEM',
        shipmentId,
        details
      );

      // Trigger immediate real-time alert via WebSockets
      notifyService.broadcast('excursion:alert', {
        shipmentId,
        deviceId,
        temperature,
        humidity,
        details,
        timestamp: ts
      });
    }

    return { excursion: isExcursion };
  }

  public async anchorWindow(shipmentId: string): Promise<string | null> {
    const buffer = this.readingsBuffer.get(shipmentId);
    if (!buffer || buffer.length === 0) {
      return null;
    }

    // Compute SHA-256 hash of readings window
    const dataStr = JSON.stringify(buffer);
    const windowHash = crypto.createHash('sha256').update(dataStr).digest('hex');
    const timestamp = new Date().toISOString();

    // Anchor hash on-chain
    await fabricGateway.submitTransaction(
      'anchorSensorHash',
      'IOT_GATEWAY',
      'SYSTEM',
      shipmentId,
      windowHash,
      timestamp
    );

    // Clear buffer after anchoring
    this.readingsBuffer.set(shipmentId, []);
    return windowHash;
  }
}

export const mqttIngestService = new MqttIngestService();
