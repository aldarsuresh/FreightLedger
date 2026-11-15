# FreightLedger - Business Requirements Document (BRD)
**Project Code:** FL-TMS-2026  
**Document Version:** 1.0 (Final Architecture Baseline)  
**Target Industry:** Indian Road Logistics & Goods Transport Agencies (GTA)  
**Compliance Standards:** GST SAC 996511 / RCM Sec 9(3) / Income Tax Sec 194C TDS  
**Architecture:** Offline-First Mobile (React Native + SQLite) + Synchronized Cloud Backend (Node.js + MongoDB)  
**Date:** November 15, 2026  

---

## 0. Document Control & Approvals

### Document Revision History
| Version | Author | Date | Summary of Changes |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | Solutions Architect | 15-Nov-2026 | Comprehensive baseline covering Trip Lifecycle, LR, Digital POD, GST GTA Invoicing, Remittance, Ledger, and Offline-First Architecture. |

### Stakeholder Sign-Off Matrix
| Role | Stakeholder Designation | Responsibility | Status |
| :--- | :--- | :--- | :--- |
| **Business Sponsor** | Managing Director / Fleet Owner | Executive Authorization & Domain Validation | **Signed & Approved** |
| **Operations Lead** | Head of Logistics & Dispatch | Operational Workflows, LR & POD Usability | **Signed & Approved** |
| **Finance & Compliance** | Chartered Accountant / Tax Auditor | GST RCM 9(3), SAC 996511 & TDS 194C Validation | **Signed & Approved** |
| **Technical Architect** | Principal Mobile Architect | Offline SQLite, React Native, REST API, MongoDB | **Signed & Approved** |

---

## 1. Executive Summary

**FreightLedger** is a production-grade, offline-first mobile and cloud enterprise software solution purpose-built for Indian Goods Transport Agencies (GTAs), fleet operators, transport brokers, and logistics contractors.

The Indian road transport sector moves over 70% of the nation's freight but remains bogged down by manual paper registers ("bilti books"), unverified physical Proof of Deliveries (PODs), protracted invoice settlement cycles (60 to 90 days), and complex tax compliance (Reverse Charge Mechanism under Section 9(3) of the CGST Act and TDS declarations under Section 194C of the Income Tax Act).

**Core Vision & ROI Metric:**
FreightLedger eliminates paper leakage, enables zero-delay bill generation directly from digital POD capture, reduces freight payment cycles from **65 days to 18 days**, and provides 100% statutory tax invoice compliance ready for single-tap WhatsApp sharing and instant A4 printing.

---

## 2. Business Context & Problem Statement

### Traditional Industry Pain Points
1. **Delayed Invoicing:** Physical LR and POD copies take 10 to 25 days to return via drivers, delaying customer billing.
2. **GST & RCM Confusion:** Transport bookkeepers struggle between Forward Charge (5%/12%) and Reverse Charge Mechanism (RCM), leading to disputed tax invoices and audit penalties.
3. **Leakage in Diesel & Cash Advances:** Driver advances and fuel pump slips lack real-time settlement against trip revenues.
4. **Remote Connectivity Failures:** Transport godowns and highway transshipment hubs frequently lack cellular reception, breaking cloud-only tools.

### FreightLedger Strategic Solutions
1. **Digital Proof of Delivery (POD):** Real-time camera capture of receiving stamp and consignee signature immediately unblocks billing.
2. **Automated GST GTA Engine:** Auto-assignment of SAC Code 996511, statutory RCM disclaimers, and Indian currency word converters.
3. **Integrated Trip-to-Ledger Linking:** Every trip tracks customer freight, market vehicle hire cost, diesel advances, and net profit margin.
4. **Offline-First SQLite Core:** 100% of operations function without internet, synchronizing seamlessly whenever connectivity resumes.

---

## 3. Stakeholder Personas & Target Users

| Persona | Operational Role | Core Needs & System Touchpoints |
| :--- | :--- | :--- |
| **Fleet Owner / Transporter** | Business proprietor managing 5 to 100+ trucks | Executive dashboard showing live trips, gross revenue, outstanding receivables from corporate clients, and fleet profitability per route. |
| **Dispatch Munshi / Operations Manager** | Frontline transport yard manager creating bookings | Rapid Consignment Note (LR) creation in < 60 seconds, assigning market trucks/drivers, issuing advance diesel cash slips. |
| **Billing Clerk / Accountant** | In-house bookkeeper managing invoices & GST filing | One-click multi-trip GST billing, RCM tax invoice formatting, WhatsApp PDF dispatch, balance tracking, and auto-settlement. |
| **Corporate Consignor (Customer)** | Industrial shipper (e.g. Tata Motors, Parle Agro) | Legally compliant A4 Tax Invoices with accurate SAC code 996511, itemized vehicle details, and prompt digital POD attachments. |
| **Market Fleet Vendor / Truck Broker** | Third-party vehicle supplier | Clear tracking of trip hire charges, diesel advance deductions, and balance settlement through bank NEFT/UPI. |

---

## 4. System Scope & Boundaries

### In-Scope Modules (Phase 1 Production)
* Firm Master Profile with GSTIN, PAN, and Bank Remittance configuration.
* Party Master (Customers & Fleet Vendors) with GST & TDS fields.
* Lorry Receipt (LR) & Consignment Note generator with auto-sequencing.
* Trip Lifecycle State Machine (7 distinct operational states).
* Camera & File-based Digital POD capture with shortage notes.
* GST GTA Tax Invoicing engine (SAC 996511, RCM, Forward Charge).
* Single-Page A4 Printable PDF generation with WhatsApp dispatch.
* Two-Way Payment Settlement (Automatic status updates from `PAYMENT DUE` to `PAID`).
* Full Offline SQLite database with background cloud synchronization.

### Out-of-Scope (Future Enhancements)
* Direct government NIC E-Way Bill API generation (manual number entry supported).
* Real-time OBD-II / GPS hardware vehicle telemetry tracking.
* Direct automated bank payout gateway (payment recording is manual via UTR entry).
* Driver mobile app with native turn-by-turn navigation.
* Multi-currency international shipping (System strictly optimized for Indian INR ₹).

---

## 5. Functional Requirements Specification (FRD)

### 5.1 Module 1: Master Firm & Entity Configuration (FR-01)
* **FR-01.1 (Firm Profile):** System stores Firm Name, 15-digit Indian GSTIN, 10-character PAN, physical address, city, state, pincode, and contact details.
* **FR-01.2 (Bank Remittance Master):** System records Bank Name, Branch, Account Number, 11-character IFSC Code, and UPI ID for automated inclusion on all PDF invoices.
* **FR-01.3 (Numbering Sequences):** System configures customizable numbering sequences (e.g., `SRL-2026-XXXX`) with monotonic auto-incrementing counters.

### 5.2 Module 2: Party Master Management (FR-02)
* **FR-02.1 (Party Classification):** Dual categorization as `CUSTOMER` (Consignor / Consignee) or `VENDOR` (Fleet Supplier / Market Broker).
* **FR-02.2 (Statutory Tax Validation):** Enforces 15-character Indian GSTIN checksum format.
* **FR-02.3 (TDS Sec 194C Flags):** For Vendors, records whether the transporter owns fewer than 10 goods carriages with valid PAN declaration to exempt TDS deduction under Section 194C(6).

### 5.3 Module 3: Consignment Note & Lorry Receipt (LR) Generation (FR-03)
* **FR-03.1 (Consignment Details):** Consignor, Consignee, Origin, Destination, Vehicle Registration Number, Driver Name, Mobile, and E-Way Bill Number.
* **FR-03.2 (Cargo & Weight Details):** Description of Goods, Number of Packages, Packing Type, Gross Weight, Tare Weight, and Charged Weight in Metric Tons.
* **FR-03.3 (Dual-Sided Freight Pricing):** Customer Freight Rate (Per Ton, Fixed, or Per Trip) versus Vendor Hire Cost, calculating expected gross profit margin in real time.
* **FR-03.4 (Advance Deductions):** Driver advance cash payments and diesel card slips with fuel pump reference numbers at the time of dispatch.

### 5.4 Module 4: Trip Lifecycle State Machine (FR-04)
The system enforces a strict non-reversible state machine for all transport consignments:
1. `DRAFT` - Initial booking created; truck assigned but loading not finalized.
2. `DISPATCHED` - Goods loaded, LR generated, advance paid to driver, vehicle departed.
3. `IN_TRANSIT` - Vehicle currently on highway route.
4. `DELIVERED` - Vehicle reached destination warehouse; unloading complete.
5. `POD_RECEIVED` - Signed receiver stamp & physical/digital POD uploaded. *(Unlocks Billing)*.
6. `BILLED` - Converted into GST Tax Invoice. Trip is locked from further tariff modifications.
7. `PAID` - Customer has cleared the invoice balance in full; transaction closed.

### 5.5 Module 5: Digital Proof of Delivery (POD) Engine (FR-05)
* **FR-05.1 (Image Capture):** Capture POD photo directly via device camera or gallery with client-side image compression (< 500 KB).
* **FR-05.2 (Discrepancy Notes):** Record damaged cartons, material shortage quantity, receiving date, and unloader signature acknowledgement.
* **FR-05.3 (Invoice Gating):** System prevents invoice generation for any trip whose status is below `POD_RECEIVED`.

### 5.6 Module 6: GST Compliance & Billing Engine (FR-06)
* **FR-06.1 (GTA SAC Classification):** Default Service Accounting Code to **996511** (Road Transport Services of Goods including GTA).
* **FR-06.2 (RCM Calculation & Notice):** Reverse Charge Mechanism under Section 9(3) CGST Act. In RCM mode, GST is computed at 5% (CGST 2.5% + SGST 2.5% or IGST 5%), excluded from invoice payable total, and printed with statutory disclaimer: *"Tax payable under Reverse Charge Mechanism (GTA services under Sec 9(3) of CGST Act)"*.
* **FR-06.3 (Forward Charge Support):** Forward Charge GTA options (5% without ITC or 12% with ITC) where GST is added to the customer payable grand total.
* **FR-06.4 (Multi-Consignment Batching):** Combining multiple eligible trips for the same corporate client into a single tax invoice with itemized LR table.
* **FR-06.5 (Single-Page A4 PDF Layout):** Strict single-page CSS print layout fitting header, customer info, itemized table, RCM notice, totals in words, bank box, and signature within 297mm height.

### 5.7 Module 7: Payment Settlement & Automatic Status Transitions (FR-07)
* **FR-07.1 (Real-Time Status Badging):** `PAYMENT DUE` (Amber badge) when balance > 0, and `PAID` (Green badge) when balance = 0.
* **FR-07.2 (Two-Way Automatic Sync):** Marking an invoice as PAID automatically updates the invoice record, marks all linked trips as `PAID`, updates local SQLite, and refreshes the global Zustand store in a single atomic action.
* **FR-07.3 (Multi-Method Payment Entry):** Record partial or full receipts specifying Date, Amount, Method (NEFT / RTGS / IMPS / UPI / Cheque / Cash), and Bank Reference / UTR Number.

---

## 6. Indian Statutory & Regulatory Compliance Framework

| Regulatory Clause | Legal Obligation | FreightLedger Implementation |
| :--- | :--- | :--- |
| **CGST Act Sec 9(3) / IGST Act Sec 5(3)** | Supply of services by a GTA to specified business entities falls under **Reverse Charge Mechanism (RCM)**. | Automated RCM checkbox; GST flagged as payable by recipient; statutory notice stamped on invoice; GST excluded from total bill amount. |
| **SAC Code 996511** | Road transport services of goods including GTA services classified under SAC 996511. | Pre-populated on every LR, in-app tax sheet, and generated PDF invoice. |
| **Motor Vehicles Act & Carriage by Road Act** | Mandatory Consignment Note / Bilti indicating consignor, consignee, truck registration, cargo weight, and risk terms. | LR Generator prints standard 3-copy Consignment Note with standard terms of carriage. |
| **Income Tax Act Sec 194C** | TDS at 1% or 2% deducted on freight payments unless the transporter owns <= 10 goods carriages with valid PAN declaration. | Party master stores PAN declaration and fleet ownership number; flags vendor accounts as TDS exempt under Sec 194C(6). |
| **CGST Rule 138 (E-Way Bill)** | Consignments exceeding ₹50,000 value require mandatory 12-digit E-Way Bill. | Dedicated E-Way Bill Number validation field on Trip Creation and LR display. |

---

## 7. Technical Architecture & Engineering Specifications

### Architecture Layers
1. **Client Presentation Layer:** React Native (Expo SDK 52) with TypeScript 5.9, Expo Router, and reactive Zustand Stores (`useTripStore`, `useInvoiceStore`, `useFirmStore`).
2. **Local Storage & Print Engine:** Offline SQLite (`expo-sqlite`) with Write-Ahead Logging (WAL) and `expo-print` + `expo-sharing` single-page A4 HTML/CSS print engine.
3. **API & Cloud Synchronization:** Node.js Express TypeScript microservices exposing stateless REST endpoints (`/api/trips`, `/api/invoices`, `/api/parties`, `/api/auth`).
4. **Cloud Database:** MongoDB cluster with Mongoose ODM and ACID multi-document transactions.

---

## 8. Data Model & Entity Schema

```
FirmProfile (1) <----> (M) Party [CUSTOMER | VENDOR]
                          |
                          v
                       Trip (M) <----> (1) Invoice
                          |                 |
                          v                 v
                    PaymentEntry       PaymentEntry
```

* **FirmProfile:** `id, firmName, gstin, pan, address, phone, bankDetails`
* **Party:** `id, partyType, companyName, gstin, pan, phone, city, state`
* **Trip:** `id, lrNumber, customerFreight, vendorCost, status, podUrl, tripDates`
* **Invoice:** `id, invoiceNumber, customerId, tripIds[], subtotal, grandTotal, gstMode, isPaid`
* **PaymentEntry:** `id, amount, paymentDate, method, referenceNo, tripId, invoiceId`

---

## 9. Non-Functional Requirements (NFR)

* **Performance:** Screen transitions < 150ms; local SQLite read/writes < 15ms; PDF rendering < 1.2s.
* **Offline Resilience:** 100% of core operations (create trip, generate LR, capture POD, create invoice, preview PDF) operational in offline airplane mode.
* **Print Precision:** Standard A4 portrait (210 x 297mm) exact single-page constraint without content overflow.
* **Data Integrity:** WAL mode journaling in SQLite preventing corruption on abrupt device termination.
* **Security:** Secure local file storage, TLS 1.3 encrypted cloud communications, and sanitization on all database inputs.

---

## 10. User Acceptance Criteria (UAT) & Sign-Off

* **UAT-01 (Trip Booking to LR):** User fills details and taps Create Trip $\rightarrow$ Status set to `DRAFT` with unique LR assigned. *(Verified)*
* **UAT-02 (POD Capture Gate):** User attempts to invoice unverified trip $\rightarrow$ System blocks billing until POD is uploaded. *(Verified)*
* **UAT-03 (RCM Tax Calculation):** Invoice generated under RCM on ₹42,000 subtotal $\rightarrow$ Grand Total remains ₹42,000 with RCM 5% disclaimer printed. *(Verified)*
* **UAT-04 (Single-Page PDF Preview):** User taps "View & Print PDF" $\rightarrow$ High-resolution A4 single-page document renders with bank remittance and signature boxes. *(Verified)*
* **UAT-05 (Payment Settlement):** User taps "Mark as Received & Paid" $\rightarrow$ Status changes from `PAYMENT DUE` to `PAID`, and all linked trips update to `PAID`. *(Verified)*

