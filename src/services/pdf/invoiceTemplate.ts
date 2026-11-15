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
  const isRCM = invoice.gstMode === 'RCM';

  const lineItemsHTML = invoice.lineItems.map((item: InvoiceLineItem, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td class="left">${item.lrNumber}</td>
      <td>${formatDate(item.lrDate)}</td>
      <td>${item.vehicleNumber}</td>
      <td>${item.origin}</td>
      <td>${item.destination}</td>
      <td class="left">${item.description}</td>
      <td class="right">${formatINR(item.amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Tax Invoice - ${invoice.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; padding: 12px; }
  .page { width: 100%; max-width: 740px; margin: 0 auto; border: 2px solid #1565C0; }
  .header { display: flex; align-items: center; padding: 10px 14px; border-bottom: 2px solid #1565C0; background: #EEF4FF; }
  .logo-wrap { width: 68px; height: 68px; margin-right: 12px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; }
  .logo-wrap img { width: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 20px; font-weight: 900; color: #1565C0; }
  .firm-info { flex: 1; }
  .firm-name { font-size: 17px; font-weight: 900; color: #1565C0; text-transform: uppercase; }
  .firm-sub { font-size: 10px; color: #333; margin-top: 2px; }
  .inv-box { text-align: right; }
  .inv-title { font-size: 15px; font-weight: 900; color: #1565C0; border: 2px solid #1565C0; padding: 3px 10px; border-radius: 4px; }
  .inv-num { font-size: 13px; font-weight: 700; margin-top: 4px; }
  .inv-date { font-size: 10px; color: #555; }
  .rcm-badge { background: #FF6F00; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-top: 4px; }
  
  .title-bar { background: #1565C0; color: #fff; text-align: center; padding: 5px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  
  .bill-row { display: flex; border-bottom: 1px solid #1565C0; }
  .bill-col { flex: 1; padding: 8px 12px; }
  .bill-col:first-child { border-right: 1px solid #1565C0; }
  .col-title { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #1565C0; border-bottom: 1px dashed #aaa; padding-bottom: 3px; margin-bottom: 5px; }
  .col-name { font-size: 12px; font-weight: 700; }
  .col-detail { font-size: 10px; color: #333; margin-top: 2px; }

  .items-table { width: 100%; border-collapse: collapse; }
  .items-table th { background: #1565C0; color: #fff; padding: 5px 7px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .items-table td { padding: 6px 7px; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; font-size: 10px; text-align: center; }
  .items-table td.left { text-align: left; }
  .items-table td.right { text-align: right; font-weight: 600; }
  .items-table tfoot td { font-weight: 700; background: #f5f7fa; border-top: 2px solid #1565C0; }

  .totals-section { display: flex; border-top: 1px solid #1565C0; }
  .totals-left { flex: 1; padding: 10px 12px; border-right: 1px solid #1565C0; }
  .totals-right { width: 220px; padding: 8px 12px; }
  .total-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #ddd; font-size: 10px; }
  .total-row.grand { font-size: 13px; font-weight: 900; color: #1565C0; border-top: 2px solid #1565C0; border-bottom: none; padding-top: 5px; }
  .words-box { margin-top: 8px; padding: 6px; background: #E3F2FD; border-radius: 4px; font-size: 10px; font-weight: 600; font-style: italic; }
  
  .bank-section { padding: 8px 12px; border-top: 1px solid #1565C0; display: flex; align-items: flex-start; }
  .bank-title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #1565C0; margin-bottom: 4px; }
  .bank-detail { font-size: 10px; }
  
  .sig-row { display: flex; border-top: 1px solid #1565C0; }
  .sig-col { flex: 1; padding: 10px 12px; text-align: center; }
  .sig-col:not(:last-child) { border-right: 1px solid #1565C0; }
  .sig-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; }
  .sig-img { max-height: 40px; }
  .sig-line { border-top: 1px solid #333; margin-top: 10px; padding-top: 3px; font-size: 8px; }
  
  .footer { background: #1565C0; color: #fff; text-align: center; padding: 5px; font-size: 8px; }
  .rcm-note { background: #FFF3E0; border-left: 3px solid #FF6F00; padding: 5px 10px; font-size: 9px; color: #333; margin: 0; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="logo-wrap">
      ${logoSrc ? `<img src="${logoSrc}" alt="Logo"/>` : `<span class="logo-placeholder">${firm.firmName.charAt(0)}</span>`}
    </div>
    <div class="firm-info">
      <div class="firm-name">${firm.firmName}</div>
      <div class="firm-sub">Goods Transport Agency (GTA) / Transport Commission Agent</div>
      <div class="firm-sub">${firm.address}, ${firm.city}, ${firm.state} - ${firm.pincode}</div>
      <div class="firm-sub">📞 ${firm.phone}${firm.email ? ` | ✉ ${firm.email}` : ''}</div>
      <div class="firm-sub"><strong>GSTIN:</strong> ${firm.gstin} &nbsp;|&nbsp; <strong>PAN:</strong> ${firm.pan}</div>
    </div>
    <div class="inv-box">
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-num"># ${invoice.invoiceNumber}</div>
      <div class="inv-date">Date: ${formatDate(invoice.invoiceDate)}</div>
      <div class="rcm-badge">${GST_MODE_LABELS[invoice.gstMode]}</div>
    </div>
  </div>

  <div class="title-bar">GST Tax Invoice — Goods Transport Agency Services</div>

  <div class="bill-row">
    <div class="bill-col">
      <div class="col-title">Bill To / बिल पाठवणारा</div>
      <div class="col-name">${customer.companyName}</div>
      <div class="col-detail">Contact: ${customer.contactPerson} | 📞 ${customer.phone}</div>
      <div class="col-detail">${customer.address ?? ''}, ${customer.city}, ${customer.state}</div>
      ${customer.gstin ? `<div class="col-detail"><strong>GSTIN:</strong> ${customer.gstin}</div>` : ''}
    </div>
    <div class="bill-col">
      <div class="col-title">Service Provider / सेवा प्रदाता</div>
      <div class="col-name">${firm.firmName}</div>
      <div class="col-detail">${firm.address}, ${firm.city}, ${firm.state} - ${firm.pincode}</div>
      <div class="col-detail"><strong>GSTIN:</strong> ${firm.gstin}</div>
      <div class="col-detail"><strong>SAC Code:</strong> 996511 (Road Transport)</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>LR No.</th>
        <th>LR Date</th>
        <th>Vehicle No.</th>
        <th>From</th>
        <th>To</th>
        <th style="text-align:left">Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>${lineItemsHTML}</tbody>
    <tfoot>
      <tr>
        <td colspan="7" style="text-align:right; font-weight:700;">Subtotal</td>
        <td class="right">${formatINR(invoice.subtotal)}</td>
      </tr>
    </tfoot>
  </table>

  ${isRCM ? `<div class="rcm-note">⚠️ <strong>Note:</strong> This supply is subject to <strong>Reverse Charge Mechanism (RCM)</strong> under Section 9(3) of the CGST Act, 2017. The liability to pay GST is on the recipient of services. The supplier (GTA) is NOT liable to pay GST.</div>` : ''}

  <div class="totals-section">
    <div class="totals-left">
      <div class="words-box">Amount in Words: <em>${invoice.amountInWords}</em></div>
      ${!isRCM ? `
      <div style="margin-top:8px; font-size:9px; color:#555;">
        <strong>HSN/SAC:</strong> 996511 — Goods Transport Services by Road<br/>
        <strong>GST Mode:</strong> ${GST_MODE_LABELS[invoice.gstMode]}
      </div>` : ''}
    </div>
    <div class="totals-right">
      <div class="total-row"><span>Subtotal</span><span>${formatINR(invoice.subtotal)}</span></div>
      ${invoice.cgst > 0 ? `<div class="total-row"><span>CGST</span><span>${formatINR(invoice.cgst)}</span></div>` : ''}
      ${invoice.sgst > 0 ? `<div class="total-row"><span>SGST</span><span>${formatINR(invoice.sgst)}</span></div>` : ''}
      ${invoice.igst > 0 ? `<div class="total-row"><span>IGST</span><span>${formatINR(invoice.igst)}</span></div>` : ''}
      ${isRCM ? `<div class="total-row"><span>GST (RCM)</span><span>₹0 (Payable by Receiver)</span></div>` : ''}
      <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatINR(invoice.grandTotal)}</span></div>
    </div>
  </div>

  <div class="bank-section">
    <div>
      <div class="bank-title">Payment Details / बँक तपशील</div>
      <div class="bank-detail">Bank: <strong>${firm.bankDetails.bankName}</strong>${firm.bankDetails.branchName ? ` (${firm.bankDetails.branchName})` : ''}</div>
      <div class="bank-detail">A/C No.: <strong>${firm.bankDetails.accountNumber}</strong> &nbsp;|&nbsp; IFSC: <strong>${firm.bankDetails.ifscCode}</strong></div>
      <div class="bank-detail" style="margin-top:4px; color:#C62828; font-weight:600;">Please include Invoice No. ${invoice.invoiceNumber} in payment reference.</div>
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-col">
      <span class="sig-label">Receiver Acknowledgement</span>
      <div style="height:40px;border:1px dashed #aaa;margin:4px 0;"></div>
      <div class="sig-line">Date: _____________ Stamp &amp; Sign</div>
    </div>
    <div class="sig-col">
      <span class="sig-label">For ${firm.firmName}</span>
      ${sigSrc ? `<img src="${sigSrc}" class="sig-img" alt="Sig"/>` : `<div style="height:40px;border:1px dashed #aaa;margin:4px 0;"></div>`}
      <div class="sig-line">Authorized Signatory</div>
    </div>
  </div>

  <div class="footer">
    This is a computer-generated Tax Invoice | ${firm.firmName} | GSTIN: ${firm.gstin} | Generated: ${formatDateShort(new Date().toISOString())}
  </div>
</div>
</body>
</html>`;
}
