export type TripStatus = 'IN_TRANSIT' | 'DELIVERED' | 'POD_RECEIVED' | 'BILLED' | 'PAID';

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  POD_RECEIVED: 'POD Received',
  BILLED: 'Billed',
  PAID: 'Paid',
};

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  IN_TRANSIT: '#1565C0',
  DELIVERED: '#FF6F00',
  POD_RECEIVED: '#6A1B9A',
  BILLED: '#2E7D32',
  PAID: '#00695C',
};

export const TRIP_STATUS_TRANSITIONS: Record<TripStatus, TripStatus | null> = {
  IN_TRANSIT: 'DELIVERED',
  DELIVERED: 'POD_RECEIVED',
  POD_RECEIVED: 'BILLED',
  BILLED: 'PAID',
  PAID: null,
};
