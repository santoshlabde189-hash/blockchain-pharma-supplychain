# 8. Security Design

| Area | Measure |
|---|---|
| Identity | Fabric CA certificates; wallet per user; attribute-based access in chaincode |
| Web auth | JWT (short expiry) + refresh token; bcrypt password hashing |
| Transport | TLS for all services, mutual TLS between Fabric nodes |
| Authorization | RBAC middleware in API and checks in chaincode (defense in depth) |
| Key management | Private keys never in the repo; use environment variables / Docker secrets; HSM in production |
| Input validation | Zod/Joi schemas on every endpoint |
| API protection | Helmet, CORS allow-list, rate limiting (strict on public verify) |
| Data integrity | Documents hashed (SHA-256) and hash stored on-chain |
| Privacy | No patient data on-chain; private data collections for commercial info |
| IoT | Device signing, MQTT auth and TLS |
| Logging | Structured logs (Winston); audit log of admin actions |
| Dependency safety | `npm audit`, Dependabot, pinned versions |

**Threats considered:** counterfeit code cloning (mitigated by duplicate-scan detection and one-time dispense), insider tampering (endorsement policies, immutable history), replay attacks (nonces/timestamps), DoS on public verify (rate limit, caching), stolen credentials (short-lived tokens, revocation via CA).
