# 6. Frontend Design

## 6.1 Pages by Role
| Page | Roles |
|---|---|
| Login / Register | All |
| Dashboard (KPIs, charts, alerts) | All (role-specific widgets) |
| Product & Batch Management | Manufacturer |
| QR / DataMatrix Generator | Manufacturer |
| Create Shipment | Manufacturer, Distributor |
| Incoming Shipments (scan and receive) | Distributor, Pharmacy |
| Inventory | Manufacturer, Distributor, Pharmacy |
| Dispense (scan to dispense) | Pharmacy |
| Cold Chain Monitor (live chart + map) | Manufacturer, Distributor, Regulator |
| Recall Center | Manufacturer, Regulator (create); all (view) |
| Trace Timeline (serial history) | Authorized |
| Audit Explorer (block/tx hashes) | Regulator, Admin |
| Organization Management | Admin, Regulator |
| **Public Verify Page** | Everyone, no login |

## 6.2 Key UI Components
- Scanner component (camera-based, html5-qrcode)
- Status badges (GENUINE, IN_TRANSIT, RECALLED, EXPIRED, DISPENSED)
- Timeline component for custody history
- Temperature line chart with threshold band
- Shipment map (Leaflet) with route points
- Data tables with filters and export

## 6.3 Frontend Tech
React (Vite) + TypeScript + Tailwind CSS + shadcn/ui + React Router + TanStack Query + Zustand + React Hook Form + Zod + Recharts + React Leaflet + html5-qrcode + Socket.IO client.
