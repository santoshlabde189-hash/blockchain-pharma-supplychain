export type ParticipantRole = 'MANUFACTURER' | 'DISTRIBUTOR' | 'PHARMACY' | 'REGULATOR';
export type ParticipantStatus = 'ACTIVE' | 'SUSPENDED';

export type BatchStatus = 'ACTIVE' | 'RECALLED' | 'EXPIRED';
export type ItemLevel = 'UNIT' | 'CARTON' | 'PALLET';
export type ItemStatus = 'CREATED' | 'IN_TRANSIT' | 'IN_STOCK' | 'DISPENSED' | 'RECALLED' | 'DESTROYED';
export type ShipmentStatus = 'CREATED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';

export interface Participant {
  docType: 'participant';
  id: string;
  name: string;
  role: ParticipantRole;
  licenseNo: string;
  status: ParticipantStatus;
}

export interface Product {
  docType: 'product';
  gtin: string;
  name: string;
  composition: string;
  dosageForm: string;
  manufacturerId: string;
  approvalNo: string;
}

export interface Batch {
  docType: 'batch';
  batchId: string;
  gtin: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  status: BatchStatus;
  qcCertHash: string;
  ownerId: string;
  createdAt: string;
}

export interface Item {
  docType: 'item';
  serial: string;
  level: ItemLevel;
  parentSerial?: string;
  batchId: string;
  ownerId: string;
  status: ItemStatus;
}

export interface Shipment {
  docType: 'shipment';
  shipmentId: string;
  fromId: string;
  toId: string;
  items: string[];
  status: ShipmentStatus;
  excursion: boolean;
  createdAt: string;
  receivedAt?: string;
}
