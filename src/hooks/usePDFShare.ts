import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { generatePDF, sharePDF } from '../services/pdf/pdfService';
import { generateLRHTML } from '../services/pdf/lrTemplate';
import { generateInvoiceHTML } from '../services/pdf/invoiceTemplate';
import { FirmProfile } from '../types/firm.types';
import { Trip } from '../types/trip.types';
import { Invoice } from '../types/invoice.types';
import { Party } from '../types/party.types';

export function usePDFShare() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toBase64 = async (uri: string | undefined): Promise<string | undefined> => {
    if (!uri) return undefined;
    try {
      return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {
      return undefined;
    }
  };

  const shareLR = useCallback(async (
    firm: FirmProfile,
    trip: Trip,
    customer: Party,
    vendor: Party,
  ) => {
    setIsGenerating(true);
    setError(null);
    try {
      const logoBase64 = await toBase64(firm.logoUri);
      const signatureBase64 = await toBase64(firm.signatureUri);
      const html = generateLRHTML({ firm, trip, customer, vendor, logoBase64, signatureBase64 });
      const safeLrNumber = (trip.lrNumber || 'DOC').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `LR_${safeLrNumber}.pdf`;
      const { uri, tempUri } = await generatePDF(html, fileName);
      await sharePDF(uri, fileName, 'Share Digital LR PDF', tempUri);
    } catch (e: any) {
      console.error('[PDF] Error in shareLR:', e);
      const msg = e?.message ?? 'Failed to generate PDF';
      setError(msg);
      throw e;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const shareInvoice = useCallback(async (
    firm: FirmProfile,
    invoice: Invoice,
    customer: Party,
  ) => {
    setIsGenerating(true);
    setError(null);
    try {
      const logoBase64 = await toBase64(firm.logoUri);
      const signatureBase64 = await toBase64(firm.signatureUri);
      const html = generateInvoiceHTML({ firm, invoice, customer, logoBase64, signatureBase64 });
      const safeInvNumber = (invoice.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `INV_${safeInvNumber}.pdf`;
      const { uri, tempUri } = await generatePDF(html, fileName);
      await sharePDF(uri, fileName, `Share Invoice ${invoice.invoiceNumber}`, tempUri);
    } catch (e: any) {
      console.error('[PDF] Error in shareInvoice:', e);
      const msg = e?.message ?? 'Failed to generate PDF';
      setError(msg);
      throw e;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { shareLR, shareInvoice, isGenerating, error };
}
