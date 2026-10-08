# 12. Deployment

## 12.1 Local / Demo
`docker-compose` runs: Fabric network (peers, orderer, CAs, CouchDB), PostgreSQL, MinIO, Mosquitto, backend, frontend.

## 12.2 Free Hosting Options
| Component | Option |
|---|---|
| Frontend | Vercel / Netlify |
| Backend | Render / Railway / Fly.io |
| Database | Supabase / Neon |
| Fabric network | Local machine or free-tier VM (resource-heavy; record a demo video if hosting is not possible) |

## 12.3 Pilot / Production Considerations
- Kubernetes with Fabric operator, 3+ Raft orderers across orgs
- Each organization hosts its own peers
- Backups for CouchDB, PostgreSQL and CA keys
- Monitoring with Prometheus and Grafana; centralized logging
