import { getDatabase } from '../database';
import { Trip, PaymentEntry } from '../../types/trip.types';
import { toISO } from '../../utils/dateUtils';

function rowToTrip(row: any, payments: PaymentEntry[] = []): Trip {
  return {
    id: row.id,
    serverId: row.server_id ?? undefined,
    lrNumber: row.lr_number,
    date: row.date,
    customerId: row.customer_id,
    vendorId: row.vendor_id,
    vehicleNumber: row.vehicle_number,
    driverName: row.driver_name ?? undefined,
    driverPhone: row.driver_phone ?? undefined,
    origin: row.origin,
    destination: row.destination,
    materialDescription: row.material_description,
    packagesCount: row.packages_count ?? undefined,
    weight: row.weight ?? undefined,
    weightUnit: row.weight_unit,
    ewayBillNumber: row.eway_bill_number ?? undefined,
    insuranceRisk: row.insurance_risk,
    customerFreight: row.customer_freight,
    vendorFreight: row.vendor_freight,
    netCommission: row.net_commission,
    customerAdvance: row.customer_advance,
    customerBalance: row.customer_balance,
    vendorAdvance: row.vendor_advance,
    vendorBalance: row.vendor_balance,
    paymentEntries: payments,
    status: row.status,
    deliveredAt: row.delivered_at ?? undefined,
    podImageUri: row.pod_image_uri ?? undefined,
    podUploadedAt: row.pod_uploaded_at ?? undefined,
    podServerUrl: row.pod_server_url ?? undefined,
    invoiceId: row.invoice_id ?? undefined,
    billedAt: row.billed_at ?? undefined,
    isDirty: row.is_dirty === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPayment(row: any): PaymentEntry {
  return {
    id: row.id,
    tripId: row.trip_id,
    partyType: row.party_type,
    amount: row.amount,
    mode: row.mode,
    date: row.date,
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function getAllTrips(): Promise<Trip[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM trips ORDER BY date DESC;');
  const trips: Trip[] = [];
  for (const row of rows) {
    const payments = await getPaymentsByTripId(row.id);
    trips.push(rowToTrip(row, payments));
  }
  return trips;
}

export async function getTripById(id: string): Promise<Trip | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM trips WHERE id = ?;', [id]);
  if (!row) return null;
  const payments = await getPaymentsByTripId(id);
  return rowToTrip(row, payments);
}

export async function getTripsByCustomer(customerId: string): Promise<Trip[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM trips WHERE customer_id = ? ORDER BY date DESC;',
    [customerId]
  );
  const trips: Trip[] = [];
  for (const row of rows) {
    const payments = await getPaymentsByTripId(row.id);
    trips.push(rowToTrip(row, payments));
  }
  return trips;
}

export async function getTripsByStatus(status: string): Promise<Trip[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM trips WHERE status = ? ORDER BY date DESC;',
    [status]
  );
  const trips: Trip[] = [];
  for (const row of rows) {
    const payments = await getPaymentsByTripId(row.id);
    trips.push(rowToTrip(row, payments));
  }
  return trips;
}

export async function saveTrip(trip: Trip): Promise<void> {
  const db = await getDatabase();
  const now = toISO();
  await db.runAsync(
    `INSERT OR REPLACE INTO trips
      (id, server_id, lr_number, date, customer_id, vendor_id, vehicle_number,
       driver_name, driver_phone, origin, destination, material_description,
       packages_count, weight, weight_unit, eway_bill_number, insurance_risk,
       customer_freight, vendor_freight, net_commission,
       customer_advance, customer_balance, vendor_advance, vendor_balance,
       status, delivered_at, pod_image_uri, pod_uploaded_at, pod_server_url,
       invoice_id, billed_at, is_dirty, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      trip.id, trip.serverId ?? null, trip.lrNumber, trip.date,
      trip.customerId, trip.vendorId, trip.vehicleNumber,
      trip.driverName ?? null, trip.driverPhone ?? null,
      trip.origin, trip.destination, trip.materialDescription,
      trip.packagesCount ?? null, trip.weight ?? null, trip.weightUnit,
      trip.ewayBillNumber ?? null, trip.insuranceRisk,
      trip.customerFreight, trip.vendorFreight, trip.netCommission,
      trip.customerAdvance, trip.customerBalance, trip.vendorAdvance, trip.vendorBalance,
      trip.status, trip.deliveredAt ?? null, trip.podImageUri ?? null,
      trip.podUploadedAt ?? null, trip.podServerUrl ?? null,
      trip.invoiceId ?? null, trip.billedAt ?? null,
      trip.isDirty ? 1 : 0, trip.createdAt ?? now, now,
    ]
  );
}

export async function updateTripStatus(
  id: string,
  status: string,
  extraFields: Record<string, any> = {}
): Promise<void> {
  const db = await getDatabase();
  const now = toISO();
  const setClauses = ['status = ?', 'updated_at = ?', 'is_dirty = 1'];
  const values: any[] = [status, now];
  for (const [key, val] of Object.entries(extraFields)) {
    setClauses.push(`${key} = ?`);
    values.push(val);
  }
  values.push(id);
  await db.runAsync(
    `UPDATE trips SET ${setClauses.join(', ')} WHERE id = ?;`,
    values
  );
}

export async function getPaymentsByTripId(tripId: string): Promise<PaymentEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM payment_entries WHERE trip_id = ? ORDER BY date ASC;',
    [tripId]
  );
  return rows.map(rowToPayment);
}

export async function savePaymentEntry(payment: PaymentEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO payment_entries
      (id, trip_id, party_type, amount, mode, date, reference, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      payment.id, payment.tripId, payment.partyType, payment.amount,
      payment.mode, payment.date, payment.reference ?? null,
      payment.notes ?? null, toISO(),
    ]
  );
}

export async function deletePaymentEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM payment_entries WHERE id = ?;', [id]);
}

export async function getDashboardSummary(): Promise<{
  totalReceivable: number;
  totalPayable: number;
  netCommission: number;
  pendingPODCount: number;
}> {
  const db = await getDatabase();
  const summary = await db.getFirstAsync<any>(`
    SELECT
      SUM(CASE WHEN status NOT IN ('PAID') THEN customer_balance ELSE 0 END) as total_receivable,
      SUM(CASE WHEN status NOT IN ('PAID') THEN vendor_balance ELSE 0 END) as total_payable,
      SUM(net_commission) as net_commission
    FROM trips
    WHERE date >= date('now', 'start of month');
  `);
  const podResult = await db.getFirstAsync<any>(`
    SELECT COUNT(*) as count FROM trips
    WHERE status = 'DELIVERED'
    AND delivered_at <= datetime('now', '-3 days');
  `);
  return {
    totalReceivable: summary?.total_receivable ?? 0,
    totalPayable: summary?.total_payable ?? 0,
    netCommission: summary?.net_commission ?? 0,
    pendingPODCount: podResult?.count ?? 0,
  };
}
