import { create } from 'zustand';
import { Trip } from '../types/trip.types';
interface TripState {
  trips: Trip[];
  isLoaded: boolean;
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  removeTrip: (id: string) => void;
}
export const useTripStore = create<TripState>((set) => ({
  trips: [],
  isLoaded: false,
  setTrips: (trips) => set({ trips, isLoaded: true }),
  addTrip: (trip) => set((s) => ({ trips: [trip, ...s.trips] })),
  updateTrip: (id, updates) => set((s) => ({ trips: s.trips.map((t) => t.id === id ? { ...t, ...updates } : t) })),
  removeTrip: (id) => set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
}));
