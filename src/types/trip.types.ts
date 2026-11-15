export type TripStatus = 'IN_TRANSIT' | 'DELIVERED' | 'POD_RECEIVED' | 'BILLED' | 'PAID';
export type InsuranceRisk = "OWNER'S_RISK" | "CARRIER'S_RISK";
export type WeightUnit = 'MT' | 'KG';
export type PaymentMode = 'CASH' | 'UPI' | 'NEFT_RTGS' | 'CHEQUE';

export interface PaymentEntry {
  id: string;
  tripId: string;
  partyType: 'CUSTOMER' | 'VENDOR';
  amount: number;
  mode: PaymentMode;
  date: string;
  reference?: string;
  notes?: string;
}

export interface Trip {
  id: string;
  serverId?: string;
  lrNumber: string;
  date: string;
  customerId: string;
  vendorId: string;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  origin: string;
  destination: string;
  materialDescription: string;
  packagesCount?: number;
  weight?: number;
  weightUnit: WeightUnit;
  ewayBillNumber?: string;
  insuranceRisk: InsuranceRisk;
  customerFreight: number;
  vendorFreight: number;
  netCommission: number;
  customerAdvance: number;
  customerBalance: number;
  vendorAdvance: number;
  vendorBalance: number;
  paymentEntries: PaymentEntry[];
  status: TripStatus;
  deliveredAt?: string;
  podImageUri?: string;
  podUploadedAt?: string;
  podServerUrl?: string;
  invoiceId?: string;
  billedAt?: string;
  isDirty: boolean;
  createdAt: string;
  updatedAt: string;
}
