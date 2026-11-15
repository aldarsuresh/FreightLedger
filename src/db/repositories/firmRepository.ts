import { getDatabase } from '../database';
import { FirmProfile, BankDetails } from '../../types/firm.types';
import { toISO } from '../../utils/dateUtils';

function rowToFirm(row: any): FirmProfile {
  return {
    id: row.id,
    firmName: row.firm_name,
    gstin: row.gstin,
    pan: row.pan,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    phone: row.phone,
    email: row.email ?? undefined,
    bankDetails: {
      accountNumber: row.bank_account_number,
      ifscCode: row.bank_ifsc,
      bankName: row.bank_name,
      branchName: row.bank_branch ?? undefined,
    },
    lrPrefix: row.lr_prefix,
    currentLrSequence: row.current_lr_sequence,
    logoUri: row.logo_uri ?? undefined,
    signatureUri: row.signature_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getFirmProfile(): Promise<FirmProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM firm_profile LIMIT 1;');
  return row ? rowToFirm(row) : null;
}

export async function saveFirmProfile(firm: FirmProfile): Promise<void> {
  const db = await getDatabase();
  const now = toISO();
  await db.runAsync(
    `INSERT OR REPLACE INTO firm_profile
      (id, firm_name, gstin, pan, address, city, state, pincode, phone, email,
       bank_account_number, bank_ifsc, bank_name, bank_branch,
       lr_prefix, current_lr_sequence, logo_uri, signature_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      firm.id, firm.firmName, firm.gstin, firm.pan, firm.address,
      firm.city, firm.state, firm.pincode, firm.phone, firm.email ?? null,
      firm.bankDetails.accountNumber, firm.bankDetails.ifscCode,
      firm.bankDetails.bankName, firm.bankDetails.branchName ?? null,
      firm.lrPrefix, firm.currentLrSequence,
      firm.logoUri ?? null, firm.signatureUri ?? null,
      firm.createdAt ?? now, now,
    ]
  );
}

export async function incrementLRSequence(): Promise<number> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE firm_profile SET current_lr_sequence = current_lr_sequence + 1, updated_at = ?;',
    [toISO()]
  );
  const row = await db.getFirstAsync<{ current_lr_sequence: number }>(
    'SELECT current_lr_sequence FROM firm_profile LIMIT 1;'
  );
  return row?.current_lr_sequence ?? 1;
}
