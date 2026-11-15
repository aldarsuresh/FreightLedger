import { useEffect, useCallback } from 'react';
import { useTripStore } from '../store/tripStore';
import { getAllTrips, saveTrip, updateTripStatus, savePaymentEntry } from '../db/repositories/tripRepository';
import { Trip, PaymentEntry } from '../types/trip.types';

export function useTrips() {
  const { trips, isLoaded, setTrips, addTrip, updateTrip } = useTripStore();

  const loadTrips = useCallback(async () => {
    const data = await getAllTrips();
    setTrips(data);
  }, [setTrips]);

  useEffect(() => {
    if (!isLoaded) loadTrips();
  }, [isLoaded, loadTrips]);

  const createTrip = useCallback(async (trip: Trip) => {
    await saveTrip(trip);
    addTrip(trip);
  }, [addTrip]);

  const updateTripData = useCallback(async (id: string, updates: Partial<Trip>) => {
    const existing = trips.find((t) => t.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await saveTrip(updated);
    updateTrip(id, updates);
  }, [trips, updateTrip]);

  const advanceStatus = useCallback(async (trip: Trip) => {
    const statusMap: Record<string, string> = {
      IN_TRANSIT: 'DELIVERED',
      DELIVERED: 'POD_RECEIVED',
      POD_RECEIVED: 'BILLED',
      BILLED: 'PAID',
    };
    const next = statusMap[trip.status];
    if (!next) return;
    const extraFields: Record<string, any> = {};
    if (next === 'DELIVERED') extraFields['delivered_at'] = new Date().toISOString();
    if (next === 'BILLED') extraFields['billed_at'] = new Date().toISOString();
    await updateTripStatus(trip.id, next, extraFields);
    updateTrip(trip.id, {
      status: next as any,
      ...Object.fromEntries(
        Object.entries(extraFields).map(([k, v]) => [
          k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v
        ])
      ),
    });
  }, [updateTrip]);

  const addPayment = useCallback(async (payment: PaymentEntry) => {
    await savePaymentEntry(payment);
    await loadTrips(); // Refresh balances
  }, [loadTrips]);

  return { trips, isLoaded, loadTrips, createTrip, updateTripData, advanceStatus, addPayment };
}
