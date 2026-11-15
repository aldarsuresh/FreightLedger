import { create } from 'zustand';
import { Invoice } from '../types/invoice.types';
interface InvoiceState {
  invoices: Invoice[];
  isLoaded: boolean;
  setInvoices: (invoices: Invoice[]) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
}
export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],
  isLoaded: false,
  setInvoices: (invoices) => set({ invoices, isLoaded: true }),
  addInvoice: (invoice) => set((s) => ({ invoices: [invoice, ...s.invoices] })),
  updateInvoice: (id, updates) => set((s) => ({ invoices: s.invoices.map((inv) => inv.id === id ? { ...inv, ...updates } : inv) })),
}));
