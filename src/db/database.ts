import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('freightledger.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const result = await db.getFirstAsync<{ max_version: number | null }>(
    'SELECT MAX(version) as max_version FROM migrations;'
  );
  const currentVersion = result?.max_version ?? 0;

  if (currentVersion < 1) {
    await migration_001(db);
    await db.runAsync(
      'INSERT INTO migrations (version, applied_at) VALUES (?, ?);',
      [1, new Date().toISOString()]
    );
  }

  if (currentVersion < 2) {
    await migration_002(db);
    await db.runAsync(
      'INSERT INTO migrations (version, applied_at) VALUES (?, ?);',
      [2, new Date().toISOString()]
    );
  }
}

async function migration_001(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS firm_profile (
      id TEXT PRIMARY KEY,
      firm_name TEXT NOT NULL,
      gstin TEXT NOT NULL,
      pan TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      bank_account_number TEXT NOT NULL DEFAULT '',
      bank_ifsc TEXT NOT NULL DEFAULT '',
      bank_name TEXT NOT NULL DEFAULT '',
      bank_branch TEXT,
      lr_prefix TEXT NOT NULL DEFAULT 'FL-',
      current_lr_sequence INTEGER NOT NULL DEFAULT 1,
      logo_uri TEXT,
      signature_uri TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      party_type TEXT NOT NULL CHECK(party_type IN ('CUSTOMER','VENDOR')),
      company_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      alternate_ph TEXT,
      gstin TEXT,
      pan TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      address TEXT,
      bank_account_number TEXT,
      bank_ifsc TEXT,
      bank_name TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_dirty INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      lr_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      driver_name TEXT,
      driver_phone TEXT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      material_description TEXT NOT NULL,
      packages_count INTEGER,
      weight REAL,
      weight_unit TEXT NOT NULL DEFAULT 'MT',
      eway_bill_number TEXT,
      insurance_risk TEXT NOT NULL DEFAULT 'OWNER''S_RISK',
      customer_freight REAL NOT NULL DEFAULT 0,
      vendor_freight REAL NOT NULL DEFAULT 0,
      net_commission REAL NOT NULL DEFAULT 0,
      customer_advance REAL NOT NULL DEFAULT 0,
      customer_balance REAL NOT NULL DEFAULT 0,
      vendor_advance REAL NOT NULL DEFAULT 0,
      vendor_balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'IN_TRANSIT',
      delivered_at TEXT,
      pod_image_uri TEXT,
      pod_uploaded_at TEXT,
      pod_server_url TEXT,
      invoice_id TEXT,
      billed_at TEXT,
      is_dirty INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES parties(id),
      FOREIGN KEY (vendor_id) REFERENCES parties(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      invoice_number TEXT NOT NULL UNIQUE,
      invoice_date TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      trip_ids TEXT NOT NULL DEFAULT '[]',
      line_items TEXT NOT NULL DEFAULT '[]',
      gst_mode TEXT NOT NULL DEFAULT 'RCM',
      subtotal REAL NOT NULL DEFAULT 0,
      cgst REAL NOT NULL DEFAULT 0,
      sgst REAL NOT NULL DEFAULT 0,
      igst REAL NOT NULL DEFAULT 0,
      total_gst REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      amount_in_words TEXT NOT NULL DEFAULT '',
      is_paid INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT,
      is_dirty INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES parties(id)
    );

    CREATE INDEX IF NOT EXISTS idx_trips_customer ON trips(customer_id);
    CREATE INDEX IF NOT EXISTS idx_trips_vendor ON trips(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
    CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date DESC);
    CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(party_type);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
  `);
}

async function migration_002(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS payment_entries (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      party_type TEXT NOT NULL CHECK(party_type IN ('CUSTOMER','VENDOR')),
      amount REAL NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('CASH','UPI','NEFT_RTGS','CHEQUE')),
      date TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_payments_trip ON payment_entries(trip_id);
  `);
}
