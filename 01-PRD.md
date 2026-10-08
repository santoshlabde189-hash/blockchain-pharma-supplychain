# 1. Product Requirements Document (PRD)

## 1.1 Overview
PharmaTrace is a permissioned-blockchain platform that records every custody change of a medicine, from manufacturer to patient, in a tamper-proof ledger. It allows stakeholders and consumers to verify authenticity, monitor storage conditions, and execute fast recalls.

## 1.2 Problem Statement
- Counterfeit and substandard drugs enter the legitimate supply chain.
- Supply chain data is siloed across manufacturers, distributors and pharmacies, with no single source of truth.
- Recalls are slow because downstream holders of a batch cannot be identified quickly.
- Cold-chain breaches (temperature excursions) are poorly documented and hard to prove.
- Paper and centralized records can be altered or lost.

## 1.3 Goals
| # | Goal |
|---|------|
| G1 | Provide immutable, end-to-end traceability of every serialized drug unit/batch |
| G2 | Allow anyone to verify a product's authenticity by scanning a QR/DataMatrix code |
| G3 | Enable batch recall and notify all downstream holders within minutes |
| G4 | Record and alert on cold-chain temperature excursions |
| G5 | Prevent double dispensing and unauthorized ownership transfer |
| G6 | Align with GS1 / EPCIS standards for interoperability |

## 1.4 Non-Goals (v1)
- Payments/invoicing or a token economy
- Full ERP replacement
- Storing patient personal data on-chain
- Public (permissionless) blockchain deployment

## 1.5 Target Users / Personas
| Persona | Description | Key needs |
|---|---|---|
| **Manufacturer** | Produces and serializes drugs | Create batches, generate codes, initiate shipments, issue recalls |
| **Distributor / Wholesaler** | Stores and moves drugs | Receive, verify, store, forward shipments; cold-chain logs |
| **Pharmacy / Hospital** | Dispenses to patients | Receive, verify, dispense, return stock |
| **Regulator (e.g., CDSCO/FDA)** | Oversight body | Read-only audit access, recall authority, license management |
| **Consumer / Patient** | End user | Scan a pack and check authenticity (no login) |
| **System Admin** | Platform operator | Onboard organizations, manage identities and nodes |

## 1.6 User Stories
**Manufacturer**
- As a manufacturer, I can register a product and create a batch with expiry date and QC certificate.
- As a manufacturer, I can generate serialized QR/DataMatrix codes for each unit/carton.
- As a manufacturer, I can ship a batch to a distributor and the ownership transfer is recorded.
- As a manufacturer, I can recall a batch and all downstream holders are flagged.

**Distributor**
- As a distributor, I can scan and receive a shipment, and the system checks quantities and serials against the ledger.
- As a distributor, I can see a live temperature graph for in-transit shipments and get alerts on breaches.
- As a distributor, I can split a shipment and forward it to pharmacies.

**Pharmacy**
- As a pharmacy, I can verify a unit is genuine before accepting it.
- As a pharmacy, I can mark a unit as dispensed, and the system blocks dispensing the same serial twice.
- As a pharmacy, I get an alert if stock I hold belongs to a recalled batch.

**Regulator**
- As a regulator, I can view the complete history of any batch/serial.
- As a regulator, I can initiate or approve recalls and suspend a participant's license.

**Consumer**
- As a consumer, I can scan the QR on a pack and see: product, manufacturer, batch, expiry, authenticity status, and recall status.

## 1.7 Functional Requirements

### FR-1 Identity & Access
- FR-1.1 Organization onboarding with license number verification by admin/regulator.
- FR-1.2 Role-based access control (RBAC) for all actions.
- FR-1.3 Certificate-based identity on blockchain (Fabric CA), JWT-based login on web.

### FR-2 Product & Batch Management
- FR-2.1 Register products (GTIN, name, composition, strength, dosage form).
- FR-2.2 Create batches (lot number, manufacturing date, expiry date, quantity, QC certificate hash).
- FR-2.3 Generate serial numbers and GS1 DataMatrix/QR codes.
- FR-2.4 Support aggregation: unit → carton → pallet.

### FR-3 Custody Transfer
- FR-3.1 Initiate shipment (sender → receiver) with listed serials/cartons.
- FR-3.2 Receiver confirms receipt; mismatches are flagged.
- FR-3.3 Only the current owner may transfer an item.
- FR-3.4 Record returns and destruction events.

### FR-4 Verification
- FR-4.1 Public verification page: scan code → see authenticity status and history summary.
- FR-4.2 Detect duplicate, unknown, expired and recalled serials.
- FR-4.3 Full history view (restricted) for authorized roles.

### FR-5 Dispensing
- FR-5.1 Pharmacy marks a unit as dispensed (no patient data stored on-chain).
- FR-5.2 Block repeat dispensing of the same serial.

### FR-6 Recall Management
- FR-6.1 Manufacturer/regulator initiates a recall by lot with a reason.
- FR-6.2 Automatic identification of all current holders of the lot.
- FR-6.3 Notifications (in-app, email) to affected participants.
- FR-6.4 Recall status shown on consumer verification.

### FR-7 Cold Chain Monitoring
- FR-7.1 Ingest temperature/humidity/GPS readings from IoT devices.
- FR-7.2 Store readings off-chain; anchor periodic hashes and excursion events on-chain.
- FR-7.3 Real-time alerts when thresholds are breached.

### FR-8 Reporting & Audit
- FR-8.1 Dashboards: stock, shipments in transit, alerts, recalls.
- FR-8.2 Exportable audit trail (CSV/PDF) with transaction IDs.
- FR-8.3 Blockchain explorer view of block and transaction hashes.

## 1.8 Non-Functional Requirements
| Category | Requirement |
|---|---|
| Performance | Query verification result in < 2 s; transaction commit < 5 s on test network |
| Scalability | Batch/carton-level on-chain recording; support 100k+ units per batch via aggregation |
| Availability | 99% target for pilot; at least 2 peers per org |
| Security | TLS everywhere, signed transactions, RBAC, encrypted secrets |
| Privacy | Pricing and commercial data kept in private data collections/off-chain; no personal data on-chain |
| Auditability | All state changes traceable to an identity and timestamp |
| Interoperability | GS1 identifiers and EPCIS-compatible events |
| Usability | Mobile-friendly UI; scan flow in 3 taps or fewer |
| Compliance | Designed to align with DSCSA, EU FMD and CDSCO track-and-trace expectations |

## 1.9 Success Metrics (KPIs)
- Verification accuracy: 100% detection of unregistered/duplicate serials in test scenarios
- Recall time: affected holders identified in < 1 minute
- Cold-chain breach alert latency: < 10 seconds from reading to alert
- Transfer success rate: > 99% of transfers confirmed without mismatch
- Pilot adoption: at least 4 organizations (1 manufacturer, 1 distributor, 1 pharmacy, 1 regulator)

## 1.10 Assumptions and Constraints
- Participants are known, licensed entities (permissioned network).
- Physical-to-digital link depends on correct scanning and tamper-evident packaging.
- Free tooling only; local/VM-hosted blockchain for demo.
