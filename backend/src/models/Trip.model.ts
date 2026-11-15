import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentEntry {
  partyType: 'CUSTOMER' | 'VENDOR';
  amount: number;
  mode: 'CASH' | 'UPI' | 'NEFT_RTGS' | 'CHEQUE';
  date: Date;
  reference?: string;
  notes?: string;
}

export interface ITrip extends Document {
  userId: mongoose.Types.ObjectId;
  localId: string;
  lrNumber: string;
  date: Date;
  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  origin: string;
  destination: string;
  materialDescription: string;
  packagesCount?: number;
  weight?: number;
  weightUnit: 'MT' | 'KG';
  ewayBillNumber?: string;
  insuranceRisk: "OWNER'S_RISK" | "CARRIER'S_RISK";
  customerFreight: number;
  vendorFreight: number;
  netCommission: number;
  customerAdvance: number;
  customerBalance: number;
  vendorAdvance: number;
  vendorBalance: number;
  paymentEntries: IPaymentEntry[];
  status: 'IN_TRANSIT' | 'DELIVERED' | 'POD_RECEIVED' | 'BILLED' | 'PAID';
  deliveredAt?: Date;
  podImageUrl?: string;
  podUploadedAt?: Date;
  invoiceId?: mongoose.Types.ObjectId;
  billedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentEntrySchema = new Schema<IPaymentEntry>(
  {
    partyType: { type: String, enum: ['CUSTOMER', 'VENDOR'], required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ['CASH', 'UPI', 'NEFT_RTGS', 'CHEQUE'], required: true },
    date: { type: Date, required: true },
    reference: { type: String },
    notes: { type: String },
  },
  { _id: true }
);

const TripSchema = new Schema<ITrip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    localId: { type: String, required: true },
    lrNumber: { type: String, required: true },
    date: { type: Date, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    vehicleNumber: { type: String, required: true, uppercase: true },
    driverName: { type: String },
    driverPhone: { type: String },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    materialDescription: { type: String, required: true },
    packagesCount: { type: Number },
    weight: { type: Number },
    weightUnit: { type: String, enum: ['MT', 'KG'], default: 'MT' },
    ewayBillNumber: { type: String },
    insuranceRisk: { type: String, enum: ["OWNER'S_RISK", "CARRIER'S_RISK"], default: "OWNER'S_RISK" },
    customerFreight: { type: Number, required: true, min: 0 },
    vendorFreight: { type: Number, required: true, min: 0 },
    netCommission: { type: Number, required: true },
    customerAdvance: { type: Number, default: 0 },
    customerBalance: { type: Number, default: 0 },
    vendorAdvance: { type: Number, default: 0 },
    vendorBalance: { type: Number, default: 0 },
    paymentEntries: [PaymentEntrySchema],
    status: {
      type: String,
      enum: ['IN_TRANSIT', 'DELIVERED', 'POD_RECEIVED', 'BILLED', 'PAID'],
      default: 'IN_TRANSIT',
      index: true,
    },
    deliveredAt: { type: Date },
    podImageUrl: { type: String },
    podUploadedAt: { type: Date },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    billedAt: { type: Date },
  },
  { timestamps: true }
);

TripSchema.index({ userId: 1, lrNumber: 1 });
TripSchema.index({ userId: 1, status: 1, date: -1 });

export const TripModel = mongoose.model<ITrip>('Trip', TripSchema);

