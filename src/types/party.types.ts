import { BankDetails } from './firm.types';
export type PartyType = 'CUSTOMER' | 'VENDOR';
export interface Party {
  id: string;
  serverId?: string;
  partyType: PartyType;
  companyName: string;
  contactPerson: string;
  phone: string;
  alternatePh?: string;
  gstin?: string;
  pan?: string;
  city: string;
  state: string;
  address?: string;
  bankDetails?: BankDetails;
  notes?: string;
  isActive: boolean;
  isDirty: boolean;
  createdAt: string;
  updatedAt: string;
}
