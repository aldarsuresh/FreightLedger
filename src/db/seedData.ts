import { getDatabase } from './database';
import { toISO } from '../utils/dateUtils';
import { generateUUID } from '../utils/uuid';
import { FirmProfile } from '../types/firm.types';
import { Party } from '../types/party.types';
import { Trip, PaymentEntry } from '../types/trip.types';
import { Invoice, InvoiceLineItem } from '../types/invoice.types';
import { saveFirmProfile } from './repositories/firmRepository';
import { saveParty } from './repositories/partyRepository';
import { saveTrip, savePaymentEntry } from './repositories/tripRepository';
import { saveInvoice } from './repositories/invoiceRepository';

export async function clearDatabase(): Promise<void> {
  const db = await getDatabase();
  console.log('[DB] Clearing all existing data...');
  await db.execAsync(`
    DELETE FROM payment_entries;
    DELETE FROM invoices;
    DELETE FROM trips;
    DELETE FROM parties;
    DELETE FROM firm_profile;
  `);
  console.log('[DB] Database cleared.');
}

export async function seedDemoData(): Promise<void> {
  console.log('[DB] Seeding demo data...');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Dates for different trips
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // 1. Broker Firm Profile
  const firmProfile: FirmProfile = {
    id: generateUUID(),
    firmName: 'Shivaji Roadlines & Logistics',
    gstin: '27AABCS1234F1Z8',
    pan: 'AABCS1234F',
    address: 'Shop No. 14, Transport Nagar, Nigdi',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411019',
    phone: '9822012345',
    email: 'contact@shivajiroadlines.in',
    bankDetails: {
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0000123',
      bankName: 'HDFC Bank Ltd',
      branchName: 'Nigdi Pradhikaran, Pune',
    },
    lrPrefix: 'SRL-2026-',
    currentLrSequence: 105,
    createdAt: toISO(twoWeeksAgo),
    updatedAt: toISO(now),
  };
  await saveFirmProfile(firmProfile);

  // 2. Parties - Customers (Shippers)
  const cust1: Party = {
    id: generateUUID(),
    partyType: 'CUSTOMER',
    companyName: 'Tata Motors Commercial Parts Ltd',
    contactPerson: 'Sanjay Deshmukh',
    phone: '9890123456',
    gstin: '27AAACT2727Q1ZW',
    pan: 'AAACT2727Q',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'MIDC Bhosari Industrial Area, Sector 7',
    isActive: true,
    isDirty: true,
    createdAt: toISO(twoWeeksAgo),
    updatedAt: toISO(now),
  };

  const cust2: Party = {
    id: generateUUID(),
    partyType: 'CUSTOMER',
    companyName: 'Bajaj Auto Components & Forgings',
    contactPerson: 'Rahul Verma',
    phone: '9823456789',
    gstin: '27AAACB1234M1Z2',
    pan: 'AAACB1234M',
    city: 'Chakan',
    state: 'Maharashtra',
    address: 'Phase 2, Chakan Industrial Area',
    isActive: true,
    isDirty: true,
    createdAt: toISO(twoWeeksAgo),
    updatedAt: toISO(now),
  };

  const cust3: Party = {
    id: generateUUID(),
    partyType: 'CUSTOMER',
    companyName: 'Parle Agro Beverages Pvt Ltd',
    contactPerson: 'Amit Joshi',
    phone: '9819876543',
    gstin: '27AAACP5678K1Z5',
    pan: 'AAACP5678K',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Western Express Highway, Andheri East',
    isActive: true,
    isDirty: true,
    createdAt: toISO(twoWeeksAgo),
    updatedAt: toISO(now),
  };

  // 3. Parties - Vendors (Fleet Owners / Drivers)
  const vend1: Party = {
    id: generateUUID(),
    partyType: 'VENDOR',
    companyName: 'Patil Roadlines Fleet (12 Trucks)',
    contactPerson: 'Santosh Patil',
    phone: '9850112233',
    city: 'Kolhapur',
    state: 'Maharashtra',
    address: 'Near Old Toll Naka, Shiroli MIDC',
    bankDetails: {
      accountNumber: '30123456789',
      ifscCode: 'SBIN0001234',
      bankName: 'State Bank of India',
    },
    isActive: true,
    isDirty: true,
    createdAt: toISO(twoWeeksAgo),
    updatedAt: toISO(now),
  };

  const vend2: Party = {
    id: generateUUID(),
    partyType: 'VENDOR',
    companyName: 'Balaji Golden Transport (Driver Ramesh)',
    contactPerson: 'Ramesh Shinde',
    phone: '9766554433',
    city: 'Satara',
    state: 'Maharashtra',
    address: 'Pune-Bangalore Highway, Satara Bypass',
    bankDetails: {
      accountNumber: '01230100045678',
      ifscCode: 'BARB0SATARA',
      bankName: 'Bank of Baroda',
    },
    isActive: true,
    isDirty: true,
    createdAt: toISO(twoWeeksAgo),
    updatedAt: toISO(now),
  };

  const vend3: Party = {
    id: generateUUID(),
    partyType: 'VENDOR',
    companyName: 'Hindustan Logistics Fleet Services',
    contactPerson: 'Gurpreet Singh',
    phone: '9827012345',
    city: 'Indore',
    state: 'Madhya Pradesh',
    address: 'Loha Mandi, Transport Nagar',
    bankDetails: {
      accountNumber: '1029384756',
      ifscCode: 'ICIC0000456',
      bankName: 'ICICI Bank',
    },
    isActive: true,
    isDirty: true,
    createdAt: toISO(twoWeeksAgo),
    updatedAt: toISO(now),
  };

  await Promise.all([
    saveParty(cust1),
    saveParty(cust2),
    saveParty(cust3),
    saveParty(vend1),
    saveParty(vend2),
    saveParty(vend3),
  ]);

  // 4. Trips
  // Trip 1: IN_TRANSIT (Pune -> Delhi)
  const trip1: Trip = {
    id: generateUUID(),
    lrNumber: 'SRL-2026-0101',
    date: todayStr,
    customerId: cust1.id,
    vendorId: vend3.id,
    vehicleNumber: 'MH12AB9876',
    driverName: 'Gurpreet Singh',
    driverPhone: '9827012345',
    origin: 'Pune, MH',
    destination: 'Delhi NCR',
    materialDescription: 'Automobile Sheet Metal Parts & Dies',
    packagesCount: 140,
    weight: 18.5,
    weightUnit: 'MT',
    ewayBillNumber: '241098765432',
    insuranceRisk: "OWNER'S_RISK",
    customerFreight: 55000,
    vendorFreight: 46000,
    netCommission: 9000,
    customerAdvance: 15000,
    customerBalance: 40000,
    vendorAdvance: 20000,
    vendorBalance: 26000,
    paymentEntries: [],
    status: 'IN_TRANSIT',
    isDirty: true,
    createdAt: toISO(now),
    updatedAt: toISO(now),
  };

  // Trip 2: DELIVERED 4 days ago (triggers >3 Days OVERDUE POD alert!)
  const trip2: Trip = {
    id: generateUUID(),
    lrNumber: 'SRL-2026-0102',
    date: fourDaysAgo.toISOString().split('T')[0],
    customerId: cust2.id,
    vendorId: vend2.id,
    vehicleNumber: 'MH14CW4321',
    driverName: 'Ramesh Shinde',
    driverPhone: '9766554433',
    origin: 'Chakan, MH',
    destination: 'Bengaluru, KA',
    materialDescription: 'Forged Crankshafts & Transmission Gears',
    packagesCount: 85,
    weight: 22.0,
    weightUnit: 'MT',
    ewayBillNumber: '241187654321',
    insuranceRisk: "CARRIER'S_RISK",
    customerFreight: 68000,
    vendorFreight: 58000,
    netCommission: 10000,
    customerAdvance: 20000,
    customerBalance: 48000,
    vendorAdvance: 25000,
    vendorBalance: 33000,
    paymentEntries: [],
    status: 'DELIVERED',
    deliveredAt: toISO(fourDaysAgo), // >3 days ago!
    isDirty: true,
    createdAt: toISO(sixDaysAgo),
    updatedAt: toISO(fourDaysAgo),
  };

  // Trip 3: POD_RECEIVED (Surat, ready to be billed)
  const trip3: Trip = {
    id: generateUUID(),
    lrNumber: 'SRL-2026-0103',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerId: cust1.id,
    vendorId: vend1.id,
    vehicleNumber: 'MH09EF1122',
    driverName: 'Santosh Patil',
    driverPhone: '9850112233',
    origin: 'Pune, MH',
    destination: 'Surat, GJ',
    materialDescription: 'Industrial Packaging Rolls & Corrugated Sheets',
    packagesCount: 60,
    weight: 12.0,
    weightUnit: 'MT',
    ewayBillNumber: '241276543210',
    insuranceRisk: "OWNER'S_RISK",
    customerFreight: 32000,
    vendorFreight: 27000,
    netCommission: 5000,
    customerAdvance: 10000,
    customerBalance: 22000,
    vendorAdvance: 15000,
    vendorBalance: 12000,
    paymentEntries: [],
    status: 'POD_RECEIVED',
    deliveredAt: toISO(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
    podUploadedAt: toISO(now),
    isDirty: true,
    createdAt: toISO(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    updatedAt: toISO(now),
  };

  // Trip 4: BILLED (Mumbai -> Ahmedabad, linked to Invoice)
  const trip4Id = generateUUID();
  const invoiceId = generateUUID();

  const trip4: Trip = {
    id: trip4Id,
    lrNumber: 'SRL-2026-0104',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerId: cust3.id,
    vendorId: vend1.id,
    vehicleNumber: 'MH12PQ7788',
    driverName: 'Deepak More',
    driverPhone: '9822334455',
    origin: 'Mumbai, MH',
    destination: 'Ahmedabad, GJ',
    materialDescription: 'Packaged Fruit Juices & Tetra Packs',
    packagesCount: 450,
    weight: 15.0,
    weightUnit: 'MT',
    ewayBillNumber: '241365432109',
    insuranceRisk: "OWNER'S_RISK",
    customerFreight: 42000,
    vendorFreight: 35000,
    netCommission: 7000,
    customerAdvance: 10000,
    customerBalance: 32000,
    vendorAdvance: 15000,
    vendorBalance: 20000,
    paymentEntries: [],
    status: 'BILLED',
    invoiceId,
    deliveredAt: toISO(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
    billedAt: toISO(now),
    isDirty: true,
    createdAt: toISO(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    updatedAt: toISO(now),
  };

  // Trip 5: PAID (Pune -> Hyderabad)
  const trip5: Trip = {
    id: generateUUID(),
    lrNumber: 'SRL-2026-0105',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerId: cust2.id,
    vendorId: vend3.id,
    vehicleNumber: 'MH11TR3344',
    driverName: 'Kailash Yadav',
    driverPhone: '9827112233',
    origin: 'Pune, MH',
    destination: 'Hyderabad, TS',
    materialDescription: 'Heavy Structural Steel Flanges & Channels',
    packagesCount: 30,
    weight: 24.0,
    weightUnit: 'MT',
    ewayBillNumber: '241454321098',
    insuranceRisk: "CARRIER'S_RISK",
    customerFreight: 75000,
    vendorFreight: 64000,
    netCommission: 11000,
    customerAdvance: 30000,
    customerBalance: 0,
    vendorAdvance: 30000,
    vendorBalance: 0,
    paymentEntries: [],
    status: 'PAID',
    deliveredAt: toISO(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    billedAt: toISO(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    isDirty: true,
    createdAt: toISO(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
    updatedAt: toISO(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
  };

  await Promise.all([
    saveTrip(trip1),
    saveTrip(trip2),
    saveTrip(trip3),
    saveTrip(trip4),
    saveTrip(trip5),
  ]);

  // 5. Payment Entries (Advances & Partial Payments)
  const payments: PaymentEntry[] = [
    {
      id: generateUUID(),
      tripId: trip1.id,
      partyType: 'CUSTOMER',
      amount: 15000,
      mode: 'UPI',
      date: todayStr,
      reference: 'UPI/402819283741',
      notes: 'Booking advance received',
    },
    {
      id: generateUUID(),
      tripId: trip1.id,
      partyType: 'VENDOR',
      amount: 20000,
      mode: 'NEFT_RTGS',
      date: todayStr,
      reference: 'NEFT/HDFC24010192',
      notes: 'Diesel and loading advance to truck driver',
    },
    {
      id: generateUUID(),
      tripId: trip2.id,
      partyType: 'CUSTOMER',
      amount: 20000,
      mode: 'NEFT_RTGS',
      date: fourDaysAgo.toISOString().split('T')[0],
      reference: 'RTGS/CITI99283741',
      notes: 'Advance at loading',
    },
    {
      id: generateUUID(),
      tripId: trip5.id,
      partyType: 'CUSTOMER',
      amount: 45000,
      mode: 'NEFT_RTGS',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reference: 'UTR/HDFC55883322',
      notes: 'Full balance settled after delivery',
    },
    {
      id: generateUUID(),
      tripId: trip5.id,
      partyType: 'VENDOR',
      amount: 34000,
      mode: 'NEFT_RTGS',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reference: 'NEFT/HDFC77665544',
      notes: 'Final settlement to driver',
    },
  ];

  for (const p of payments) {
    await savePaymentEntry(p);
  }

  // 6. GST Tax Invoice (RCM GTA)
  const lineItem: InvoiceLineItem = {
    tripId: trip4.id,
    lrNumber: trip4.lrNumber,
    lrDate: trip4.date,
    vehicleNumber: trip4.vehicleNumber,
    origin: trip4.origin,
    destination: trip4.destination,
    description: trip4.materialDescription,
    amount: trip4.customerFreight,
  };

  const invoice: Invoice = {
    id: invoiceId,
    invoiceNumber: 'INV-2026-001',
    invoiceDate: todayStr,
    customerId: cust3.id,
    tripIds: [trip4.id],
    lineItems: [lineItem],
    gstMode: 'RCM',
    subtotal: 42000,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalGST: 0,
    grandTotal: 42000,
    amountInWords: 'Rupees Forty Two Thousand Only',
    isPaid: false,
    isDirty: true,
    createdAt: toISO(now),
    updatedAt: toISO(now),
  };

  await saveInvoice(invoice);

  console.log('✅ [DB] Demo data seeded successfully: 1 Firm, 6 Parties, 5 Trips, 5 Payments, 1 Invoice.');
}

export async function resetAndSeedDatabase(): Promise<void> {
  await clearDatabase();
  await seedDemoData();
}
