# PharmaTrace Demo Test Data Cheat Sheet

Use these accounts and serial numbers to test all roles, pages, and edge cases.

---

## 1. Public Verification Test Cases (`/verify`)

You can test these without logging in at **`http://localhost:3000/verify`**:

| Test Scenario | Serial Number to Enter | Expected Result Status | Details Shown |
|---|---|---|---|
| **1. Genuine Product (In Stock)** | `LOT-COVI-2026A-SN-000002` | **`GENUINE`** (Green) | Covishield Vaccine, Batch: `LOT-COVI-2026A`, Exp: `2028-01-09` |
| **2. Dispensed Product (Already Sold)** | `LOT-AMOX-2026B-SN-000003` | **`DISPENSED`** (Amber) | Amoxicillin 500mg, Batch: `LOT-AMOX-2026B`. Indicates item has already reached a patient |
| **3. Recalled Product (Dangerous Batch)** | `LOT-INSU-RECALL-SN-000004` | **`RECALLED`** (Red) | Insulin Glargine. Flagged by CDSCO Regulator with active recall alert |
| **4. Counterfeit / Unregistered Item** | `FAKE-DRUG-SERIAL-999` | **`UNKNOWN`** (Gray) | "Serial not found in ledger" – flags counterfeit or diversion |

---

## 2. Demo User Logins (`/login`)

Use these pre-configured user credentials to log into the supply chain dashboard at **`http://localhost:3000/login`**:

| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| **Manufacturer** | `manufacturer@pharma.com` | `password123` | Register products, create batches, generate serialized QR codes |
| **Distributor** | `distributor@logistics.com` | `password123` | Receive shipments, manage warehouse stock, view cold-chain sensor status |
| **Pharmacy** | `pharmacy@citymed.com` | `password123` | View pharmacy inventory, accept incoming batches, dispense units to patients |
| **Regulator (CDSCO)** | `regulator@cdsco.gov` | `password123` | Audit transactions, issue recalls, suspend organizations |

---

## 3. How to Start the Demo

### Terminal 1 (Backend & Ledger):
```powershell
npx ts-node demo.ts
```

### Terminal 2 (Frontend App):
```powershell
npm --prefix frontend run dev
```

Then visit **`http://localhost:3000`** in your web browser.
