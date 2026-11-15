import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  firmName?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  lrPrefix: string;
  currentLrSequence: number;
  logoUrl?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName?: string;
  };
  otpHash?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    firmName: { type: String },
    gstin: { type: String },
    pan: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    email: { type: String },
    lrPrefix: { type: String, default: 'FL-2026-' },
    currentLrSequence: { type: Number, default: 1 },
    logoUrl: { type: String },
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      branchName: { type: String },
    },
    otpHash: { type: String },
    otpExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);

