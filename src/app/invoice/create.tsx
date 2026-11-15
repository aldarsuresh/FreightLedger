import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { generateUUID } from '../../utils/uuid';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { usePartyStore } from '../../store/partyStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useTripStore } from '../../store/tripStore';
import { getAllParties } from '../../db/repositories/partyRepository';
import { getTripsByCustomer, updateTripStatus } from '../../db/repositories/tripRepository';
import { saveInvoice, getNextInvoiceNumber } from '../../db/repositories/invoiceRepository';
import { formatINR, amountToWords } from '../../utils/currency';
import { formatDate, toISO } from '../../utils/dateUtils';
import { GSTMode, GST_MODE_LABELS, GST_RATES } from '../../constants/gstRates';
import { Trip } from '../../types/trip.types';
import { Party } from '../../types/party.types';
import { Invoice, InvoiceLineItem } from '../../types/invoice.types';

export default function CreateInvoiceScreen() {
  const { parties, setParties } = usePartyStore();
  const { addInvoice } = useInvoiceStore();
  const { updateTrip } = useTripStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerTrips, setCustomerTrips] = useState<Trip[]>([]);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [gstMode, setGstMode] = useState<GSTMode>('RCM');
  const [isInterstate, setIsInterstate] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (parties.length === 0) {
      getAllParties().then(setParties);
    }
  }, [parties.length, setParties]);

  const customers = parties.filter((p) => p.partyType === 'CUSTOMER' && p.isActive);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Load trips when customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerTrips([]);
      setSelectedTripIds([]);
      return;
    }

    setLoadingTrips(true);
    getTripsByCustomer(selectedCustomerId)
      .then((trips) => {
        // Show trips that have POD received or are delivered, but not yet billed
        const billable = trips.filter(
          (t) => t.status === 'POD_RECEIVED' || t.status === 'DELIVERED'
        );
        setCustomerTrips(billable);
        // Default select all billable trips
        setSelectedTripIds(billable.map((t) => t.id));
      })
      .finally(() => setLoadingTrips(false));
  }, [selectedCustomerId]);

  const toggleTripSelection = (tripId: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    );
  };

  // Financial Computations
  const selectedTrips = customerTrips.filter((t) => selectedTripIds.includes(t.id));
  const subtotal = selectedTrips.reduce((sum, t) => sum + t.customerFreight, 0);

  const rates = GST_RATES[gstMode];
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstMode !== 'RCM') {
    if (isInterstate) {
      igst = Math.round((subtotal * rates.igst) / 100);
    } else {
      cgst = Math.round((subtotal * rates.cgst) / 100);
      sgst = Math.round((subtotal * rates.sgst) / 100);
    }
  }

  const totalGST = cgst + sgst + igst;
  const grandTotal = subtotal + totalGST;
  const amountInWordsStr = amountToWords(grandTotal);

  const handleGenerateInvoice = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Required', 'Please select a customer');
      return;
    }
    if (selectedTripIds.length === 0) {
      Alert.alert('Required', 'Please select at least one trip to bill');
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNumber = await getNextInvoiceNumber();
      const now = toISO();

      const lineItems: InvoiceLineItem[] = selectedTrips.map((t) => ({
        tripId: t.id,
        lrNumber: t.lrNumber,
        lrDate: t.date,
        vehicleNumber: t.vehicleNumber,
        origin: t.origin,
        destination: t.destination,
        description: t.materialDescription,
        amount: t.customerFreight,
      }));

      const invoice: Invoice = {
        id: generateUUID(),
        invoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        customerId: selectedCustomerId,
        tripIds: selectedTripIds,
        lineItems,
        gstMode,
        subtotal,
        cgst,
        sgst,
        igst,
        totalGST,
        grandTotal,
        amountInWords: amountInWordsStr,
        isPaid: false,
        isDirty: true,
        createdAt: now,
        updatedAt: now,
      };

      await saveInvoice(invoice);
      addInvoice(invoice);

      // Auto update linked trips to 'BILLED'
      for (const t of selectedTrips) {
        await updateTripStatus(t.id, 'BILLED', {
          invoice_id: invoice.id,
          billed_at: now,
        });
        updateTrip(t.id, {
          status: 'BILLED',
          invoiceId: invoice.id,
          billedAt: now,
        });
      }

      Alert.alert(
        '✅ GST Invoice Generated!',
        `Invoice ${invoiceNumber} created with ${selectedTripIds.length} trip(s).\nTotal: ${formatINR(grandTotal)}`,
        [
          {
            text: 'View Invoice & PDF',
            onPress: () => router.replace(`/invoice/${invoice.id}`),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate GST Tax Invoice</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step 1: Select Customer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Select Customer (Billed Party)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.custScroll}>
            {customers.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.custChip,
                  selectedCustomerId === c.id && styles.custChipActive,
                ]}
                onPress={() => setSelectedCustomerId(c.id)}
              >
                <Text
                  style={[
                    styles.custChipText,
                    selectedCustomerId === c.id && styles.custChipTextActive,
                  ]}
                >
                  {c.companyName}
                </Text>
                <Text
                  style={[
                    styles.custChipSub,
                    selectedCustomerId === c.id && { color: '#E3F2FD' },
                  ]}
                >
                  {c.city}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {customers.length === 0 && (
            <TouchableOpacity
              style={styles.addPartyLink}
              onPress={() => router.push('/party/create')}
            >
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>
                + Add Customer First
              </Text>
            </TouchableOpacity>
          )}

          {selectedCustomer && (
            <View style={styles.selectedCustBox}>
              <Text style={styles.scName}>{selectedCustomer.companyName}</Text>
              <Text style={styles.scSub}>
                GSTIN: {selectedCustomer.gstin ?? 'Unregistered'} &nbsp;|&nbsp; 📍 {selectedCustomer.city}, {selectedCustomer.state}
              </Text>
            </View>
          )}
        </View>

        {/* Step 2: Select Trips */}
        {selectedCustomerId ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>2. Select Billable Trips</Text>
              <Text style={styles.tripCountBadge}>
                {selectedTripIds.length} of {customerTrips.length} selected
              </Text>
            </View>

            {loadingTrips ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : customerTrips.length === 0 ? (
              <View style={styles.emptyTrips}>
                <MaterialCommunityIcons
                  name="truck-check-outline"
                  size={32}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyTripsText}>
                  No unbilled POD_RECEIVED or DELIVERED trips for this customer.
                </Text>
              </View>
            ) : (
              customerTrips.map((t) => {
                const isSelected = selectedTripIds.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tripItem, isSelected && styles.tripItemActive]}
                    onPress={() => toggleTripSelection(t.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={isSelected ? Colors.primary : Colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.tripItemHeader}>
                        <Text style={styles.tLr}>{t.lrNumber}</Text>
                        <Text style={styles.tDate}>{formatDate(t.date)}</Text>
                      </View>
                      <Text style={styles.tRoute}>
                        📍 {t.origin} → {t.destination} ({t.vehicleNumber})
                      </Text>
                      <Text style={styles.tMaterial}>📦 {t.materialDescription}</Text>
                    </View>
                    <Text style={styles.tAmt}>{formatINR(t.customerFreight)}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : null}

        {/* Step 3: GST Configuration */}
        {selectedTripIds.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. GST Rate & Tax Scheme</Text>

            {(['RCM', 'FORWARD_5', 'FORWARD_12'] as GSTMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.gstOption, gstMode === mode && styles.gstOptionActive]}
                onPress={() => setGstMode(mode)}
              >
                <MaterialCommunityIcons
                  name={gstMode === mode ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={gstMode === mode ? Colors.primary : Colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gstTitle, gstMode === mode && { color: Colors.primary }]}>
                    {GST_MODE_LABELS[mode]}
                  </Text>
                  <Text style={styles.gstDesc}>
                    {mode === 'RCM'
                      ? 'GTA Standard (0% by Broker) — GST payable by recipient of service'
                      : mode === 'FORWARD_5'
                      ? '5% GST charged on invoice without Input Tax Credit (ITC)'
                      : '12% GST charged on invoice with full ITC eligibility'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {gstMode !== 'RCM' && (
              <TouchableOpacity
                style={styles.interstateToggle}
                onPress={() => setIsInterstate(!isInterstate)}
              >
                <MaterialCommunityIcons
                  name={isInterstate ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.interstateText}>
                  Interstate Supply (Charge IGST instead of CGST+SGST)
                </Text>
              </TouchableOpacity>
            )}

            {/* Bill Summary */}
            <View style={styles.summaryBox}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Subtotal ({selectedTripIds.length} Trips)</Text>
                <Text style={styles.sumVal}>{formatINR(subtotal)}</Text>
              </View>

              {gstMode === 'RCM' ? (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>GST (Reverse Charge 0%)</Text>
                  <Text style={styles.sumVal}>₹0 (Receiver pays)</Text>
                </View>
              ) : isInterstate ? (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>IGST ({rates.igst}%)</Text>
                  <Text style={styles.sumVal}>{formatINR(igst)}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>CGST ({rates.cgst}%)</Text>
                    <Text style={styles.sumVal}>{formatINR(cgst)}</Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>SGST ({rates.sgst}%)</Text>
                    <Text style={styles.sumVal}>{formatINR(sgst)}</Text>
                  </View>
                </>
              )}

              <View style={[styles.sumRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalVal}>{formatINR(grandTotal)}</Text>
              </View>
              <Text style={styles.wordsText}>In Words: {amountInWordsStr}</Text>
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, submitting && { opacity: 0.6 }]}
              onPress={handleGenerateInvoice}
              disabled={submitting}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#fff" />
              <Text style={styles.generateBtnText}>
                {submitting ? 'Generating Invoice...' : 'Generate 1-Click Tax Invoice'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.primary },
  scroll: { padding: Spacing.md, paddingBottom: 60, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripCountBadge: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  custScroll: { flexDirection: 'row', paddingVertical: 4 },
  custChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  custChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  custChipText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  custChipTextActive: { color: '#fff' },
  custChipSub: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  addPartyLink: { paddingVertical: 8 },
  selectedCustBox: {
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginTop: 8,
  },
  scName: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  scSub: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  emptyTrips: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyTripsText: { fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: 'center' },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  tripItemActive: { backgroundColor: Colors.primaryLight },
  tripItemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  tLr: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.primary },
  tDate: { fontSize: 9, color: Colors.textMuted },
  tRoute: { fontSize: 10, color: Colors.textPrimary, fontWeight: '600', marginTop: 1 },
  tMaterial: { fontSize: 9, color: Colors.textSecondary },
  tAmt: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textPrimary },
  gstOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  gstOptionActive: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.sm, paddingHorizontal: 6 },
  gstTitle: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  gstDesc: { fontSize: 9, color: Colors.textMuted, marginTop: 1 },
  interstateToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  interstateText: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '600' },
  summaryBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  sumVal: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  grandTotalRow: {
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  grandTotalVal: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.primary },
  wordsText: { fontSize: 9, fontStyle: 'italic', color: Colors.textMuted, marginTop: 4 },
  generateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.md,
  },
  generateBtnText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '800' },
});

