# 5. API Specification

Base URL: `/api/v1`. Auth: `Authorization: Bearer <JWT>`.

## 5.1 Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register user (admin-approved) |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Current user and org |

## 5.2 Organizations
| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/orgs` | Register organization | Admin/Regulator |
| GET | `/orgs` | List organizations | All (limited fields) |
| PATCH | `/orgs/:id/suspend` | Suspend organization | Regulator |

## 5.3 Products and Batches
| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/products` | Register product | Manufacturer |
| GET | `/products` | List products | All |
| POST | `/batches` | Create batch (multipart for QC cert) | Manufacturer |
| GET | `/batches/:id` | Batch details and status | Authorized |
| POST | `/batches/:id/serials` | Generate and register serials | Manufacturer |
| GET | `/batches/:id/codes` | Download QR/DataMatrix codes | Manufacturer |

## 5.4 Shipments
| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/shipments` | Create shipment | Current owner |
| GET | `/shipments` | List shipments (incoming/outgoing) | Participant |
| POST | `/shipments/:id/receive` | Confirm receipt with scanned serials | Receiver |
| POST | `/shipments/:id/reject` | Reject shipment with reason | Receiver |
| GET | `/shipments/:id/telemetry` | Sensor readings | Participant |

## 5.5 Inventory and Dispensing
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/inventory` | Items owned by caller's org | Participant |
| POST | `/dispense` | Mark serial(s) as dispensed | Pharmacy |
| POST | `/returns` | Return items upstream | Pharmacy/Distributor |
| POST | `/destroy` | Record destruction | Owner |

## 5.6 Verification (Public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/verify?gtin=&lot=&serial=` | Public authenticity check (no auth, rate-limited) |
| GET | `/trace/:serial` | Full custody history (auth required) |

**Verify response example**
```json
{
  "status": "GENUINE",
  "product": "Paracetamol 500mg",
  "manufacturer": "ABC Pharma Ltd",
  "batchId": "LOT2026A01",
  "expDate": "2028-01-09",
  "recalled": false,
  "dispensed": false,
  "lastVerifiedBlock": 1245
}
```

## 5.7 Recalls
| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/recalls` | Initiate recall `{batchId, reason, severity}` | Manufacturer/Regulator |
| GET | `/recalls` | List recalls | Participant |
| GET | `/recalls/:id/holders` | Current holders of recalled lot | Manufacturer/Regulator |

## 5.8 Alerts & Audit
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| GET | `/audit/transactions` | Ledger transactions with tx ID and block number |
| GET | `/reports/export?type=` | CSV/PDF export |

**WebSocket events (Socket.IO):** `recall:new`, `excursion:alert`, `shipment:update`.
