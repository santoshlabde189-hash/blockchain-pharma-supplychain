# 11. Testing Strategy

| Level | Tooling | Scope |
|---|---|---|
| Chaincode unit tests | Jest/Mocha + mock stub | Every function, role checks, edge cases (double dispense, wrong owner, expired batch) |
| API tests | Jest + Supertest | Auth, RBAC, validation, error paths |
| Integration | Docker test network | API ↔ chaincode ↔ DB sync |
| E2E | Playwright / Cypress | Full flow from batch creation to dispense and recall |
| Load | k6 or Artillery | Verify endpoint and transfer throughput |
| Security | OWASP ZAP, `npm audit` | Common web vulnerabilities, dependency issues |
| IoT | Simulator scenarios | Normal, excursion, missing data, duplicate messages |

### Key Test Scenarios
1. Non-owner tries to transfer an item → rejected.
2. Same serial dispensed twice → second attempt rejected.
3. Shipment received with mismatched serials → flagged.
4. Recalled lot scanned on verify page → shows RECALLED.
5. Unknown serial scanned → UNKNOWN / possible counterfeit.
6. Temperature above range → excursion flagged and alert delivered.
7. Suspended organization attempts a transaction → rejected.
