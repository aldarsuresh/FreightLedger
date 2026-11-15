import { create } from 'zustand';
import { Party } from '../types/party.types';
interface PartyState {
  parties: Party[];
  isLoaded: boolean;
  setParties: (parties: Party[]) => void;
  addParty: (party: Party) => void;
  updateParty: (id: string, updates: Partial<Party>) => void;
  removeParty: (id: string) => void;
}
export const usePartyStore = create<PartyState>((set) => ({
  parties: [],
  isLoaded: false,
  setParties: (parties) => set({ parties, isLoaded: true }),
  addParty: (party) => set((s) => ({ parties: [party, ...s.parties] })),
  updateParty: (id, updates) => set((s) => ({ parties: s.parties.map((p) => p.id === id ? { ...p, ...updates } : p) })),
  removeParty: (id) => set((s) => ({ parties: s.parties.filter((p) => p.id !== id) })),
}));
