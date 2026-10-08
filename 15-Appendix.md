# Appendix A: Glossary
| Term | Meaning |
|---|---|
| GTIN | Global Trade Item Number identifying a product |
| Serial / SGTIN | Unique serial number per unit, combined with GTIN |
| EPCIS | GS1 standard for sharing supply chain event data |
| DSCSA | US Drug Supply Chain Security Act |
| FMD | EU Falsified Medicines Directive |
| CDSCO | Central Drugs Standard Control Organisation (India) |
| Chaincode | Smart contract in Hyperledger Fabric |
| MSP | Membership Service Provider (Fabric identity) |
| Cold chain | Temperature-controlled supply chain |
| Aggregation | Parent-child packaging relationship (unit → carton → pallet) |


# Appendix B: Environment Variables (example)
```
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/pharmatrace
JWT_SECRET=change_me
JWT_EXPIRES_IN=1h
FABRIC_CHANNEL=pharmachannel
FABRIC_CHAINCODE=pharma-cc
FABRIC_CCP_PATH=./config/connection-org1.json
MQTT_URL=mqtt://localhost:1883
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
SMTP_HOST=smtp.mailtrap.io
```
