import { FirmProfile } from '../../types/firm.types';
import { Invoice, InvoiceLineItem } from '../../types/invoice.types';
import { Party } from '../../types/party.types';
import { formatDate, formatDateShort } from '../../utils/dateUtils';
import { formatINR } from '../../utils/currency';
import { GST_MODE_LABELS } from '../../constants/gstRates';

interface InvoiceTemplateParams {
  firm: FirmProfile;
  invoice: Invoice;
  customer: Party;
  logoBase64?: string;
  signatureBase64?: string;
}

export function generateInvoiceHTML(params: InvoiceTemplateParams): string {
  const { firm, invoice, customer, logoBase64, signatureBase64 } = params;
  const logoSrc = logoBase64 ? `data:image/png;base64,${logoBase64}` : '';
  const sigSrc = signatureBase64 ? `data:image/png;base64,${signatureBase64}` : '';
  const gstMode = invoice?.gstMode || 'RCM';
  const isRCM = gstMode === 'RCM';

  const firmName = firm?.firmName || 'Shivaji Roadlines & Logistics';
  const firmAddress = firm?.address || 'Shop No. 14, Transport Nagar, Nigdi';
  const firmCity = firm?.city || 'Pune';
  const firmState = firm?.state || 'Maharashtra';
  const firmPincode = firm?.pincode || '411019';
  const firmPhone = firm?.phone || '9822012345';
  const firmEmail = firm?.email || '';
  const firmGstin = firm?.gstin || '27AABCS1234F1Z8';
  const firmPan = firm?.pan || 'AABCS1234F';

  const bankName = firm?.bankDetails?.bankName || 'HDFC Bank Ltd';
  const branchName = firm?.bankDetails?.branchName ? ` (${firm.bankDetails.branchName})` : '';
  const accountNumber = firm?.bankDetails?.accountNumber || '50200012345678';
  const ifscCode = firm?.bankDetails?.ifscCode || 'HDFC0000123';

  const custName = customer?.companyName || 'Billed Customer';
  const custContact = customer?.contactPerson || 'Accounts Dept';
  const custPhone = customer?.phone || '';
  const custAddress = customer?.address ? `${customer.address}, ` : '';
  const custCity = customer?.city || '';
  const custState = customer?.state || '';
  const custGstin = customer?.gstin || '';

  const lineItems = invoice?.lineItems || [];
  const lineItemsHTML = lineItems.map((item: InvoiceLineItem, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td class="left">${item?.lrNumber || '-'}</td>
      <td>${formatDate(item?.lrDate)}</td>
      <td>${item?.vehicleNumber || '-'}</td>
      <td>${item?.origin || '-'}</td>
      <td>${item?.destination || '-'}</td>
      <td class="left">${item?.description || 'Freight Transportation Services'}</td>
      <td class="right">${formatINR(item?.amount || 0)}</td>
    </tr>
  `).join('');

  const gstLabel = GST_MODE_LABELS[gstMode] || gstMode;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Tax Invoice - ${invoice?.invoiceNumber || 'INV'}</title>
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
  .header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1.5px solid #1565C0;
    background: #F0F6FF;
    page-break-inside: avoid;
  }
  .logo-wrap {
    width: 58px;
    height: 58px;
    margin-right: 10px;
    border: 1px solid #94A3B8;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    flex-shrink: 0;
  }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 22px; font-weight: 900; color: #1565C0; }
  .firm-info { flex: 1; min-width: 0; }
  .firm-name { font-size: 15px; font-weight: 900; color: #1565C0; text-transform: uppercase; letter-spacing: 0.3px; }
  .firm-sub { font-size: 8.5px; color: #334155; margin-top: 1px; }
  .inv-box { text-align: right; flex-shrink: 0; }
  .inv-title { font-size: 13px; font-weight: 900; color: #1565C0; border: 1.5px solid #1565C0; padding: 2px 8px; border-radius: 3px; display: inline-block; }
  .inv-num { font-size: 11px; font-weight: 800; margin-top: 3px; color: #0f172a; }
  .inv-date { font-size: 8.5px; color: #475569; margin-top: 1px; }
  .rcm-badge { background: #EA580C; color: #fff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 8px; display: inline-block; margin-top: 3px; }
  
  .title-bar {
    background: #1565C0;
    color: #fff;
    text-align: center;
    padding: 3px 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    page-break-inside: avoid;
  }
  
  .bill-row {
    display: flex;
    border-bottom: 1px solid #1565C0;
    page-break-inside: avoid;
  }
  .bill-col { flex: 1; padding: 6px 10px; }
  .bill-col:first-child { border-right: 1px solid #1565C0; }
  .col-title { font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #1565C0; border-bottom: 1px dashed #94A3B8; padding-bottom: 2px; margin-bottom: 3px; letter-spacing: 0.5px; }
  .col-name { font-size: 11px; font-weight: 800; color: #0f172a; }
  .col-detail { font-size: 8.5px; color: #334155; margin-top: 1px; }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: avoid;
  }
  .items-table th { background: #1565C0; color: #fff; padding: 4px 6px; font-size: 8px; font-weight: 800; text-transform: uppercase; }
  .items-table td { padding: 4px 6px; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; font-size: 8.5px; text-align: center; }
  .items-table tbody tr:nth-child(even) { background-color: #F8FAFC; }
  .items-table td.left { text-align: left; }
  .items-table td.right { text-align: right; font-weight: 700; }
  .items-table tfoot td { font-weight: 800; background: #F1F5F9; border-top: 1.5px solid #1565C0; padding: 4px 6px; }

  .rcm-note {
    background: #FFF7ED;
    border-top: 1px solid #FED7AA;
    border-bottom: 1px solid #FED7AA;
    padding: 4px 10px;
    font-size: 8px;
    color: #9A3412;
    page-break-inside: avoid;
  }

  .totals-section {
    display: flex;
    border-bottom: 1px solid #1565C0;
    page-break-inside: avoid;
  }
  .totals-left { flex: 1; padding: 6px 10px; border-right: 1px solid #1565C0; }
  .totals-right { width: 210px; padding: 6px 10px; flex-shrink: 0; }
  .total-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dashed #E2E8F0; font-size: 8.5px; }
  .total-row.grand { font-size: 11px; font-weight: 900; color: #1565C0; border-top: 1.5px solid #1565C0; border-bottom: none; padding-top: 4px; margin-top: 2px; }
  .words-box { padding: 4px 6px; background: #EFF6FF; border-radius: 3px; font-size: 8.5px; font-weight: 600; font-style: italic; color: #1E40AF; }
  
  .bottom-section {
    display: flex;
    border-bottom: 1px solid #1565C0;
    page-break-inside: avoid;
  }
  .bottom-bank { flex: 1; padding: 6px 10px; border-right: 1px solid #1565C0; }
  .bottom-sig { width: 220px; padding: 6px 10px; text-align: center; flex-shrink: 0; }
  .bank-title { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #1565C0; margin-bottom: 3px; }
  .bank-detail { font-size: 8.5px; color: #1e293b; line-height: 1.35; }
  .sig-title { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #1565C0; }
  .sig-box { height: 34px; margin: 2px 0; display: flex; align-items: center; justify-content: center; }
  .sig-img { max-height: 32px; max-width: 110px; }
  .sig-line { border-top: 1px solid #64748B; padding-top: 2px; font-size: 7.5px; color: #475569; }

  .footer {
    background: #1565C0;
    color: #fff;
    text-align: center;
    padding: 3px 6px;
    font-size: 7.5px;
    page-break-inside: avoid;
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="logo-wrap">
      ${logoSrc ? `<img src="${logoSrc}" alt="Logo"/>` : `<span class="logo-placeholder">${firmName.charAt(0)}</span>`}
    </div>
    <div class="firm-info">
      <div class="firm-name">${firmName}</div>
      <div class="firm-sub">Goods Transport Agency (GTA) / Transport Commission Agent</div>
      <div class="firm-sub">${firmAddress}, ${firmCity}, ${firmState} - ${firmPincode}</div>
      <div class="firm-sub">📞 ${firmPhone}${firmEmail ? ` | ✉ ${firmEmail}` : ''}</div>
      <div class="firm-sub"><strong>GSTIN:</strong> ${firmGstin} &nbsp;|&nbsp; <strong>PAN:</strong> ${firmPan}</div>
    </div>
    <div class="inv-box">
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-num"># ${invoice?.invoiceNumber || '-'}</div>
      <div class="inv-date">Date: ${formatDate(invoice?.invoiceDate)}</div>
      <div class="rcm-badge">${gstLabel}</div>
    </div>
  </div>

  <div class="title-bar">GST Tax Invoice — Goods Transport Agency Services</div>

  <div class="bill-row">
    <div class="bill-col">
      <div class="col-title">Bill To / बिल पाठवणारा</div>
      <div class="col-name">${custName}</div>
      <div class="col-detail">Contact: ${custContact} ${custPhone ? `| 📞 ${custPhone}` : ''}</div>
      <div class="col-detail">${custAddress}${custCity}, ${custState}</div>
      ${custGstin ? `<div class="col-detail"><strong>GSTIN:</strong> ${custGstin}</div>` : ''}
    </div>
    <div class="bill-col">
      <div class="col-title">Service Provider / सेवा प्रदाता</div>
      <div class="col-name">${firmName}</div>
      <div class="col-detail">${firmAddress}, ${firmCity}, ${firmState} - ${firmPincode}</div>
      <div class="col-detail"><strong>GSTIN:</strong> ${firmGstin}</div>
      <div class="col-detail"><strong>SAC Code:</strong> 996511 (Road Transport)</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:25px;">#</th>
        <th style="width:75px;">LR No.</th>
        <th style="width:70px;">LR Date</th>
        <th style="width:80px;">Vehicle No.</th>
        <th style="width:65px;">From</th>
        <th style="width:65px;">To</th>
        <th style="text-align:left;">Description</th>
        <th style="width:75px;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${lineItemsHTML}</tbody>
    <tfoot>
      <tr>
        <td colspan="7" style="text-align:right; font-weight:800;">Subtotal</td>
        <td class="right">${formatINR(invoice?.subtotal || 0)}</td>
      </tr>
    </tfoot>
  </table>

  ${isRCM ? `<div class="rcm-note">⚠️ <strong>Note:</strong> This supply is subject to <strong>Reverse Charge Mechanism (RCM)</strong> under Section 9(3) of the CGST Act, 2017. Liability to pay GST is on the recipient of services. GTA is NOT liable to pay GST.</div>` : ''}

  <div class="totals-section">
    <div class="totals-left">
      <div class="words-box">Amount in Words: <em>${invoice?.amountInWords || ''}</em></div>
      ${!isRCM ? `
      <div style="margin-top:4px; font-size:8px; color:#475569;">
        <strong>HSN/SAC:</strong> 996511 — Goods Transport Services by Road &nbsp;|&nbsp; <strong>GST Mode:</strong> ${gstLabel}
      </div>` : ''}
    </div>
    <div class="totals-right">
      <div class="total-row"><span>Subtotal</span><span>${formatINR(invoice?.subtotal || 0)}</span></div>
      ${(invoice?.cgst || 0) > 0 ? `<div class="total-row"><span>CGST</span><span>${formatINR(invoice.cgst)}</span></div>` : ''}
      ${(invoice?.sgst || 0) > 0 ? `<div class="total-row"><span>SGST</span><span>${formatINR(invoice.sgst)}</span></div>` : ''}
      ${(invoice?.igst || 0) > 0 ? `<div class="total-row"><span>IGST</span><span>${formatINR(invoice.igst)}</span></div>` : ''}
      ${isRCM ? `<div class="total-row"><span>GST (RCM)</span><span>₹0 (By Recipient)</span></div>` : ''}
      <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatINR(invoice?.grandTotal || 0)}</span></div>
    </div>
  </div>

  <div class="bottom-section">
    <div class="bottom-bank">
      <div class="bank-title">Payment Remittance Details / बँक तपशील</div>
      <div class="bank-detail">Bank: <strong>${bankName}</strong>${branchName}</div>
      <div class="bank-detail">A/C No.: <strong>${accountNumber}</strong> &nbsp;|&nbsp; IFSC: <strong>${ifscCode}</strong></div>
      <div class="bank-detail" style="margin-top:2px; color:#B91C1C; font-weight:700;">Please include Invoice No. ${invoice?.invoiceNumber || ''} in payment reference.</div>
    </div>
    <div class="bottom-sig">
      <div class="sig-title">For ${firmName}</div>
      <div class="sig-box">
        ${sigSrc ? `<img src="${sigSrc}" class="sig-img" alt="Sig"/>` : `<div style="height:26px;"></div>`}
      </div>
      <div class="sig-line">Authorized Signatory &amp; Stamp</div>
    </div>
  </div>

  <div class="footer">
    This is a computer-generated GST Tax Invoice | ${firmName} | GSTIN: ${firmGstin} | Generated: ${formatDateShort(new Date().toISOString())}
  </div>
</div>
</body>
</html>`;
}
