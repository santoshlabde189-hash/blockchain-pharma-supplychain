# 7. IoT / Cold Chain Design

## 7.1 Flow
```
Sensor/Simulator → MQTT (Mosquitto) → Ingestion Service → PostgreSQL
                                           │
                                           ├─ threshold check → flagExcursion (chain) + alert
                                           └─ hourly hash → anchorSensorHash (chain)
```

## 7.2 MQTT Topics
- `shipments/{shipmentId}/telemetry`
- `devices/{deviceId}/status`

## 7.3 Payload Example
```json
{
  "deviceId": "ESP32-001",
  "shipmentId": "SHP-2026-0001",
  "temperature": 4.8,
  "humidity": 52.1,
  "lat": 19.2813,
  "lng": 72.8561,
  "ts": "2026-03-01T10:15:00Z",
  "sig": "<device signature>"
}
```

## 7.4 Thresholds (configurable per product)
| Storage class | Range |
|---|---|
| Cold chain | 2 °C to 8 °C |
| Controlled room temperature | 15 °C to 25 °C |
| Humidity | below 65% RH (default) |

## 7.5 Demo Approach
Use a Node.js simulator script or Node-RED to publish fake readings, including deliberate excursions, to demonstrate alerts without hardware.
