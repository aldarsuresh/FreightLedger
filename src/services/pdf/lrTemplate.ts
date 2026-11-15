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

  const firmName = firm?.firmName || 'Shivaji Roadlines & Logistics';
  const firmAddress = firm?.address || 'Shop No. 14, Transport Nagar, Nigdi';
  const firmCity = firm?.city || 'Pune';
  const firmState = firm?.state || 'Maharashtra';
  const firmPincode = firm?.pincode || '411019';
  const firmPhone = firm?.phone || '9822012345';
  const firmEmail = firm?.email || '';
  const firmGstin = firm?.gstin || '27AABCS1234F1Z8';
  const firmPan = firm?.pan || 'AABCS1234F';

  const custName = customer?.companyName || 'Consignor (Shipper)';
  const custContact = customer?.contactPerson || 'Accounts';
  const custPhone = customer?.phone || '';
  const custAddress = customer?.address ? `${customer.address}, ` : '';
  const custCity = customer?.city || 'Pune';
  const custState = customer?.state || 'Maharashtra';
  const custGstin = customer?.gstin || '';
  const custPan = customer?.pan || '';

  const vendName = vendor?.companyName || 'Fleet Owner / Transporter';
  const vendContact = vendor?.contactPerson || trip?.driverName || 'Driver';
  const vendPhone = vendor?.phone || trip?.driverPhone || '';
  const vendCity = vendor?.city || trip?.destination || '';
  const vendState = vendor?.state || '';
  const vendGstin = vendor?.gstin || '';
  const vendPan = vendor?.pan || '';

  const lrNum = trip?.lrNumber || 'LR-DOC';
  const tripDate = trip?.date || new Date().toISOString();
  const tripStatus = (trip?.status || 'IN_TRANSIT').replace(/_/g, ' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Lorry Receipt - ${lrNum}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 6mm 8mm;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
    font-size: 9px;
    line-height: 1.3;
    color: #0f172a;
    background: #ffffff;
  }
  .page {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    border: 1.5px solid #1565C0;
    border-radius: 2px;
    page-break-inside: avoid;
    page-break-after: avoid;
  }
  
  /* Header */
  .header { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1.5px solid #1565C0; background: #EEF4FF; page-break-inside: avoid; }
  .logo-wrap { width: 60px; height: 60px; margin-right: 12px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; flex-shrink: 0; }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 20px; font-weight: 900; color: #1565C0; }
  .firm-info { flex: 1; }
  .firm-name { font-size: 16px; font-weight: 900; color: #1565C0; letter-spacing: 0.3px; text-transform: uppercase; }
  .firm-sub { font-size: 8.5px; color: #333; margin-top: 1px; }
  .firm-gstin { font-size: 8.5px; font-weight: 700; color: #111; margin-top: 2px; }
  .lr-box { text-align: right; min-width: 130px; flex-shrink: 0; }
  .lr-label { font-size: 8px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
  .lr-number { font-size: 16px; font-weight: 900; color: #1565C0; }
  .lr-date { font-size: 8.5px; color: #333; margin-top: 1px; }

  /* Title bar */
  .title-bar { background: #1565C0; color: #fff; text-align: center; padding: 3px 6px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; page-break-inside: avoid; }

  /* Consignor/Consignee row */
  .party-row { display: flex; border-bottom: 1px solid #1565C0; page-break-inside: avoid; }
  .party-col { flex: 1; padding: 6px 10px; }
  .party-col:first-child { border-right: 1px solid #1565C0; }
  .party-label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1565C0; border-bottom: 1px dashed #aaa; padding-bottom: 2px; margin-bottom: 3px; }
  .party-name { font-size: 11px; font-weight: 700; color: #111; }
  .party-detail { font-size: 8.5px; color: #333; margin-top: 1px; }

  /* Route row */
  .route-row { display: flex; border-bottom: 1px solid #1565C0; align-items: center; page-break-inside: avoid; }
  .route-col { flex: 1; padding: 5px 10px; }
  .route-col:not(:last-child) { border-right: 1px solid #1565C0; }
  .field-label { font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #1565C0; display: block; margin-bottom: 1px; }
  .field-value { font-size: 9.5px; font-weight: 600; color: #111; }

  /* Cargo table */
  .section-title { background: #E3F2FD; padding: 3px 10px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #1565C0; border-bottom: 1px solid #1565C0; border-top: 1px solid #1565C0; page-break-inside: avoid; }
  .cargo-table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
  .cargo-table th { background: #1565C0; color: #fff; padding: 4px 6px; font-size: 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .cargo-table td { padding: 4px 6px; border-bottom: 1px solid #ddd; border-right: 1px solid #ddd; font-size: 8.5px; text-align: center; }
  .cargo-table td.left { text-align: left; }
  .cargo-table tr:last-child td { border-bottom: none; }

  /* Financial summary */
  .finance-row { display: flex; border-top: 1px solid #1565C0; border-bottom: 1px solid #1565C0; page-break-inside: avoid; }
  .finance-col { flex: 1; padding: 5px 10px; }
  .finance-col:not(:last-child) { border-right: 1px solid #1565C0; }
  .amount-label { font-size: 7.5px; color: #666; display: block; }
  .amount-value { font-size: 11px; font-weight: 900; color: #1565C0; }

  /* Risk & eway */
  .info-row { display: flex; border-bottom: 1px solid #1565C0; page-break-inside: avoid; }
  .info-col { flex: 1; padding: 5px 10px; }
  .info-col:not(:last-child) { border-right: 1px solid #1565C0; }

  /* T&C */
  .tnc-section { padding: 6px 10px; border-bottom: 1px solid #1565C0; page-break-inside: avoid; }
  .tnc-title { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #1565C0; margin-bottom: 2px; }
  .tnc-list { padding-left: 12px; }
  .tnc-list li { font-size: 7.5px; color: #444; margin-bottom: 1px; line-height: 1.3; }

  /* Signature strip */
  .sig-row { display: flex; border-top: 1px solid #1565C0; page-break-inside: avoid; }
  .sig-col { flex: 1; padding: 6px 10px; text-align: center; }
  .sig-col:not(:last-child) { border-right: 1px solid #1565C0; }
  .sig-label { font-size: 7.5px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
  .sig-img { max-height: 32px; max-width: 100px; }
  .sig-line { border-top: 1px solid #333; margin-top: 6px; padding-top: 2px; font-size: 7.5px; color: #333; }

  /* Footer */
  .footer { background: #1565C0; color: #fff; text-align: center; padding: 3px; font-size: 7.5px; page-break-inside: avoid; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-wrap">
      ${logoSrc ? `<img src="${logoSrc}" alt="Logo"/>` : `<span class="logo-placeholder">${firmName.charAt(0)}</span>`}
    </div>
    <div class="firm-info">
      <div class="firm-name">${firmName}</div>
      <div class="firm-sub">Transport Commission Agent &amp; Freight Broker</div>
      <div class="firm-sub">${firmAddress}, ${firmCity}, ${firmState} - ${firmPincode}</div>
      <div class="firm-sub">📞 ${firmPhone}${firmEmail ? ` | ✉ ${firmEmail}` : ''}</div>
      <div class="firm-gstin">GSTIN: ${firmGstin} | PAN: ${firmPan}</div>
    </div>
    <div class="lr-box">
      <div class="lr-label">Lorry Receipt No.</div>
      <div class="lr-number">${lrNum}</div>
      <div class="lr-date">Date: ${formatDate(tripDate)}</div>
      <div style="margin-top:3px;font-size:9px;font-weight:700;color:#1565C0;">Status: ${tripStatus}</div>
    </div>
  </div>

  <!-- TITLE -->
  <div class="title-bar">Digital Lorry Receipt (Bilty) / लॉरी रसीद</div>

  <!-- CONSIGNOR / VENDOR -->
  <div class="party-row">
    <div class="party-col">
      <div class="party-label">Consignor (Customer / Shipper / बुकिंग पार्टी)</div>
      <div class="party-name">${custName}</div>
      <div class="party-detail">Contact: ${custContact} ${custPhone ? `| 📞 ${custPhone}` : ''}</div>
      <div class="party-detail">${custAddress}${custCity}, ${custState}</div>
      ${custGstin ? `<div class="party-detail">GSTIN: ${custGstin}</div>` : ''}
      ${custPan ? `<div class="party-detail">PAN: ${custPan}</div>` : ''}
    </div>
    <div class="party-col">
      <div class="party-label">Vendor (Fleet Owner / Transporter / गाडी मालक)</div>
      <div class="party-name">${vendName}</div>
      <div class="party-detail">Contact: ${vendContact} ${vendPhone ? `| 📞 ${vendPhone}` : ''}</div>
      <div class="party-detail">${vendCity}${vendState ? `, ${vendState}` : ''}</div>
      ${vendGstin ? `<div class="party-detail">GSTIN: ${vendGstin}</div>` : ''}
      ${vendPan ? `<div class="party-detail">PAN: ${vendPan}</div>` : ''}
    </div>
  </div>

  <!-- ROUTE & VEHICLE -->
  <div class="route-row">
    <div class="route-col">
      <span class="field-label">From (Origin)</span>
      <span class="field-value">📍 ${trip?.origin || '-'}</span>
    </div>
    <div class="route-col">
      <span class="field-label">To (Destination)</span>
      <span class="field-value">📍 ${trip?.destination || '-'}</span>
    </div>
    <div class="route-col">
      <span class="field-label">Truck Number</span>
      <span class="field-value">🚛 ${trip?.vehicleNumber || '-'}</span>
    </div>
    <div class="route-col">
      <span class="field-label">Driver Phone / Name</span>
      <span class="field-value">${trip?.driverName ?? 'Driver'}${trip?.driverPhone ? ` | 📞 ${trip.driverPhone}` : ''}</span>
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
      <li>All disputes are subject to the jurisdiction of courts at ${firmCity}.</li>
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
      <div class="sig-line">Vehicle: ${trip?.vehicleNumber || '-'}</div>
    </div>
    <div class="sig-col">
      <span class="sig-label">For ${firmName}</span>
      ${sigSrc
        ? `<img src="${sigSrc}" class="sig-img" alt="Signature"/>`
        : `<div style="height:40px;border:1px dashed #aaa;margin-top:4px;"></div>`
      }
      <div class="sig-line">Authorized Signatory &amp; Stamp</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    ${firmName} | Bank: ${firm?.bankDetails?.bankName || 'HDFC Bank Ltd'} | A/C: ${firm?.bankDetails?.accountNumber || '50200012345678'} | IFSC: ${firm?.bankDetails?.ifscCode || 'HDFC0000123'} | 
    Generated on ${formatDateShort(new Date().toISOString())} | This is a digitally generated Lorry Receipt
  </div>

</div>
</body>
</html>`;
}
