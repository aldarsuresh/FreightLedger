import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceLineItem {
  tripId: string;
  lrNumber: string;
  lrDate: Date;
  vehicleNumber: string;
  origin: string;
  destination: string;
  description: string;
  amount: number;
}

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId;
  localId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerId: mongoose.Types.ObjectId;
  tripIds: string[];
  lineItems: IInvoiceLineItem[];
  gstMode: 'RCM' | 'FORWARD_5' | 'FORWARD_12';
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  grandTotal: number;
  amountInWords: string;
  isPaid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    tripId: { type: String, required: true },
    lrNumber: { type: String, required: true },
    lrDate: { type: Date, required: true },
    vehicleNumber: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    localId: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    tripIds: [{ type: String }],
    lineItems: [InvoiceLineItemSchema],
    gstMode: { type: String, enum: ['RCM', 'FORWARD_5', 'FORWARD_12'], default: 'RCM' },
    subtotal: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalGST: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    amountInWords: { type: String, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

InvoiceSchema.index({ userId: 1, invoiceNumber: 1 });
InvoiceSchema.index({ userId: 1, customerId: 1 });

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema);

