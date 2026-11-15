import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { generateUUID } from '../../utils/uuid';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import {
  getTripById,
  saveTrip,
  updateTripStatus,
  savePaymentEntry,
  getPaymentsByTripId,
} from '../../db/repositories/tripRepository';
import { getPartyById } from '../../db/repositories/partyRepository';
import { getFirmProfile } from '../../db/repositories/firmRepository';
import { useTripStore } from '../../store/tripStore';
import { useFirmStore } from '../../store/firmStore';
import { usePDFShare } from '../../hooks/usePDFShare';
import {
  TRIP_STATUS_COLORS,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_TRANSITIONS,
  TripStatus,
} from '../../constants/tripStatus';
import { formatINR } from '../../utils/currency';
import { formatDate, toISO } from '../../utils/dateUtils';
import { Trip, PaymentEntry, PaymentMode } from '../../types/trip.types';
import { Party } from '../../types/party.types';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [customer, setCustomer] = useState<Party | null>(null);
  const [vendor, setVendor] = useState<Party | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [payPartyType, setPayPartyType] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const { firm, setFirm } = useFirmStore();
  const { updateTrip } = useTripStore();
  const { shareLR, isGenerating } = usePDFShare();

  const loadTripData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [tripData, firmData] = await Promise.all([
        getTripById(id),
        firm ? Promise.resolve(firm) : getFirmProfile(),
      ]);

      if (tripData) {
        setTrip(tripData);
        if (firmData) setFirm(firmData);

        const [cust, vend, pList] = await Promise.all([
          getPartyById(tripData.customerId),
          getPartyById(tripData.vendorId),
          getPaymentsByTripId(tripData.id),
        ]);
        setCustomer(cust);
        setVendor(vend);
        setPayments(pList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, firm, setFirm]);

  useEffect(() => {
    loadTripData();
  }, [loadTripData]);

  // Advance Status (e.g. IN_TRANSIT -> DELIVERED -> POD_RECEIVED -> BILLED -> PAID)
  const handleAdvanceStatus = async () => {
    if (!trip) return;
    const nextStatus = TRIP_STATUS_TRANSITIONS[trip.status];
    if (!nextStatus) {
      Alert.alert('Trip Completed', 'This trip has reached the final PAID status.');
      return;
    }

    if (nextStatus === 'POD_RECEIVED' && !trip.podImageUri) {
      Alert.alert(
        'Upload POD First',
        'Please take a photo or upload the signed Proof of Delivery (POD) before marking POD Received.',
        [
          { text: 'Capture POD Now', onPress: handleCapturePOD },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const extra: Record<string, any> = {};
    if (nextStatus === 'DELIVERED') {
      extra.delivered_at = toISO();
    }

    await updateTripStatus(trip.id, nextStatus, extra);
    const updated: Trip = {
      ...trip,
      status: nextStatus,
      deliveredAt: nextStatus === 'DELIVERED' ? toISO() : trip.deliveredAt,
    };
    setTrip(updated);
    updateTrip(trip.id, updated);
    Alert.alert('Status Updated', `Trip status changed to ${TRIP_STATUS_LABELS[nextStatus]}`);
  };

  // POD Photo Capture & Compression
  const handleCapturePOD = async () => {
    if (!trip) return;

    Alert.alert('Attach Proof of Delivery (POD)', 'Choose source:', [
      {
        text: '📸 Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission Denied', 'Camera permission is required');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            await processPODImage(result.assets[0].uri);
          }
        },
      },
      {
        text: '🖼️ Gallery',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission Denied', 'Gallery permission is required');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            await processPODImage(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const processPODImage = async (originalUri: string) => {
    if (!trip) return;
    try {
      // Compress & resize image to save space (<1MB)
      const manipResult = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      const now = toISO();
      const updated: Trip = {
        ...trip,
        podImageUri: manipResult.uri,
        podUploadedAt: now,
        status: trip.status === 'DELIVERED' ? 'POD_RECEIVED' : trip.status,
      };

      await saveTrip(updated);
      setTrip(updated);
      updateTrip(trip.id, updated);
      Alert.alert('✅ POD Uploaded!', 'Proof of delivery image attached successfully.');
    } catch (e: any) {
      Alert.alert('Compression Error', e.message);
    }
  };

  // WhatsApp Share LR PDF
  const handleShareLR = async () => {
    if (!trip) {
      Alert.alert('Error', 'Trip details not loaded yet. Please wait a moment.');
      return;
    }

    try {
      let cust = customer;
      let vend = vendor;

      if (!cust && trip.customerId) {
        cust = await getPartyById(trip.customerId);
        if (cust) setCustomer(cust);
      }

      if (!vend && trip.vendorId) {
        vend = await getPartyById(trip.vendorId);
        if (vend) setVendor(vend);
      }

      const effectiveCustomer: Party = cust ?? {
        id: trip.customerId,
        partyType: 'CUSTOMER',
        companyName: 'Consignor (Shipper)',
        contactPerson: 'Consignor Rep',
        phone: trip.driverPhone ?? '',
        city: trip.origin,
        state: 'India',
        isActive: true,
        isDirty: false,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
      };

      const effectiveVendor: Party = vend ?? {
        id: trip.vendorId,
        partyType: 'VENDOR',
        companyName: 'Fleet Owner / Transporter',
        contactPerson: trip.driverName ?? 'Driver',
        phone: trip.driverPhone ?? '',
        city: trip.destination,
        state: 'India',
        isActive: true,
        isDirty: false,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
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

      await shareLR(currentFirm, trip, effectiveCustomer, effectiveVendor);
    } catch (e: any) {
      console.error('[LR Share Error]', e);
      Alert.alert('Error', e?.message || 'Failed to generate or share Digital LR PDF.');
    }
  };

  // Add Partial Payment Entry
  const handleAddPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }
    if (!trip) return;

    const newPayment: PaymentEntry = {
      id: generateUUID(),
      tripId: trip.id,
      partyType: payPartyType,
      amount,
      mode: payMode,
      date: new Date().toISOString().split('T')[0],
      reference: payRef.trim() || undefined,
      notes: payNotes.trim() || undefined,
    };

    await savePaymentEntry(newPayment);

    // Recalculate trip balances
    const updatedCustBalance =
      payPartyType === 'CUSTOMER'
        ? Math.max(0, trip.customerBalance - amount)
        : trip.customerBalance;
    const updatedVendBalance =
      payPartyType === 'VENDOR'
        ? Math.max(0, trip.vendorBalance - amount)
        : trip.vendorBalance;

    const updatedTrip: Trip = {
      ...trip,
      customerBalance: updatedCustBalance,
      vendorBalance: updatedVendBalance,
    };

    await saveTrip(updatedTrip);
    setTrip(updatedTrip);
    updateTrip(trip.id, updatedTrip);
    setPayments((prev) => [...prev, newPayment]);

    setModalVisible(false);
    setPayAmount('');
    setPayRef('');
    setPayNotes('');
    Alert.alert('✅ Payment Recorded', `₹${amount.toLocaleString('en-IN')} entry saved.`);
  };

  if (loading || !trip) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.textMuted }}>Loading trip...</Text>
      </SafeAreaView>
    );
  }

  const nextStatus = TRIP_STATUS_TRANSITIONS[trip.status];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerLr}>{trip.lrNumber}</Text>
          <Text style={styles.headerDate}>{formatDate(trip.date)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: TRIP_STATUS_COLORS[trip.status] },
          ]}
        >
          <Text style={styles.statusText}>{TRIP_STATUS_LABELS[trip.status]}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Prominent WhatsApp Share Button */}
        <TouchableOpacity
          style={[styles.whatsappShareBtn, isGenerating && { opacity: 0.6 }]}
          onPress={handleShareLR}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="whatsapp" size={24} color="#fff" />
          )}
          <Text style={styles.whatsappShareText}>
            {isGenerating ? 'Generating LR PDF...' : 'Share Digital LR on WhatsApp'}
          </Text>
          <MaterialCommunityIcons name="file-pdf-box" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Status Stepper Progression Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Trip Lifecycle Status</Text>
          <View style={styles.stepperContainer}>
            {(['IN_TRANSIT', 'DELIVERED', 'POD_RECEIVED', 'BILLED', 'PAID'] as TripStatus[]).map(
              (s, idx) => {
                const statuses = ['IN_TRANSIT', 'DELIVERED', 'POD_RECEIVED', 'BILLED', 'PAID'];
                const currentIdx = statuses.indexOf(trip.status);
                const isPassed = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <View key={s} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        isPassed && { backgroundColor: TRIP_STATUS_COLORS[s] },
                        isCurrent && { borderWidth: 2, borderColor: '#fff' },
                      ]}
                    >
                      {isPassed ? (
                        <MaterialCommunityIcons name="check" size={10} color="#fff" />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.stepText,
                        isCurrent && { fontWeight: '800', color: Colors.primary },
                      ]}
                    >
                      {TRIP_STATUS_LABELS[s]}
                    </Text>
                  </View>
                );
              }
            )}
          </View>

          {nextStatus && (
            <TouchableOpacity
              style={styles.advanceStatusBtn}
              onPress={handleAdvanceStatus}
            >
              <MaterialCommunityIcons name="arrow-right-circle" size={18} color="#fff" />
              <Text style={styles.advanceStatusText}>
                Mark as {TRIP_STATUS_LABELS[nextStatus]}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Route & Cargo Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>📍 Route & Vehicle</Text>
          <View style={styles.routeBox}>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>ORIGIN</Text>
              <Text style={styles.routeVal}>{trip.origin}</Text>
            </View>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={Colors.primary}
              style={{ alignSelf: 'center' }}
            />
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>DESTINATION</Text>
              <Text style={styles.routeVal}>{trip.destination}</Text>
            </View>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.dLabel}>Truck Number</Text>
              <Text style={styles.dVal}>{trip.vehicleNumber}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.dLabel}>Driver Phone</Text>
              <TouchableOpacity
                onPress={() =>
                  trip.driverPhone ? Linking.openURL(`tel:${trip.driverPhone}`) : null
                }
              >
                <Text style={[styles.dVal, { color: Colors.primary }]}>
                  {trip.driverPhone ?? 'Not recorded'} 📞
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.detailGrid, { marginTop: 8 }]}>
            <View style={styles.detailCol}>
              <Text style={styles.dLabel}>Material</Text>
              <Text style={styles.dVal}>{trip.materialDescription}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.dLabel}>Weight / Quantity</Text>
              <Text style={styles.dVal}>
                {trip.weight ? `${trip.weight} ${trip.weightUnit}` : '-'}{' '}
                {trip.packagesCount ? `(${trip.packagesCount} pkgs)` : ''}
              </Text>
            </View>
          </View>

          {trip.ewayBillNumber ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.dLabel}>E-way Bill No.</Text>
              <Text style={styles.dVal}>{trip.ewayBillNumber}</Text>
            </View>
          ) : null}
        </View>

        {/* Parties Block */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>👥 Parties</Text>
          <View style={styles.partyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyTypeTag}>CUSTOMER (CONSIGNOR)</Text>
              <Text style={styles.partyName}>{customer?.companyName ?? 'Customer'}</Text>
              <Text style={styles.partySub}>{customer?.phone}</Text>
            </View>
            {customer?.phone && (
              <TouchableOpacity
                style={styles.partyCallBtn}
                onPress={() => Linking.openURL(`tel:${customer.phone}`)}
              >
                <MaterialCommunityIcons name="phone" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.partyRow, { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8, paddingTop: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.partyTypeTag, { color: Colors.accent }]}>
                VENDOR (FLEET OWNER)
              </Text>
              <Text style={styles.partyName}>{vendor?.companyName ?? 'Vendor'}</Text>
              <Text style={styles.partySub}>{vendor?.phone}</Text>
            </View>
            {vendor?.phone && (
              <TouchableOpacity
                style={styles.partyCallBtn}
                onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
              >
                <MaterialCommunityIcons name="phone" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Proof of Delivery (POD) Section */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>📸 Proof of Delivery (POD)</Text>
            <TouchableOpacity onPress={handleCapturePOD}>
              <Text style={styles.uploadPodLink}>
                {trip.podImageUri ? 'Change Photo' : '+ Attach POD'}
              </Text>
            </TouchableOpacity>
          </View>

          {trip.podImageUri ? (
            <View style={styles.podPreviewWrap}>
              <Image source={{ uri: trip.podImageUri }} style={styles.podImage} />
              <View style={styles.podMeta}>
                <Text style={styles.podStatusText}>
                  ✅ Signed POD Attached on{' '}
                  {trip.podUploadedAt ? formatDate(trip.podUploadedAt) : 'Recently'}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.podEmptyBox} onPress={handleCapturePOD}>
              <MaterialCommunityIcons
                name="camera-plus"
                size={32}
                color={Colors.primary}
              />
              <Text style={styles.podEmptyTitle}>Tap to capture / upload POD</Text>
              <Text style={styles.podEmptySub}>
                Upload signed lorry receipt copy after truck delivers
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Trip Profit & Payment Ledger */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>💵 Trip Financial Ledger</Text>
            <TouchableOpacity
              style={styles.addPayBtn}
              onPress={() => setModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus-circle" size={16} color={Colors.primary} />
              <Text style={styles.addPayText}>Record Payment</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ledgerGrid}>
            <View style={styles.ledgerCol}>
              <Text style={styles.lHeader}>CUSTOMER (Receivable)</Text>
              <Text style={styles.lTotal}>{formatINR(trip.customerFreight)}</Text>
              <Text style={styles.lSub}>Advance: {formatINR(trip.customerAdvance)}</Text>
              <Text style={[styles.lBal, { color: trip.customerBalance > 0 ? Colors.danger : Colors.success }]}>
                Balance: {formatINR(trip.customerBalance)}
              </Text>
            </View>

            <View style={styles.ledgerDivider} />

            <View style={styles.ledgerCol}>
              <Text style={[styles.lHeader, { color: Colors.danger }]}>
                TRUCK VENDOR (Payable)
              </Text>
              <Text style={[styles.lTotal, { color: Colors.danger }]}>
                {formatINR(trip.vendorFreight)}
              </Text>
              <Text style={styles.lSub}>Advance: {formatINR(trip.vendorAdvance)}</Text>
              <Text style={[styles.lBal, { color: trip.vendorBalance > 0 ? Colors.danger : Colors.success }]}>
                Balance: {formatINR(trip.vendorBalance)}
              </Text>
            </View>
          </View>

          <View style={styles.commissionBanner}>
            <Text style={styles.commTitle}>Net Commission (निव्वळ नफा)</Text>
            <Text
              style={[
                styles.commAmount,
                { color: trip.netCommission >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {formatINR(trip.netCommission)}
            </Text>
          </View>

          {/* Payment History Entries */}
          {payments.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.payHistTitle}>Payment Records</Text>
              {payments.map((p) => (
                <View key={p.id} style={styles.payItem}>
                  <View>
                    <Text style={styles.payParty}>
                      {p.partyType === 'CUSTOMER' ? 'From Customer' : 'To Truck Vendor'}
                    </Text>
                    <Text style={styles.payMeta}>
                      {p.mode} &nbsp;·&nbsp; {p.date}
                      {p.reference ? ` · Ref: ${p.reference}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.payAmount}>{formatINR(p.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Record Payment Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Partial Payment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.partyToggleRow}>
              {(['CUSTOMER', 'VENDOR'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.toggleBtn,
                    payPartyType === t && styles.toggleBtnActive,
                  ]}
                  onPress={() => setPayPartyType(t)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      payPartyType === t && styles.toggleTextActive,
                    ]}
                  >
                    {t === 'CUSTOMER' ? 'Customer Paid' : 'Paid to Vendor'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Amount (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              value={payAmount}
              onChangeText={setPayAmount}
              placeholder="₹ 5000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Payment Mode</Text>
            <View style={styles.modeRow}>
              {(['UPI', 'NEFT_RTGS', 'CASH', 'CHEQUE'] as PaymentMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, payMode === m && styles.modeBtnActive]}
                  onPress={() => setPayMode(m)}
                >
                  <Text
                    style={[
                      styles.modeText,
                      payMode === m && styles.modeTextActive,
                    ]}
                  >
                    {m.replace('_', '/')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reference / UTR Number</Text>
            <TextInput
              style={styles.modalInput}
              value={payRef}
              onChangeText={setPayRef}
              placeholder="e.g. UPI Ref, NEFT UTR"
              placeholderTextColor={Colors.textMuted}
            />

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={handleAddPayment}
            >
              <Text style={styles.modalSaveText}>Save Payment Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerLr: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.primary },
  headerDate: { fontSize: 10, color: Colors.textMuted },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  scroll: { padding: Spacing.md, paddingBottom: 60, gap: Spacing.md },
  whatsappShareBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
    elevation: 3,
    shadowColor: '#25D366',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  whatsappShareText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '800' },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 8, color: Colors.textMuted, textAlign: 'center' },
  advanceStatusBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  advanceStatusText: { color: '#fff', fontWeight: '800', fontSize: FontSizes.xs },
  routeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: 8,
  },
  routeItem: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  routeVal: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  detailGrid: { flexDirection: 'row', gap: Spacing.md },
  detailCol: { flex: 1 },
  dLabel: { fontSize: 10, color: Colors.textMuted },
  dVal: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  partyRow: { flexDirection: 'row', alignItems: 'center' },
  partyTypeTag: { fontSize: 9, fontWeight: '800', color: Colors.primary, marginBottom: 2 },
  partyName: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
  partySub: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  partyCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPodLink: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.primary },
  podPreviewWrap: { borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  podImage: { width: '100%', height: 220, resizeMode: 'cover' },
  podMeta: { padding: 8, backgroundColor: '#E8F5E9' },
  podStatusText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.success },
  podEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    gap: 4,
  },
  podEmptyTitle: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary },
  podEmptySub: { fontSize: 10, color: Colors.textMuted },
  addPayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPayText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary },
  ledgerGrid: { flexDirection: 'row', marginBottom: 10 },
  ledgerCol: { flex: 1 },
  ledgerDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  lHeader: { fontSize: 9, fontWeight: '800', color: Colors.primary, marginBottom: 2 },
  lTotal: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.textPrimary },
  lSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  lBal: { fontSize: FontSizes.xs, fontWeight: '800', marginTop: 4 },
  commissionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: BorderRadius.sm,
  },
  commTitle: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textPrimary },
  commAmount: { fontSize: FontSizes.md, fontWeight: '900' },
  payHistTitle: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textSecondary, marginBottom: 6 },
  payItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  payParty: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  payMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  payAmount: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.success },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary },
  partyToggleRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textSecondary },
  toggleTextActive: { color: '#fff' },
  inputLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: 10,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
  },
  modeRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeText: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary },
  modeTextActive: { color: '#fff' },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '800' },
});

