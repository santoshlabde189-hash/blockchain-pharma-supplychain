# PharmaTrace - Project Implementation Summary

PharmaTrace is an end-to-end pharmaceutical supply chain traceability system built on Hyperledger Fabric, Node.js/Express, and React (Vite).

---

## 1. Architecture & Deliverables

### A. Blockchain Layer (`chaincode/pharma-cc/`)
- **Technology**: Hyperledger Fabric Contract API (TypeScript)
- **World State Assets**: `Participant`, `Product`, `Batch`, `Item`, `Shipment`
- **Enforced Rules**:
  - Only current owners can initiate transfers or dispense items.
  - Dispensed, destroyed, and recalled items cannot be transferred.
  - Unit double-dispense prevention and expiry date verification.
  - Cold-chain temperature/humidity breach detection (`flagExcursion`) and periodic hash anchoring (`anchorSensorHash`).
  - Batch recall propagation across all downstream holders.
  - Events emitted: `BatchCreated`, `ShipmentCreated`, `ShipmentReceived`, `ShipmentRejected`, `ExcursionFlagged`, `ItemDispensed`, `BatchRecalled`, `ParticipantSuspended`.

### B. Off-Chain Database & Gateway (`backend/`)
- **Technology**: Node.js, Express, TypeScript, Zod, Socket.IO, MQTT
- **Database Schema**: Relational models in `prisma/schema.prisma` matching `04-Database-Design.md`.
- **Gateway & Sync**:
  - `fabricGateway.ts`: Submits transactions and evaluates chaincode queries.
  - `eventListener.ts`: Subscribes to blockchain block/transaction events and updates off-chain state.
  - `mqttIngest.ts`: Ingests IoT telemetry from MQTT, checks storage temperature bounds (2°C to 8°C cold chain, 15°C to 25°C CRT, <65% RH), triggers alerts, and anchors window hashes.
  - `notify.ts`: Dispatches WebSocket alerts (`recall:new`, `excursion:alert`, `shipment:update`).
- **REST APIs (`/api/v1`)**: Auth, Orgs, Products, Batches, Shipments, Inventory, Dispensing, Recalls, Alerts, and Public Verification.

### C. Client Layer (`frontend/`)
- **Technology**: React 18, Vite, TypeScript, Tailwind CSS
- **Features**:
  - Public Verification page (`/verify`): Allows consumers and inspectors to check drug serial authenticity with real-time status badges (`GENUINE`, `DISPENSED`, `RECALLED`, `EXPIRED`, `UNKNOWN`).
  - Operational Dashboard (`/dashboard`): Live KPIs, custody inventory, and shipment tracking.
  - Authentication (`/login`): Role-based access control.

### D. IoT Cold Chain Simulator (`iot-simulator/`)
- Generates normal telemetry (2–8°C) and synthetic excursion breaches (e.g. 14–16°C).

---

## 2. Automated Test Suite Results

All test suites pass across all layers:

```text
PASS tests/chaincode/contract.test.ts (6 tests)
PASS tests/api/api.test.ts (5 tests)
PASS tests/api/iot.test.ts (3 tests)
PASS tests/e2e/e2e.test.ts (1 test)

Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        6.001 s
```

---

## 3. Running the Project

### Running Automated Tests
```powershell
npx jest
```

### Running Backend API Gateway
```powershell
npm --prefix backend run dev
```

### Running Frontend Application
```powershell
npm --prefix frontend run dev
```
Navigate to `http://localhost:3000/verify` for the public verification portal.
