# 10. Development Roadmap

| Phase | Duration | Deliverables |
|---|---|---|
| **0. Setup** | Week 1 | Repo, Docker, Fabric test-network running, tooling installed |
| **1. Design** | Week 1-2 | Final data model, access matrix, API contract, UI wireframes |
| **2. Chaincode MVP** | Week 2-4 | Participants, products, batches, serials, transfer, receive, verify |
| **3. Backend & DB** | Week 4-6 | Express API, Fabric gateway, auth/RBAC, event listener, PostgreSQL sync |
| **4. Frontend MVP** | Week 5-8 | Login, dashboard, batch creation, shipments, inventory, public verify page |
| **5. Dispense & Recall** | Week 8-9 | Dispense logic, recall flow, notifications |
| **6. IoT & Cold Chain** | Week 9-10 | MQTT ingestion, simulator, live charts, excursion alerts |
| **7. Hardening** | Week 10-11 | Security review, validation, error handling, performance checks |
| **8. Testing & Demo** | Week 11-12 | Full test suite, demo data, demo scripts, documentation |
| **9. Pilot (optional)** | Post v1 | Real participants, real scanners, monitoring |

### MVP Scope (minimum to demo)
Create batch → generate QR → ship → receive → verify via scan → dispense → recall → temperature alert.
