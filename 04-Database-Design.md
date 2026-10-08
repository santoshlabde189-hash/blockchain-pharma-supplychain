# 4. Database Design

PostgreSQL stores off-chain data and a synced read model of the ledger.

## 4.1 Tables

```sql
CREATE TABLE organizations (
  id            VARCHAR(30) PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  role          VARCHAR(20) NOT NULL,       -- MANUFACTURER, DISTRIBUTOR, PHARMACY, REGULATOR
  license_no    VARCHAR(60) UNIQUE NOT NULL,
  address       TEXT,
  status        VARCHAR(15) DEFAULT 'ACTIVE',
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  org_id        VARCHAR(30) REFERENCES organizations(id),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL,
  fabric_identity VARCHAR(100),             -- wallet label
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  gtin          VARCHAR(14) PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  composition   TEXT,
  dosage_form   VARCHAR(50),
  strength      VARCHAR(50),
  manufacturer_id VARCHAR(30) REFERENCES organizations(id),
  tx_id         VARCHAR(80)
);

CREATE TABLE batches (
  batch_id      VARCHAR(40) PRIMARY KEY,
  gtin          VARCHAR(14) REFERENCES products(gtin),
  mfg_date      DATE NOT NULL,
  exp_date      DATE NOT NULL,
  quantity      INT NOT NULL,
  status        VARCHAR(15) DEFAULT 'ACTIVE',
  qc_cert_url   TEXT,
  qc_cert_hash  VARCHAR(80),
  tx_id         VARCHAR(80),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE items (
  serial        VARCHAR(60) PRIMARY KEY,
  batch_id      VARCHAR(40) REFERENCES batches(batch_id),
  level         VARCHAR(10) NOT NULL,        -- UNIT, CARTON, PALLET
  parent_serial VARCHAR(60),
  owner_id      VARCHAR(30) REFERENCES organizations(id),
  status        VARCHAR(15) NOT NULL,
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipments (
  shipment_id   VARCHAR(40) PRIMARY KEY,
  from_org      VARCHAR(30) REFERENCES organizations(id),
  to_org        VARCHAR(30) REFERENCES organizations(id),
  status        VARCHAR(15) NOT NULL,
  excursion     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  received_at   TIMESTAMP,
  tx_id         VARCHAR(80)
);

CREATE TABLE shipment_items (
  shipment_id   VARCHAR(40) REFERENCES shipments(shipment_id),
  serial        VARCHAR(60) REFERENCES items(serial),
  PRIMARY KEY (shipment_id, serial)
);

CREATE TABLE sensor_readings (
  id            BIGSERIAL PRIMARY KEY,
  shipment_id   VARCHAR(40) REFERENCES shipments(shipment_id),
  device_id     VARCHAR(50),
  temperature_c NUMERIC(5,2),
  humidity_pct  NUMERIC(5,2),
  latitude      NUMERIC(9,6),
  longitude     NUMERIC(9,6),
  recorded_at   TIMESTAMP NOT NULL
);

CREATE TABLE ledger_events (
  id            BIGSERIAL PRIMARY KEY,
  tx_id         VARCHAR(80) NOT NULL,
  block_number  BIGINT,
  event_name    VARCHAR(50),
  payload       JSONB,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recalls (
  id            SERIAL PRIMARY KEY,
  batch_id      VARCHAR(40) REFERENCES batches(batch_id),
  initiated_by  VARCHAR(30) REFERENCES organizations(id),
  reason        TEXT NOT NULL,
  severity      VARCHAR(10),                 -- CLASS_I, CLASS_II, CLASS_III
  tx_id         VARCHAR(80),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id            SERIAL PRIMARY KEY,
  org_id        VARCHAR(30) REFERENCES organizations(id),
  type          VARCHAR(30),                 -- RECALL, EXCURSION, SHIPMENT
  message       TEXT,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_items_batch_owner ON items(batch_id, owner_id);
CREATE INDEX idx_sensor_ship_time ON sensor_readings(shipment_id, recorded_at);
```

## 4.2 Consistency Rule
The blockchain is the source of truth. The event listener updates PostgreSQL after each committed block. If the two ever disagree, the ledger wins, and the database can be rebuilt by replaying events.
