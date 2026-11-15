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
  const { shareInvoice, isGenerating } = usePDFShare();

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

  const handleShareInvoice = async () => {
    if (!invoice) {
      Alert.alert('Error', 'Invoice details are still loading.');
      return;
    }

    try {
      let cust = customer;
      if (!cust && invoice.customerId) {
        cust = await getPartyById(invoice.customerId);
        if (cust) setCustomer(cust);
      }

      const effectiveCustomer: Party = cust ?? {
        id: invoice.customerId,
        partyType: 'CUSTOMER',
        companyName: 'Billed Customer',
        contactPerson: 'Accounts Dept',
        phone: '',
        city: 'Local',
        state: 'State',
        isActive: true,
        isDirty: false,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
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
        {/* Share on WhatsApp Button */}
        <TouchableOpacity
          style={[styles.shareBtn, isGenerating && { opacity: 0.6 }]}
          onPress={handleShareInvoice}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialCommunityIcons name="whatsapp" size={22} color="#fff" />
          )}
          <Text style={styles.shareBtnText}>
            {isGenerating ? 'Generating Invoice PDF...' : 'Share Tax Invoice on WhatsApp'}
          </Text>
          <MaterialCommunityIcons name="file-pdf-box" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Billed To Customer */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>BILLED TO</Text>
          <Text style={styles.custName}>{customer?.companyName ?? 'Customer'}</Text>
          <Text style={styles.custSub}>
            📍 {customer?.address ? `${customer.address}, ` : ''}
            {customer?.city}, {customer?.state}
          </Text>
          <Text style={styles.custSub}>📞 {customer?.phone}</Text>
          {customer?.gstin && (
            <Text style={styles.gstinText}>GSTIN: {customer.gstin}</Text>
          )}
        </View>

        {/* Line Items Table */}
        <View style={styles.card}>
          <Text style={styles.cardSection}>
            TRIP LINE ITEMS ({invoice.lineItems.length})
          </Text>
          {invoice.lineItems.map((item, idx) => (
            <View key={item.tripId + idx} style={styles.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLr}>{item.lrNumber}</Text>
                <Text style={styles.itemRoute}>
                  📍 {item.origin} → {item.destination} ({item.vehicleNumber})
                </Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
              <Text style={styles.itemAmt}>{formatINR(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* GST & Financial Breakup */}
        <View style={styles.card}>
          <View style={styles.schemeRow}>
            <Text style={styles.cardSection}>TAX COMPUTATION</Text>
            <View style={styles.schemeBadge}>
              <Text style={styles.schemeText}>{GST_MODE_LABELS[invoice.gstMode]}</Text>
            </View>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>{formatINR(invoice.subtotal)}</Text>
          </View>

          {invoice.gstMode === 'RCM' ? (
            <View style={styles.rcmAlert}>
              <Text style={styles.rcmAlertText}>
                ⚠️ <strong>RCM Notice:</strong> GST payable by recipient of service under Sec 9(3) of CGST Act.
              </Text>
            </View>
          ) : (
            <>
              {invoice.cgst > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>CGST</Text>
                  <Text style={styles.calcVal}>{formatINR(invoice.cgst)}</Text>
                </View>
              )}
              {invoice.sgst > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>SGST</Text>
                  <Text style={styles.calcVal}>{formatINR(invoice.sgst)}</Text>
                </View>
              )}
              {invoice.igst > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>IGST</Text>
                  <Text style={styles.calcVal}>{formatINR(invoice.igst)}</Text>
                </View>
              )}
            </>
          )}

          <View style={[styles.calcRow, styles.grandTotalRow]}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandVal}>{formatINR(invoice.grandTotal)}</Text>
          </View>

          <Text style={styles.wordsText}>
            <em>{invoice.amountInWords}</em>
          </Text>
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
  shareBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  shareBtnText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '800' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSection: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  custName: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary },
  custSub: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  gstinText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary, marginTop: 4 },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLr: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.primary },
  itemRoute: { fontSize: 10, color: Colors.textPrimary, marginTop: 1 },
  itemDesc: { fontSize: 9, color: Colors.textMuted },
  itemAmt: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textPrimary },
  schemeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  schemeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  schemeText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  calcLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  calcVal: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  rcmAlert: {
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: BorderRadius.sm,
    marginVertical: 6,
  },
  rcmAlertText: { fontSize: 10, color: '#E65100' },
  grandTotalRow: {
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  grandLabel: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  grandVal: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.primary },
  wordsText: { fontSize: 10, fontStyle: 'italic', color: Colors.textMuted, marginTop: 6 },
  togglePaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  togglePaidText: { fontSize: FontSizes.sm, fontWeight: '800' },
});

