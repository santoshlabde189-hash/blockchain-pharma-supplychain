export interface DbUser {
  id: number;
  orgId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'MANUFACTURER' | 'DISTRIBUTOR' | 'PHARMACY' | 'REGULATOR' | 'ADMIN';
  fabricIdentity?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface DbOrg {
  id: string;
  name: string;
  role: 'MANUFACTURER' | 'DISTRIBUTOR' | 'PHARMACY' | 'REGULATOR';
  licenseNo: string;
  address?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
}

export interface DbProduct {
  gtin: string;
  name: string;
  composition: string;
  dosageForm: string;
  strength: string;
  manufacturerId: string;
  txId?: string;
}

export interface DbBatch {
  batchId: string;
  gtin: string;
  mfgDate: Date;
  expDate: Date;
  quantity: number;
  status: 'ACTIVE' | 'RECALLED' | 'EXPIRED';
  qcCertUrl?: string;
  qcCertHash?: string;
  txId?: string;
  createdAt: Date;
}

export interface DbItem {
  serial: string;
  batchId: string;
  level: 'UNIT' | 'CARTON' | 'PALLET';
  parentSerial?: string;
  ownerId: string;
  status: 'CREATED' | 'IN_TRANSIT' | 'IN_STOCK' | 'DISPENSED' | 'RECALLED' | 'DESTROYED';
  updatedAt: Date;
}

export interface DbShipment {
  shipmentId: string;
  fromOrg: string;
  toOrg: string;
  status: 'CREATED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  excursion: boolean;
  createdAt: Date;
  receivedAt?: Date;
  txId?: string;
  items: string[];
}

export interface DbSensorReading {
  id: number;
  shipmentId: string;
  deviceId: string;
  temperatureC: number;
  humidityPct: number;
  latitude: number;
  longitude: number;
  recordedAt: Date;
}

export interface DbRecall {
  id: number;
  batchId: string;
  initiatedBy: string;
  reason: string;
  severity: 'CLASS_I' | 'CLASS_II' | 'CLASS_III';
  txId?: string;
  createdAt: Date;
}

export interface DbNotification {
  id: number;
  orgId: string;
  type: 'RECALL' | 'EXCURSION' | 'SHIPMENT';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export class InMemoryDb {
  public users: DbUser[] = [];
  public organizations: DbOrg[] = [];
  public products: DbProduct[] = [];
  public batches: DbBatch[] = [];
  public items: DbItem[] = [];
  public shipments: DbShipment[] = [];
  public sensorReadings: DbSensorReading[] = [];
  public recalls: DbRecall[] = [];
  public notifications: DbNotification[] = [];

  private nextUserId = 1;
  private nextSensorId = 1;
  private nextRecallId = 1;
  private nextNotifId = 1;

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Seed default standard organizations
    this.organizations.push(
      { id: 'MFG001', name: 'Pfizer Bio', role: 'MANUFACTURER', licenseNo: 'LIC-MFG-001', status: 'ACTIVE', createdAt: new Date() },
      { id: 'DIST001', name: 'Global Logistics', role: 'DISTRIBUTOR', licenseNo: 'LIC-DIST-001', status: 'ACTIVE', createdAt: new Date() },
      { id: 'PHARM001', name: 'Apollo Pharmacy', role: 'PHARMACY', licenseNo: 'LIC-PHARM-001', status: 'ACTIVE', createdAt: new Date() },
      { id: 'REG001', name: 'CDSCO Health Authority', role: 'REGULATOR', licenseNo: 'LIC-REG-001', status: 'ACTIVE', createdAt: new Date() }
    );
  }

  getNextUserId() { return this.nextUserId++; }
  getNextSensorId() { return this.nextSensorId++; }
  getNextRecallId() { return this.nextRecallId++; }
  getNextNotifId() { return this.nextNotifId++; }

  clear() {
    this.users = [];
    this.organizations = [];
    this.products = [];
    this.batches = [];
    this.items = [];
    this.shipments = [];
    this.sensorReadings = [];
    this.recalls = [];
    this.notifications = [];
    this.seedDefaults();
  }
}

export const db = new InMemoryDb();
