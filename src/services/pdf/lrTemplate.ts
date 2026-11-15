import { FirmProfile } from '../../types/firm.types';
import { Trip } from '../../types/trip.types';
import { Party } from '../../types/party.types';
import { formatDate, formatDateShort } from '../../utils/dateUtils';
import { formatINR } from '../../utils/currency';

interface LRTemplateParams {
  firm: FirmProfile;
  trip: Trip;
  customer: Party;
  vendor: Party;
  logoBase64?: string;
  signatureBase64?: string;
}

export function generateLRHTML(params: LRTemplateParams): string {
  const { firm, trip, customer, vendor, logoBase64, signatureBase64 } = params;
  const logoSrc = logoBase64 ? `data:image/png;base64,${logoBase64}` : '';
  const sigSrc = signatureBase64 ? `data:image/png;base64,${signatureBase64}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Lorry Receipt - ${trip.lrNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; background: #fff; padding: 12px; }
  .page { width: 100%; max-width: 740px; margin: 0 auto; border: 2px solid #1565C0; }
  
  /* Header */
  .header { display: flex; align-items: center; padding: 10px 14px; border-bottom: 2px solid #1565C0; background: #EEF4FF; }
  .logo-wrap { width: 72px; height: 72px; margin-right: 14px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 20px; font-weight: 900; color: #1565C0; }
  .firm-info { flex: 1; }
  .firm-name { font-size: 18px; font-weight: 900; color: #1565C0; letter-spacing: 0.5px; text-transform: uppercase; }
  .firm-sub { font-size: 10px; color: #333; margin-top: 2px; }
  .firm-gstin { font-size: 10px; font-weight: 700; color: #111; margin-top: 4px; }
  .lr-box { text-align: right; min-width: 140px; }
  .lr-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
  .lr-number { font-size: 18px; font-weight: 900; color: #1565C0; }
  .lr-date { font-size: 10px; color: #333; margin-top: 2px; }

  /* Title bar */
  .title-bar { background: #1565C0; color: #fff; text-align: center; padding: 5px; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }

  /* Consignor/Consignee row */
  .party-row { display: flex; border-bottom: 1px solid #1565C0; }
  .party-col { flex: 1; padding: 8px 12px; }
  .party-col:first-child { border-right: 1px solid #1565C0; }
  .party-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1565C0; border-bottom: 1px dashed #aaa; padding-bottom: 3px; margin-bottom: 5px; }
  .party-name { font-size: 12px; font-weight: 700; color: #111; }
  .party-detail { font-size: 10px; color: #333; margin-top: 2px; }

  /* Route row */
  .route-row { display: flex; border-bottom: 1px solid #1565C0; align-items: center; }
  .route-col { flex: 1; padding: 7px 12px; }
  .route-col:not(:last-child) { border-right: 1px solid #1565C0; }
  .field-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #1565C0; display: block; margin-bottom: 2px; }
  .field-value { font-size: 11px; font-weight: 600; color: #111; }

  /* Cargo table */
  .section-title { background: #E3F2FD; padding: 4px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1565C0; border-bottom: 1px solid #1565C0; border-top: 1px solid #1565C0; }
  .cargo-table { width: 100%; border-collapse: collapse; }
  .cargo-table th { background: #1565C0; color: #fff; padding: 5px 8px; font-size: 9px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .cargo-table td { padding: 6px 8px; border-bottom: 1px solid #ddd; border-right: 1px solid #ddd; font-size: 10px; text-align: center; }
  .cargo-table td.left { text-align: left; }
  .cargo-table tr:last-child td { border-bottom: none; }

  /* Financial summary */
  .finance-row { display: flex; border-top: 1px solid #1565C0; border-bottom: 1px solid #1565C0; }
  .finance-col { flex: 1; padding: 7px 12px; }
  .finance-col:not(:last-child) { border-right: 1px solid #1565C0; }
  .amount-label { font-size: 8px; color: #666; display: block; }
  .amount-value { font-size: 13px; font-weight: 900; color: #1565C0; }

  /* Risk & eway */
  .info-row { display: flex; border-bottom: 1px solid #1565C0; }
  .info-col { flex: 1; padding: 6px 12px; }
  .info-col:not(:last-child) { border-right: 1px solid #1565C0; }

  /* T&C */
  .tnc-section { padding: 8px 12px; border-bottom: 1px solid #1565C0; }
  .tnc-title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #1565C0; margin-bottom: 4px; }
  .tnc-list { padding-left: 14px; }
  .tnc-list li { font-size: 8px; color: #444; margin-bottom: 2px; line-height: 1.4; }

  /* Signature strip */
  .sig-row { display: flex; border-top: 1px solid #1565C0; }
  .sig-col { flex: 1; padding: 10px 12px; text-align: center; }
  .sig-col:not(:last-child) { border-right: 1px solid #1565C0; }
  .sig-label { font-size: 8px; color: #555; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; }
  .sig-img { max-height: 40px; max-width: 120px; }
  .sig-line { border-top: 1px solid #333; margin-top: 10px; padding-top: 3px; font-size: 8px; color: #333; }

  /* Footer */
  .footer { background: #1565C0; color: #fff; text-align: center; padding: 4px; font-size: 8px; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-wrap">
      ${logoSrc ? `<img src="${logoSrc}" alt="Logo"/>` : `<span class="logo-placeholder">${firm.firmName.charAt(0)}</span>`}
    </div>
    <div class="firm-info">
      <div class="firm-name">${firm.firmName}</div>
      <div class="firm-sub">Transport Commission Agent &amp; Freight Broker</div>
      <div class="firm-sub">${firm.address}, ${firm.city}, ${firm.state} - ${firm.pincode}</div>
      <div class="firm-sub">📞 ${firm.phone}${firm.email ? ` | ✉ ${firm.email}` : ''}</div>
      <div class="firm-gstin">GSTIN: ${firm.gstin} | PAN: ${firm.pan}</div>
    </div>
    <div class="lr-box">
      <div class="lr-label">Lorry Receipt No.</div>
      <div class="lr-number">${trip.lrNumber}</div>
      <div class="lr-date">Date: ${formatDate(trip.date)}</div>
      <div style="margin-top:3px;font-size:9px;font-weight:700;color:#1565C0;">Status: ${trip.status.replace(/_/g, ' ')}</div>
    </div>
  </div>

  <!-- TITLE -->
  <div class="title-bar">Digital Lorry Receipt (Bilty) / लॉरी रसीद</div>

  <!-- CONSIGNOR / VENDOR -->
  <div class="party-row">
    <div class="party-col">
      <div class="party-label">Consignor (Customer / Shipper / बुकिंग पार्टी)</div>
      <div class="party-name">${customer.companyName}</div>
      <div class="party-detail">Contact: ${customer.contactPerson} | 📞 ${customer.phone}</div>
      <div class="party-detail">${customer.address ? `${customer.address}, ` : ''}${customer.city}, ${customer.state}</div>
      ${customer.gstin ? `<div class="party-detail">GSTIN: ${customer.gstin}</div>` : ''}
      ${customer.pan ? `<div class="party-detail">PAN: ${customer.pan}</div>` : ''}
    </div>
    <div class="party-col">
      <div class="party-label">Vendor (Fleet Owner / Transporter / गाडी मालक)</div>
      <div class="party-name">${vendor.companyName}</div>
      <div class="party-detail">Contact: ${vendor.contactPerson} | 📞 ${vendor.phone}</div>
      <div class="party-detail">${vendor.city}, ${vendor.state}</div>
      ${vendor.gstin ? `<div class="party-detail">GSTIN: ${vendor.gstin}</div>` : ''}
      ${vendor.pan ? `<div class="party-detail">PAN: ${vendor.pan}</div>` : ''}
    </div>
  </div>

  <!-- ROUTE & VEHICLE -->
  <div class="route-row">
    <div class="route-col">
      <span class="field-label">From (Origin)</span>
      <span class="field-value">📍 ${trip.origin}</span>
    </div>
    <div class="route-col">
      <span class="field-label">To (Destination)</span>
      <span class="field-value">📍 ${trip.destination}</span>
    </div>
    <div class="route-col">
      <span class="field-label">Truck Number</span>
      <span class="field-value">🚛 ${trip.vehicleNumber}</span>
    </div>
    <div class="route-col">
      <span class="field-label">Driver Phone / Name</span>
      <span class="field-value">${trip.driverName ?? 'Driver'}${trip.driverPhone ? ` | 📞 ${trip.driverPhone}` : ''}</span>
    </div>
  </div>

  <!-- CARGO TABLE -->
  <div class="section-title">Cargo Details / माल विवरण</div>
  <table class="cargo-table">
    <thead>
      <tr>
        <th>#</th>
        <th style="text-align:left">Material Description</th>
        <th>Packages</th>
        <th>Weight</th>
        <th>Unit</th>
        <th>E-way Bill No.</th>
        <th>Insurance Risk</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td class="left">${trip.materialDescription}</td>
        <td>${trip.packagesCount ?? '-'}</td>
        <td>${trip.weight ?? '-'}</td>
        <td>${trip.weightUnit}</td>
        <td>${trip.ewayBillNumber ?? 'N/A'}</td>
        <td style="font-weight:700">${trip.insuranceRisk.replace(/_/g, ' ')}</td>
      </tr>
    </tbody>
  </table>

  <!-- FINANCIAL SUMMARY -->
  <div class="finance-row">
    <div class="finance-col">
      <span class="amount-label">Customer Freight (Receivable)</span>
      <span class="amount-value">${formatINR(trip.customerFreight)}</span>
    </div>
    <div class="finance-col">
      <span class="amount-label">Advance Paid</span>
      <span class="amount-value">${formatINR(trip.customerAdvance)}</span>
    </div>
    <div class="finance-col">
      <span class="amount-label">Balance Payable</span>
      <span class="amount-value" style="color:#C62828">${formatINR(trip.customerBalance)}</span>
    </div>
    <div class="finance-col">
      <span class="amount-label">Truck Freight (Payable)</span>
      <span class="amount-value" style="color:#2E7D32">${formatINR(trip.vendorFreight)}</span>
    </div>
  </div>

  <!-- TERMS & CONDITIONS -->
  <div class="tnc-section">
    <div class="tnc-title">Terms &amp; Conditions / नियम व शर्ती</div>
    <ol class="tnc-list">
      <li>Goods are booked at <strong>${trip.insuranceRisk.replace(/_/g, ' ')}</strong>. The consignor declares the goods are correctly described and valued.</li>
      <li>The transporter shall not be liable for any loss, damage or deterioration of goods in transit unless caused by gross negligence.</li>
      <li>Claims for loss or damage must be lodged within 7 days of delivery. No claim will be entertained thereafter.</li>
      <li>Freight is to be paid as per the agreed terms. Detention charges will apply after 24 hours at loading/unloading point.</li>
      <li>The consignor is responsible for proper packing. The transporter is not liable for breakage due to improper packing.</li>
      <li>This LR is subject to the Indian Carriage by Road Act, 2007 and all applicable laws.</li>
      <li>All disputes are subject to the jurisdiction of courts at ${firm.city}.</li>
      <li>GST liability under RCM (Reverse Charge Mechanism) is on the recipient of GTA services as per GST Act.</li>
      <li>The broker acts as a commission agent and is not the actual carrier of goods.</li>
      <li>This is a computer-generated document and does not require physical signature unless otherwise stated.</li>
    </ol>
  </div>

  <!-- SIGNATURE STRIP -->
  <div class="sig-row">
    <div class="sig-col">
      <span class="sig-label">Consignor / बुकिंग पार्टी हस्ताक्षर</span>
      <div style="height:40px;border:1px dashed #aaa;margin-top:4px;"></div>
      <div class="sig-line">Authorized Signatory</div>
    </div>
    <div class="sig-col">
      <span class="sig-label">Driver / चालक हस्ताक्षर</span>
      <div style="height:40px;border:1px dashed #aaa;margin-top:4px;"></div>
      <div class="sig-line">Vehicle: ${trip.vehicleNumber}</div>
    </div>
    <div class="sig-col">
      <span class="sig-label">For ${firm.firmName}</span>
      ${sigSrc
        ? `<img src="${sigSrc}" class="sig-img" alt="Signature"/>`
        : `<div style="height:40px;border:1px dashed #aaa;margin-top:4px;"></div>`
      }
      <div class="sig-line">Authorized Signatory &amp; Stamp</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    ${firm.firmName} | Bank: ${firm.bankDetails.bankName} | A/C: ${firm.bankDetails.accountNumber} | IFSC: ${firm.bankDetails.ifscCode} | 
    Generated on ${formatDateShort(new Date().toISOString())} | This is a digitally generated Lorry Receipt
  </div>

</div>
</body>
</html>`;
}
