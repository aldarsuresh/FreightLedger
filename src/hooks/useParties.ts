import { useEffect, useCallback } from 'react';
import { usePartyStore } from '../store/partyStore';
import { getAllParties, saveParty, deleteParty, searchParties } from '../db/repositories/partyRepository';
import { Party } from '../types/party.types';

export function useParties() {
  const { parties, isLoaded, setParties, addParty, updateParty, removeParty } = usePartyStore();

  useEffect(() => {
    if (!isLoaded) {
      getAllParties().then(setParties);
    }
  }, [isLoaded, setParties]);

  const createParty = useCallback(async (party: Party) => {
    await saveParty(party);
    addParty(party);
  }, [addParty]);

  const updatePartyData = useCallback(async (id: string, updates: Partial<Party>) => {
    const existing = parties.find((p) => p.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await saveParty(updated);
    updateParty(id, updates);
  }, [parties, updateParty]);

  const removePartyById = useCallback(async (id: string) => {
    await deleteParty(id);
    removeParty(id);
  }, [removeParty]);

  const search = useCallback(async (query: string, type?: 'CUSTOMER' | 'VENDOR') => {
    return searchParties(query, type);
  }, []);

  return { parties, isLoaded, createParty, updatePartyData, removePartyById, search };
}
