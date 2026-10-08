# 3. Blockchain Design

## 3.1 Asset Models (World State)

```json
// Product
{
  "docType": "product",
  "gtin": "08901234567890",
  "name": "Paracetamol 500mg",
  "composition": "Paracetamol IP 500 mg",
  "dosageForm": "Tablet",
  "manufacturerId": "MFG001",
  "approvalNo": "CDSCO-XXXX"
}

// Batch
{
  "docType": "batch",
  "batchId": "LOT2026A01",
  "gtin": "08901234567890",
  "mfgDate": "2026-01-10",
  "expDate": "2028-01-09",
  "quantity": 100000,
  "status": "ACTIVE",            // ACTIVE | RECALLED | EXPIRED
  "qcCertHash": "sha256:...",
  "ownerId": "MFG001",
  "createdAt": "2026-01-10T09:00:00Z"
}

// Unit / Carton (serialized item)
{
  "docType": "item",
  "serial": "SN000000123",
  "level": "UNIT",               // UNIT | CARTON | PALLET
  "parentSerial": "CTN0001",
  "batchId": "LOT2026A01",
  "ownerId": "PHARM045",
  "status": "IN_STOCK"           // CREATED | IN_TRANSIT | IN_STOCK | DISPENSED | RECALLED | DESTROYED
}

// Shipment
{
  "docType": "shipment",
  "shipmentId": "SHP-2026-0001",
  "fromId": "MFG001",
  "toId": "DIST010",
  "items": ["CTN0001", "CTN0002"],
  "status": "IN_TRANSIT",        // CREATED | IN_TRANSIT | RECEIVED | REJECTED
  "excursion": false,
  "createdAt": "..."
}

// Participant
{
  "docType": "participant",
  "id": "PHARM045",
  "name": "City Pharmacy",
  "role": "PHARMACY",            // MANUFACTURER | DISTRIBUTOR | PHARMACY | REGULATOR
  "licenseNo": "MH-XXXX",
  "status": "ACTIVE"             // ACTIVE | SUSPENDED
}
```

## 3.2 Chaincode Functions

| Function | Allowed role | Description |
|---|---|---|
| `registerParticipant` | Regulator/Admin | Register org with license and role |
| `suspendParticipant` | Regulator | Suspend a participant |
| `registerProduct` | Manufacturer | Register product with GTIN |
| `createBatch` | Manufacturer | Create batch with expiry and QC hash |
| `registerSerials` | Manufacturer | Register serial/carton range and aggregation |
| `createShipment` | Owner | Create shipment of owned items (status IN_TRANSIT) |
| `receiveShipment` | Receiver | Confirm receipt, check items match, change owner |
| `rejectShipment` | Receiver | Reject with reason, items return to sender |
| `flagExcursion` | Distributor/Manufacturer/IoT gateway identity | Mark shipment as temperature-breached |
| `anchorSensorHash` | IoT gateway identity | Store hash of sensor window |
| `dispenseItem` | Pharmacy | Mark unit DISPENSED (blocks repeats) |
| `returnItem` | Pharmacy/Distributor | Return stock upstream |
| `destroyItem` | Owner | Record destruction |
| `recallBatch` | Manufacturer/Regulator | Set batch to RECALLED and flag all items |
| `verifyProduct` | Public via API (read) | Return status and trace summary |
| `getItemHistory` | Authorized roles | Return full history via `GetHistoryForKey` |
| `getItemsByBatchAndOwner` | Authorized roles | Rich query for recall targeting |

## 3.3 Business Rules Enforced in Chaincode
1. Only the current owner can transfer or dispense an item.
2. A DISPENSED, DESTROYED or RECALLED item cannot be transferred.
3. Expired batches cannot be shipped or dispensed.
4. Receiver must be an ACTIVE participant with a valid role in the supply chain order (e.g., Pharmacy cannot ship to Manufacturer except through a return).
5. Serial numbers are unique per GTIN.
6. Every transaction records the caller identity (MSP ID and certificate attributes) and timestamp.

## 3.4 Events Emitted
`BatchCreated`, `ShipmentCreated`, `ShipmentReceived`, `ShipmentRejected`, `ExcursionFlagged`, `ItemDispensed`, `BatchRecalled`, `ParticipantSuspended`

## 3.5 Privacy
- **Private data collections** for commercial details (price, quantity agreements) between two orgs.
- Public channel data limited to identifiers, status and custody.

## 3.6 Identity Mapping
- Fabric CA issues each user a certificate with attributes such as `role=PHARMACY`, `orgId=PHARM045`.
- Chaincode reads attributes via the client identity library (`getAttributeValue`) for authorization.
