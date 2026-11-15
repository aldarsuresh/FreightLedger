import { create } from 'zustand';
import { FirmProfile } from '../types/firm.types';
interface FirmState {
  firm: FirmProfile | null;
  isLoaded: boolean;
  setFirm: (firm: FirmProfile) => void;
  clearFirm: () => void;
}
export const useFirmStore = create<FirmState>((set) => ({
  firm: null,
  isLoaded: false,
  setFirm: (firm) => set({ firm, isLoaded: true }),
  clearFirm: () => set({ firm: null, isLoaded: false }),
}));
