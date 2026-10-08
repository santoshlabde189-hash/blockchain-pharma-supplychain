/**
 * IoT Cold Chain Sensor Simulator for PharmaTrace
 * Generates synthetic temperature/humidity telemetry and simulates normal conditions as well as excursion breaches.
 */

export interface SimulatorOptions {
  shipmentId: string;
  deviceId: string;
  intervalMs?: number;
  onReading?: (reading: any) => void;
}

export class ColdChainSimulator {
  private shipmentId: string;
  private deviceId: string;
  private lat = 19.076;
  private lng = 72.8777;

  constructor(options: SimulatorOptions) {
    this.shipmentId = options.shipmentId;
    this.deviceId = options.deviceId;
  }

  // Generates normal cold chain reading (2.0°C to 8.0°C)
  generateNormalReading() {
    const temperature = +(3.5 + Math.random() * 3.0).toFixed(2); // 3.5°C to 6.5°C
    const humidity = +(45.0 + Math.random() * 10.0).toFixed(1);  // 45% to 55%
    this.lat += 0.002;
    this.lng += 0.002;

    return {
      deviceId: this.deviceId,
      shipmentId: this.shipmentId,
      temperature,
      humidity,
      lat: +this.lat.toFixed(6),
      lng: +this.lng.toFixed(6),
      ts: new Date().toISOString(),
      sig: `sig_${this.deviceId}_${Date.now()}`
    };
  }

  // Generates temperature breach reading (e.g., 14.5°C)
  generateExcursionReading(temp = 14.5, humidity = 72.0) {
    this.lat += 0.002;
    this.lng += 0.002;

    return {
      deviceId: this.deviceId,
      shipmentId: this.shipmentId,
      temperature: temp,
      humidity,
      lat: +this.lat.toFixed(6),
      lng: +this.lng.toFixed(6),
      ts: new Date().toISOString(),
      sig: `sig_excursion_${Date.now()}`
    };
  }
}
