# 2. System Architecture

## 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│   React Web App (Dashboard)   │   Public Verify Page (QR scan)       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTPS (REST + WebSocket)
┌──────────────────────────────▼───────────────────────────────────────┐
│                         API / SERVICE LAYER                          │
│  Express API Gateway                                                 │
│  ├─ Auth Service (JWT, RBAC)                                         │
│  ├─ Product & Batch Service                                          │
│  ├─ Shipment Service                                                 │
│  ├─ Verification Service                                             │
│  ├─ Recall & Notification Service (Socket.IO, Email)                 │
│  └─ IoT Ingestion Service (MQTT subscriber)                          │
└───────┬───────────────────────┬──────────────────────┬───────────────┘
        │ Fabric SDK            │ SQL / Prisma         │ S3 API
┌───────▼──────────┐   ┌────────▼─────────┐   ┌────────▼───────────┐
│ BLOCKCHAIN LAYER │   │ OFF-CHAIN DB     │   │ FILE STORAGE       │
│ Hyperledger      │   │ PostgreSQL       │   │ MinIO / IPFS       │
│ Fabric Network   │   │ (users, cache,   │   │ (certificates,     │
│ ├─ Orderer(s)    │   │  sensor data,    │   │  invoices, CoA)    │
│ ├─ Peers (orgs)  │   │  notifications)  │   └────────────────────┘
│ ├─ Fabric CA     │   └──────────────────┘
│ └─ Chaincode     │
└───────▲──────────┘
        │ events
┌───────┴──────────────────────────────────────────────────────────────┐
│                       IoT / EDGE LAYER                               │
│  Temp/Humidity/GPS sensors → MQTT (Mosquitto) → Ingestion Service    │
│  Barcode/QR scanners at each handover                                │
└──────────────────────────────────────────────────────────────────────┘
```

## 2.2 Component Responsibilities

| Component | Responsibility |
|---|---|
| React Frontend | UI for all roles; scanning; dashboards; real-time alerts |
| Express API | Business logic, auth, validation, orchestration between chain and DB |
| Fabric SDK Gateway | Submit/evaluate transactions; listen to chaincode events |
| Chaincode | Source of truth for ownership, status, history, recall flags |
| Fabric CA | Issues certificates to orgs and users |
| PostgreSQL | Users, org profiles, read-optimized copy of ledger data, sensor readings, notifications |
| MinIO/IPFS | Documents; only SHA-256 hash stored on-chain |
| MQTT Broker | Receives sensor telemetry |
| Event Listener | Syncs chain events into PostgreSQL for fast queries |

## 2.3 Network Topology (Fabric)

| Item | Setup (Dev / Demo) |
|---|---|
| Organizations | Manufacturer Org, Distributor Org, Pharmacy Org, Regulator Org |
| Peers | 1-2 per org |
| Orderer | Raft ordering service (1 node in dev; 3+ in pilot) |
| Channel | `pharmachannel` (shared); optional private channels/collections per pair of orgs |
| State DB | CouchDB (rich queries) |
| Endorsement policy | Transfer: sender org AND receiver org; Recall: manufacturer OR regulator |

## 2.4 Key Data Flows

### Flow A: Batch creation and shipment
1. Manufacturer logs in → creates product/batch in UI.
2. API validates input → submits `createBatch` to chaincode.
3. Chaincode checks role, writes batch state, emits `BatchCreated` event.
4. API generates serials and QR/DataMatrix codes; QC certificate stored in MinIO, hash on-chain.
5. Manufacturer creates shipment → `createShipment` records pending transfer.
6. Distributor scans and confirms → `receiveShipment` validates and updates owner.

### Flow B: Consumer verification
1. Consumer scans QR → opens `/verify?gtin=...&lot=...&serial=...`.
2. API calls `verifyProduct` (evaluate, read-only).
3. Returns status: GENUINE / DISPENSED / RECALLED / EXPIRED / UNKNOWN, plus manufacturer and batch info.

### Flow C: Recall
1. Manufacturer or regulator calls `recallBatch(lot, reason)`.
2. Chaincode marks the lot as RECALLED and emits `BatchRecalled` event.
3. Event listener identifies current holders (query by lot and owner), creates notifications, pushes via Socket.IO and email.
4. Verification and dispensing for that lot are blocked.

### Flow D: Cold-chain excursion
1. Sensor publishes to MQTT topic `shipments/{shipmentId}/telemetry`.
2. Ingestion service stores reading in PostgreSQL.
3. If value is out of range → call `flagExcursion` on chain and push real-time alert.
4. Periodically (e.g., every hour) hash of the readings window is anchored on-chain.

## 2.5 On-Chain vs Off-Chain Split

| On-chain (Fabric) | Off-chain (PostgreSQL / MinIO) |
|---|---|
| Product and batch core fields | User accounts, passwords (hashed), sessions |
| Serial/carton ownership and status | Full-resolution sensor streams |
| Shipment and custody events | Documents (PDF, images) |
| Recall flags | Notification logs |
| Document and sensor-window hashes | Read-optimized copies for dashboards |
| Excursion flags | Analytics and reports |

> Rule: no personal data and no large files on-chain.
