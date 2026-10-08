# 13. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Bad data entered at source | Ledger contains wrong but immutable info | Validation, scanner-based capture, QC attestations, regulator audits |
| Physical-digital gap (cloned labels) | Counterfeits appear genuine | Duplicate-scan detection, tamper-evident packaging, optional NFC tags |
| Throughput limits | Slow transactions at unit level | Record at batch/carton level; aggregation; batch submit |
| Fabric complexity | Delays | Start from fabric-samples test-network; use Fabric Gateway SDK |
| Privacy/regulatory | Legal exposure | No personal data on-chain; private data collections; legal review |
| Governance disputes | Stalled network | Define membership, node and dispute policy before pilot |
| Adoption resistance | Low usage | Simple scan UX, ERP integration via EPCIS APIs |
| Key loss/compromise | Identity misuse | HSM/secret manager, CA revocation, rotation policy |
