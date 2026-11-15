import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { getInvoiceById, saveInvoice } from '../../db/repositories/invoiceRepository';
import { getPartyById } from '../../db/repositories/partyRepository';
import { getFirmProfile } from '../../db/repositories/firmRepository';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useFirmStore } from '../../store/firmStore';
import { usePDFShare } from '../../hooks/usePDFShare';
import { formatINR } from '../../utils/currency';
import { formatDate, toISO } from '../../utils/dateUtils';
import { GST_MODE_LABELS } from '../../constants/gstRates';
import { Invoice } from '../../types/invoice.types';
import { Party } from '../../types/party.types';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);

  const { firm, setFirm } = useFirmStore();
  const { updateInvoice } = useInvoiceStore();
  const { shareInvoice, previewInvoice, isGenerating } = usePDFShare();

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inv, firmData] = await Promise.all([
        getInvoiceById(id),
        firm ? Promise.resolve(firm) : getFirmProfile(),
      ]);

      if (inv) {
        setInvoice(inv);
        if (firmData) setFirm(firmData);
        const cust = await getPartyById(inv.customerId);
        setCustomer(cust);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, firm, setFirm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEffectiveContext = async () => {
    let cust = customer;
    if (!cust && invoice?.customerId) {
      cust = await getPartyById(invoice.customerId);
      if (cust) setCustomer(cust);
    }

    const effectiveCustomer: Party = cust ?? {
      id: invoice?.customerId || 'cust-1',
      partyType: 'CUSTOMER',
      companyName: 'Billed Customer',
      contactPerson: 'Accounts Dept',
      phone: '',
      city: 'Pune',
      state: 'Maharashtra',
      isActive: true,
      isDirty: false,
      createdAt: invoice?.createdAt || new Date().toISOString(),
      updatedAt: invoice?.updatedAt || new Date().toISOString(),
    };

    let currentFirm = firm ?? (await getFirmProfile());
    if (!currentFirm) {
      currentFirm = {
        id: 'default-firm',
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
        currentLrSequence: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return { effectiveCustomer, currentFirm };
  };

  const handlePreviewInvoice = async () => {
    if (!invoice) {
      Alert.alert('Error', 'Invoice details are still loading.');
      return;
    }
    try {
      const { effectiveCustomer, currentFirm } = await getEffectiveContext();
      await previewInvoice(currentFirm, invoice, effectiveCustomer);
    } catch (e: any) {
      console.error('Invoice preview error:', e);
      Alert.alert('Error', e?.message || 'Failed to display Invoice PDF preview');
    }
  };

  const handleShareInvoice = async () => {
    if (!invoice) {
      Alert.alert('Error', 'Invoice details are still loading.');
      return;
    }

    try {
      const { effectiveCustomer, currentFirm } = await getEffectiveContext();
      await shareInvoice(currentFirm, invoice, effectiveCustomer);
    } catch (e: any) {
      console.error('Invoice share error:', e);
      Alert.alert('Error', e?.message || 'Failed to generate or share Invoice PDF');
    }
  };

  const handleTogglePaid = async () => {
    if (!invoice) return;
    const newStatus = !invoice.isPaid;
    const updated: Invoice = {
      ...invoice,
      isPaid: newStatus,
      paidAt: newStatus ? toISO() : undefined,
    };
    await saveInvoice(updated);
    setInvoice(updated);
    updateInvoice(invoice.id, updated);
    Alert.alert(
      'Status Updated',
      newStatus ? 'Invoice marked as PAID' : 'Invoice marked as UNPAID'
    );
  };

  if (loading || !invoice) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>{invoice.invoiceNumber}</Text>
          <Text style={styles.headerDate}>{formatDate(invoice.invoiceDate)}</Text>
        </View>
        <View
          style={[
            styles.paidBadge,
            { backgroundColor: invoice.isPaid ? Colors.success : Colors.warning },
          ]}
        >
          <Text style={styles.paidText}>
            {invoice.isPaid ? 'PAID' : 'PAYMENT DUE'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* PDF Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.previewBtn, isGenerating && { opacity: 0.6 }]}
            onPress={handlePreviewInvoice}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="file-eye-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>
              {isGenerating ? 'Loading...' : 'View & Print PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareBtn, isGenerating && { opacity: 0.6 }]}
            onPress={handleShareInvoice}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>WhatsApp Share</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Status Action */}
        <TouchableOpacity
          style={[
            styles.togglePaidBtn,
            { backgroundColor: invoice.isPaid ? '#FFF3E0' : '#E8F5E9' },
          ]}
          onPress={handleTogglePaid}
        >
          <MaterialCommunityIcons
            name={invoice.isPaid ? 'close-circle-outline' : 'check-circle-outline'}
            size={20}
            color={invoice.isPaid ? Colors.warning : Colors.success}
          />
          <Text
            style={[
              styles.togglePaidText,
              { color: invoice.isPaid ? Colors.warning : Colors.success },
            ]}
          >
            {invoice.isPaid ? 'Mark as Unpaid' : 'Mark as Received & Paid'}
          </Text>
        </TouchableOpacity>

        {/* Official Tax Invoice Document Sheet */}
        <View style={styles.invoiceSheet}>
          {/* Sheet Top Title Bar */}
          <View style={styles.sheetTopBar}>
            <Text style={styles.sheetTopBarText}>
              GST TAX INVOICE — GOODS TRANSPORT AGENCY
            </Text>
          </View>

          {/* Firm & Invoice Meta Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.sheetFirmName}>
                {firm?.firmName || 'SHIVAJI ROADLINES & LOGISTICS'}
              </Text>
              <Text style={styles.sheetFirmTag}>
                GTA / Transport Commission Agent & Fleet Operators
              </Text>
              <Text style={styles.sheetFirmSub}>
                {firm?.address || 'Shop No. 14, Transport Nagar, Nigdi'}, {firm?.city || 'Pune'}, {firm?.state || 'Maharashtra'} - {firm?.pincode || '411019'}
              </Text>
              <Text style={styles.sheetFirmSub}>
                📞 {firm?.phone || '9822012345'} {firm?.email ? `| ✉ ${firm.email}` : ''}
              </Text>
              <Text style={styles.sheetFirmGst}>
                <strong>GSTIN:</strong> {firm?.gstin || '27AABCS1234F1Z8'} &nbsp;|&nbsp; <strong>PAN:</strong> {firm?.pan || 'AABCS1234F'}
              </Text>
            </View>

            <View style={styles.sheetInvBadgeBox}>
              <View style={styles.sheetTaxBadge}>
                <Text style={styles.sheetTaxBadgeText}>TAX INVOICE</Text>
              </View>
              <Text style={styles.sheetInvNum}>{invoice.invoiceNumber}</Text>
              <Text style={styles.sheetInvDate}>Date: {formatDate(invoice.invoiceDate)}</Text>
              <View style={styles.rcmBadge}>
                <Text style={styles.rcmBadgeText}>
                  {GST_MODE_LABELS[invoice.gstMode] || invoice.gstMode}
                </Text>
              </View>
            </View>
          </View>

          {/* Two-Column Bill To & Service Info */}
          <View style={styles.sheetPartyRow}>
            <View style={[styles.sheetPartyCol, { borderRightWidth: 1, borderRightColor: '#BFDBFE' }]}>
              <Text style={styles.sheetSectionTitle}>BILL TO / ग्राहक</Text>
              <Text style={styles.sheetCustName}>{customer?.companyName ?? 'Customer'}</Text>
              <Text style={styles.sheetCustDetail}>
                Contact: {customer?.contactPerson ?? 'Accounts'} {customer?.phone ? `| 📞 ${customer.phone}` : ''}
              </Text>
              <Text style={styles.sheetCustDetail}>
                📍 {customer?.address ? `${customer.address}, ` : ''}{customer?.city ?? 'Pune'}, {customer?.state ?? 'Maharashtra'}
              </Text>
              {customer?.gstin ? (
                <Text style={styles.sheetCustGst}>GSTIN: {customer.gstin}</Text>
              ) : null}
            </View>

            <View style={styles.sheetPartyCol}>
              <Text style={styles.sheetSectionTitle}>SERVICE DETAILS</Text>
              <Text style={styles.sheetServiceText}>
                <strong>SAC Code:</strong> 996511
              </Text>
              <Text style={styles.sheetServiceSub}>
                Goods Transport Services by Road (GTA)
              </Text>
              <Text style={styles.sheetServiceText}>
                <strong>Total Billed Trips:</strong> {invoice.lineItems.length}
              </Text>
              <Text style={styles.sheetServiceText}>
                <strong>Place of Supply:</strong> {customer?.state ?? 'Maharashtra'}
              </Text>
            </View>
          </View>

          {/* Line Items Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableTh, { width: 28 }]}>#</Text>
              <Text style={[styles.tableTh, { width: 85 }]}>LR No.</Text>
              <Text style={[styles.tableTh, { flex: 1 }]}>Route & Truck</Text>
              <Text style={[styles.tableTh, { width: 80, textAlign: 'right' }]}>Amount</Text>
            </View>

            {invoice.lineItems.map((item, idx) => (
              <View key={item.tripId + idx} style={styles.tableRow}>
                <Text style={[styles.tableTd, { width: 28, color: Colors.textMuted }]}>
                  {idx + 1}
                </Text>
                <View style={{ width: 85 }}>
                  <Text style={styles.tableLrNum}>{item.lrNumber}</Text>
                  <Text style={styles.tableLrDate}>{formatDate(item.lrDate)}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 4 }}>
                  <Text style={styles.tableRoute}>
                    {item.origin} → {item.destination}
                  </Text>
                  <Text style={styles.tableTruck}>
                    🚛 {item.vehicleNumber} {item.description ? `• ${item.description}` : ''}
                  </Text>
                </View>
                <Text style={[styles.tableTd, styles.tableAmt, { width: 80 }]}>
                  {formatINR(item.amount)}
                </Text>
              </View>
            ))}

            {/* Subtotal row */}
            <View style={styles.tableSubtotalRow}>
              <Text style={styles.tableSubtotalLabel}>Subtotal</Text>
              <Text style={styles.tableSubtotalVal}>{formatINR(invoice.subtotal)}</Text>
            </View>
          </View>

          {/* RCM Notice */}
          {invoice.gstMode === 'RCM' && (
            <View style={styles.sheetRcmNotice}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#C2410C" />
              <Text style={styles.sheetRcmNoticeText}>
                <strong>RCM Notice:</strong> GST liability is payable by recipient under Section 9(3) of CGST Act. The GTA is not liable to pay GST.
              </Text>
            </View>
          )}

          {/* Totals & Calculations */}
          <View style={styles.sheetTotalsRow}>
            <View style={styles.sheetWordsCol}>
              <Text style={styles.sheetWordsLabel}>Amount in Words:</Text>
              <Text style={styles.sheetWordsVal}>{invoice.amountInWords}</Text>
              <View style={styles.sheetBankBox}>
                <Text style={styles.sheetBankTitle}>BANK PAYMENT DETAILS</Text>
                <Text style={styles.sheetBankText}>
                  Bank: <strong>{firm?.bankDetails?.bankName || 'HDFC Bank Ltd'}</strong>
                  {firm?.bankDetails?.branchName ? ` (${firm.bankDetails.branchName})` : ''}
                </Text>
                <Text style={styles.sheetBankText}>
                  A/C: <strong>{firm?.bankDetails?.accountNumber || '50200012345678'}</strong>
                </Text>
                <Text style={styles.sheetBankText}>
                  IFSC: <strong>{firm?.bankDetails?.ifscCode || 'HDFC0000123'}</strong>
                </Text>
              </View>
            </View>

            <View style={styles.sheetCalcCol}>
              <View style={styles.calcLine}>
                <Text style={styles.calcLineLabel}>Subtotal</Text>
                <Text style={styles.calcLineVal}>{formatINR(invoice.subtotal)}</Text>
              </View>

              {invoice.gstMode !== 'RCM' && (
                <>
                  {invoice.cgst > 0 && (
                    <View style={styles.calcLine}>
                      <Text style={styles.calcLineLabel}>CGST</Text>
                      <Text style={styles.calcLineVal}>{formatINR(invoice.cgst)}</Text>
                    </View>
                  )}
                  {invoice.sgst > 0 && (
                    <View style={styles.calcLine}>
                      <Text style={styles.calcLineLabel}>SGST</Text>
                      <Text style={styles.calcLineVal}>{formatINR(invoice.sgst)}</Text>
                    </View>
                  )}
                  {invoice.igst > 0 && (
                    <View style={styles.calcLine}>
                      <Text style={styles.calcLineLabel}>IGST</Text>
                      <Text style={styles.calcLineVal}>{formatINR(invoice.igst)}</Text>
                    </View>
                  )}
                </>
              )}

              {invoice.gstMode === 'RCM' && (
                <View style={styles.calcLine}>
                  <Text style={styles.calcLineLabel}>GST (RCM)</Text>
                  <Text style={styles.calcLineVal}>₹0 (By Recipient)</Text>
                </View>
              )}

              <View style={styles.grandTotalLine}>
                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                <Text style={styles.grandTotalVal}>{formatINR(invoice.grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Signature / Stamp Section */}
          <View style={styles.sheetSigRow}>
            <View style={styles.sheetSigCol}>
              <Text style={styles.sheetSigTitle}>Customer Acknowledgement</Text>
              <View style={styles.sigBox} />
              <Text style={styles.sheetSigSub}>Receiver's Signature & Stamp</Text>
            </View>

            <View style={styles.sheetSigCol}>
              <Text style={styles.sheetSigTitle}>
                For {firm?.firmName || 'SHIVAJI ROADLINES & LOGISTICS'}
              </Text>
              <View style={styles.sigBox}>
                <MaterialCommunityIcons name="seal" size={28} color="#93C5FD" />
              </View>
              <Text style={styles.sheetSigSub}>Authorized Signatory</Text>
            </View>
          </View>

          {/* Sheet Footer */}
          <View style={styles.sheetFooter}>
            <Text style={styles.sheetFooterText}>
              This is a computer generated GST Tax Invoice issued under Indian Goods Transport Agency Regulations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.primary },
  headerDate: { fontSize: 10, color: Colors.textMuted },
  paidBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  paidText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  scroll: { padding: Spacing.md, paddingBottom: 60, gap: Spacing.md },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 6,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  actionBtnText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: '800' },
  togglePaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  togglePaidText: { fontSize: FontSizes.xs, fontWeight: '800' },
  invoiceSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: '#1D4ED8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sheetTopBar: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 6,
    alignItems: 'center',
  },
  sheetTopBarText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sheetHeader: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  sheetFirmName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  sheetFirmTag: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sheetFirmSub: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sheetFirmGst: {
    fontSize: 8,
    color: '#1E40AF',
    marginTop: 2,
  },
  sheetInvBadgeBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheetTaxBadge: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sheetTaxBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  sheetInvNum: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 3,
  },
  sheetInvDate: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rcmBadge: {
    backgroundColor: '#F97316',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  rcmBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
  sheetPartyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  sheetPartyCol: {
    flex: 1,
    padding: 8,
  },
  sheetSectionTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1D4ED8',
    marginBottom: 3,
  },
  sheetCustName: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sheetCustDetail: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sheetCustGst: {
    fontSize: 8,
    fontWeight: '700',
    color: '#1D4ED8',
    marginTop: 2,
  },
  sheetServiceText: {
    fontSize: 8,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  sheetServiceSub: {
    fontSize: 7,
    color: Colors.textMuted,
  },
  tableContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  tableTh: {
    fontSize: 8,
    fontWeight: '800',
    color: '#334155',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableTd: {
    fontSize: 8,
    color: Colors.textPrimary,
  },
  tableLrNum: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  tableLrDate: {
    fontSize: 7,
    color: Colors.textMuted,
  },
  tableRoute: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tableTruck: {
    fontSize: 7,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  tableAmt: {
    textAlign: 'right',
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tableSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tableSubtotalLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tableSubtotalVal: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sheetRcmNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  sheetRcmNoticeText: {
    fontSize: 8,
    color: '#9A3412',
    flex: 1,
  },
  sheetTotalsRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sheetWordsCol: {
    flex: 1,
    paddingRight: 8,
  },
  sheetWordsLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  sheetWordsVal: {
    fontSize: 8,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#1E40AF',
    marginTop: 1,
  },
  sheetBankBox: {
    backgroundColor: '#EFF6FF',
    padding: 5,
    borderRadius: 4,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sheetBankTitle: {
    fontSize: 7,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  sheetBankText: {
    fontSize: 7,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  sheetCalcCol: {
    width: 130,
    justifyContent: 'center',
  },
  calcLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  calcLineLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
  calcLineVal: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  grandTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#1D4ED8',
    paddingTop: 3,
    marginTop: 2,
  },
  grandTotalLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  grandTotalVal: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  sheetSigRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sheetSigCol: {
    flex: 1,
    alignItems: 'center',
  },
  sheetSigTitle: {
    fontSize: 7,
    fontWeight: '700',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  sigBox: {
    height: 32,
    width: '80%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 4,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSigSub: {
    fontSize: 7,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  sheetFooter: {
    padding: 5,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
  },
  sheetFooterText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '600',
    textAlign: 'center',
  },
});

