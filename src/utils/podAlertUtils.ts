import { Trip } from '../types/trip.types';
import { daysSince } from './dateUtils';
export function isPODOverdue(trip: Trip): boolean {
  return trip.status === 'DELIVERED' && !!trip.deliveredAt && daysSince(trip.deliveredAt) > 3;
}
export function getOverdueTrips(trips: Trip[]): Trip[] {
  return trips.filter(isPODOverdue);
}
