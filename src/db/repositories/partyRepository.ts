import { getDatabase } from '../database';
import { Party } from '../../types/party.types';
import { toISO } from '../../utils/dateUtils';

function rowToParty(row: any): Party {
  return {
    id: String(row.id),
    serverId: row.server_id ?? undefined,
    partyType: row.party_type as 'CUSTOMER' | 'VENDOR',
    companyName: row.company_name ?? '',
    contactPerson: row.contact_person ?? '',
    phone: row.phone ?? '',
    alternatePh: row.alternate_ph ?? undefined,
    gstin: row.gstin ?? undefined,
    pan: row.pan ?? undefined,
    city: row.city ?? '',
    state: row.state ?? '',
    address: row.address ?? undefined,
    bankDetails: row.bank_account_number
      ? {
          accountNumber: row.bank_account_number ?? '',
          ifscCode: row.bank_ifsc ?? '',
          bankName: row.bank_name ?? '',
        }
      : undefined,
    notes: row.notes ?? undefined,
    isActive: row.is_active === 1,
    isDirty: row.is_dirty === 1,
    createdAt: row.created_at ?? toISO(),
    updatedAt: row.updated_at ?? toISO(),
  };
}

export async function getAllParties(): Promise<Party[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM parties WHERE is_active = 1 ORDER BY company_name ASC;'
    );
    return rows.map(rowToParty);
  } catch (error) {
    console.error('Error in getAllParties:', error);
    return [];
  }
}

export async function getPartiesByType(type: 'CUSTOMER' | 'VENDOR'): Promise<Party[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM parties WHERE party_type = ? AND is_active = 1 ORDER BY company_name ASC;',
      [type]
    );
    return rows.map(rowToParty);
  } catch (error) {
    console.error('Error in getPartiesByType:', error);
    return [];
  }
}

export async function getPartyById(id: string): Promise<Party | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM parties WHERE id = ?;', [id]);
    return row ? rowToParty(row) : null;
  } catch (error) {
    console.error('Error in getPartyById:', error);
    return null;
  }
}

export async function saveParty(party: Party): Promise<void> {
  const db = await getDatabase();
  const now = toISO();
  const city = party.city?.trim() || 'Local';
  const state = party.state?.trim() || 'State';
  const contactPerson = party.contactPerson?.trim() || party.companyName;

  await db.runAsync(
    `INSERT OR REPLACE INTO parties
      (id, server_id, party_type, company_name, contact_person, phone, alternate_ph,
       gstin, pan, city, state, address, bank_account_number, bank_ifsc, bank_name,
       notes, is_active, is_dirty, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      party.id,
      party.serverId ?? null,
      party.partyType,
      party.companyName.trim(),
      contactPerson,
      party.phone.trim(),
      party.alternatePh?.trim() ?? null,
      party.gstin?.trim().toUpperCase() ?? null,
      party.pan?.trim().toUpperCase() ?? null,
      city,
      state,
      party.address?.trim() ?? null,
      party.bankDetails?.accountNumber?.trim() ?? null,
      party.bankDetails?.ifscCode?.trim().toUpperCase() ?? null,
      party.bankDetails?.bankName?.trim() ?? null,
      party.notes?.trim() ?? null,
      party.isActive ? 1 : 0,
      party.isDirty ? 1 : 0,
      party.createdAt ?? now,
      now,
    ]
  );
}

export async function deleteParty(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE parties SET is_active = 0, updated_at = ? WHERE id = ?;', [toISO(), id]);
}

export async function searchParties(query: string, type?: 'CUSTOMER' | 'VENDOR'): Promise<Party[]> {
  try {
    const db = await getDatabase();
    const likeQuery = `%${query}%`;
    if (type) {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM parties WHERE party_type = ? AND is_active = 1
         AND (company_name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)
         ORDER BY company_name ASC LIMIT 20;`,
        [type, likeQuery, likeQuery, likeQuery]
      );
      return rows.map(rowToParty);
    }
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM parties WHERE is_active = 1
       AND (company_name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)
       ORDER BY company_name ASC LIMIT 20;`,
      [likeQuery, likeQuery, likeQuery]
    );
    return rows.map(rowToParty);
  } catch (error) {
    console.error('Error in searchParties:', error);
    return [];
  }
}
