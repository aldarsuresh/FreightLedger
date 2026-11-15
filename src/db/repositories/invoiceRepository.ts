import { getDatabase } from '../database';
import { Invoice } from '../../types/invoice.types';
import { toISO } from '../../utils/dateUtils';

function rowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    serverId: row.server_id ?? undefined,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customerId: row.customer_id,
    tripIds: JSON.parse(row.trip_ids),
    lineItems: JSON.parse(row.line_items),
    gstMode: row.gst_mode,
    subtotal: row.subtotal,
    cgst: row.cgst,
    sgst: row.sgst,
    igst: row.igst,
    totalGST: row.total_gst,
    grandTotal: row.grand_total,
    amountInWords: row.amount_in_words,
    isPaid: row.is_paid === 1,
    paidAt: row.paid_at ?? undefined,
    isDirty: row.is_dirty === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM invoices ORDER BY invoice_date DESC;'
  );
  return rows.map(rowToInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM invoices WHERE id = ?;', [id]);
  return row ? rowToInvoice(row) : null;
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  const db = await getDatabase();
  const now = toISO();
  await db.runAsync(
    `INSERT OR REPLACE INTO invoices
      (id, server_id, invoice_number, invoice_date, customer_id,
       trip_ids, line_items, gst_mode, subtotal, cgst, sgst, igst,
       total_gst, grand_total, amount_in_words, is_paid, paid_at,
       is_dirty, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      invoice.id, invoice.serverId ?? null, invoice.invoiceNumber,
      invoice.invoiceDate, invoice.customerId,
      JSON.stringify(invoice.tripIds), JSON.stringify(invoice.lineItems),
      invoice.gstMode, invoice.subtotal, invoice.cgst, invoice.sgst, invoice.igst,
      invoice.totalGST, invoice.grandTotal, invoice.amountInWords,
      invoice.isPaid ? 1 : 0, invoice.paidAt ?? null,
      invoice.isDirty ? 1 : 0, invoice.createdAt ?? now, now,
    ]
  );
}

export async function getNextInvoiceNumber(): Promise<string> {
  const db = await getDatabase();
  const year = new Date().getFullYear();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM invoices
     WHERE invoice_date >= ? AND invoice_date < ?;`,
    [`${year}-01-01`, `${year + 1}-01-01`]
  );
  const seq = String((row?.count ?? 0) + 1).padStart(3, '0');
  return `INV-${year}-${seq}`;
}
