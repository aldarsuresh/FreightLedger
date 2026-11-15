import { GSTMode } from '../constants/gstRates';
export interface InvoiceLineItem {
  tripId: string;
  lrNumber: string;
  lrDate: string;
  vehicleNumber: string;
  origin: string;
  destination: string;
  description: string;
  amount: number;
}
export interface Invoice {
  id: string;
  serverId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  tripIds: string[];
  lineItems: InvoiceLineItem[];
  gstMode: GSTMode;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  grandTotal: number;
  amountInWords: string;
  isPaid: boolean;
  paidAt?: string;
  isDirty: boolean;
  createdAt: string;
  updatedAt: string;
}
