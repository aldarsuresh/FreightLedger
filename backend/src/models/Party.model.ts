import mongoose, { Schema, Document } from 'mongoose';

export interface IParty extends Document {
  userId: mongoose.Types.ObjectId;
  localId: string;
  partyType: 'CUSTOMER' | 'VENDOR';
  companyName: string;
  contactPerson: string;
  phone: string;
  alternatePh?: string;
  gstin?: string;
  pan?: string;
  city: string;
  state: string;
  address?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PartySchema = new Schema<IParty>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    localId: { type: String, required: true },
    partyType: { type: String, enum: ['CUSTOMER', 'VENDOR'], required: true },
    companyName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePh: { type: String },
    gstin: { type: String },
    pan: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String },
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
    },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PartySchema.index({ userId: 1, partyType: 1 });
PartySchema.index({ userId: 1, companyName: 1 });

export const PartyModel = mongoose.model<IParty>('Party', PartySchema);

