export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
}

export interface FirmProfile {
  id: string;
  firmName: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  bankDetails: BankDetails;
  lrPrefix: string;
  currentLrSequence: number;
  logoUri?: string;
  signatureUri?: string;
  createdAt: string;
  updatedAt: string;
}
