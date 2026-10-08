# 9. Project Structure

```
pharma-trace/
├── README.md
├── docker-compose.yml
├── docs/
│   └── PharmaTrace_Project_Docs.md
├── network/                    # Fabric network config
│   ├── configtx.yaml
│   ├── crypto-config/ (or CA scripts)
│   └── scripts/ (up.sh, down.sh, deployCC.sh)
├── chaincode/
│   └── pharma-cc/
│       ├── src/ (batch.ts, item.ts, shipment.ts, recall.ts, access.ts)
│       └── package.json
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── app.ts
│       ├── config/
│       ├── middleware/ (auth.ts, rbac.ts, validate.ts)
│       ├── routes/
│       ├── controllers/
│       ├── services/ (fabricGateway.ts, eventListener.ts, mqttIngest.ts, notify.ts)
│       └── utils/
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── services/ (api.ts, socket.ts)
│       └── store/
├── iot-simulator/
│   └── simulator.js
└── tests/
    ├── chaincode/
    ├── api/
    └── e2e/
```
