import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { getPartyById } from '../../db/repositories/partyRepository';
import { getAllTrips } from '../../db/repositories/tripRepository';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dateUtils';
import { Party } from '../../types/party.types';
import { Trip } from '../../types/trip.types';
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../../constants/tripStatus';

export default function PartyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [partyData, allTrips] = await Promise.all([
        getPartyById(id),
        getAllTrips(),
      ]);
      setParty(partyData);
      if (partyData) {
        const partyTrips = allTrips.filter((t) =>
          partyData.partyType === 'CUSTOMER'
            ? t.customerId === partyData.id
            : t.vendorId === partyData.id
        );
        setTrips(partyTrips);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !party) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const isCustomer = party.partyType === 'CUSTOMER';
  const totalBilled = trips.reduce(
    (sum, t) => sum + (isCustomer ? t.customerFreight : t.vendorFreight),
    0
  );
  const totalBalance = trips.reduce(
    (sum, t) => sum + (isCustomer ? t.customerBalance : t.vendorBalance),
    0
  );

  const callPhone = () => {
    Linking.openURL(`tel:${party.phone}`).catch(() => {});
  };

  const whatsappPhone = () => {
    const clean = party.phone.replace(/[^0-9]/g, '');
    const num = clean.startsWith('91') ? clean : `91${clean}`;
    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {party.companyName}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isCustomer ? Colors.primaryLight : '#FFF3E0' },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: isCustomer ? Colors.primary : Colors.accent },
                ]}
              >
                {party.companyName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{party.companyName}</Text>
              <Text style={styles.person}>Contact: {party.contactPerson}</Text>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: isCustomer ? Colors.primaryLight : '#E8F5E9' },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: isCustomer ? Colors.primary : Colors.success },
                  ]}
                >
                  {isCustomer ? 'Customer (Shipper)' : 'Vendor (Fleet Owner)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.callBtn} onPress={callPhone}>
              <MaterialCommunityIcons name="phone" size={18} color="#fff" />
              <Text style={styles.btnText}>Call ({party.phone})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.waBtn} onPress={whatsappPhone}>
              <MaterialCommunityIcons name="whatsapp" size={18} color="#fff" />
              <Text style={styles.btnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoGrid}>
            {party.gstin && (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>GSTIN</Text>
                <Text style={styles.infoVal}>{party.gstin}</Text>
              </View>
            )}
            {party.pan && (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>PAN</Text>
                <Text style={styles.infoVal}>{party.pan}</Text>
              </View>
            )}
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>City / State</Text>
              <Text style={styles.infoVal}>
                {party.city}, {party.state}
              </Text>
            </View>
          </View>

          {party.bankDetails && (
            <View style={styles.bankBox}>
              <Text style={styles.bankTitle}>🏦 Bank Account</Text>
              <Text style={styles.bankDetail}>
                Bank: {party.bankDetails.bankName}
              </Text>
              <Text style={styles.bankDetail}>
                A/C: {party.bankDetails.accountNumber} &nbsp;|&nbsp; IFSC: {party.bankDetails.ifscCode}
              </Text>
            </View>
          )}
        </View>

        {/* Ledger Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Trips</Text>
            <Text style={styles.statVal}>{trips.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              {isCustomer ? 'Total Billed' : 'Total Payable'}
            </Text>
            <Text style={[styles.statVal, { color: Colors.primary }]}>
              {formatINR(totalBilled)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              {isCustomer ? 'Balance Due' : 'Balance Payable'}
            </Text>
            <Text style={[styles.statVal, { color: totalBalance > 0 ? Colors.danger : Colors.success }]}>
              {formatINR(totalBalance)}
            </Text>
          </View>
        </View>

        {/* Trip History */}
        <Text style={styles.historyTitle}>Trip History ({trips.length})</Text>

        {trips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: Colors.textMuted }}>No trips recorded for this party yet.</Text>
          </View>
        ) : (
          trips.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.tripCard}
              onPress={() => router.push(`/trip/${t.id}`)}
            >
              <View style={styles.tripHeader}>
                <Text style={styles.tripLr}>{t.lrNumber}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: TRIP_STATUS_COLORS[t.status] },
                  ]}
                >
                  <Text style={styles.statusText}>{TRIP_STATUS_LABELS[t.status]}</Text>
                </View>
              </View>
              <Text style={styles.tripRoute}>
                📍 {t.origin} → {t.destination}
              </Text>
              <Text style={styles.tripVehicle}>
                🚛 {t.vehicleNumber} &nbsp;|&nbsp; 📅 {formatDate(t.date)}
              </Text>
              <View style={styles.tripAmtRow}>
                <Text style={styles.tripAmtLabel}>
                  {isCustomer ? 'Freight:' : 'Payable:'}
                </Text>
                <Text style={styles.tripAmt}>
                  {formatINR(isCustomer ? t.customerFreight : t.vendorFreight)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.primary, flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 60, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSizes.xl, fontWeight: '900' },
  name: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary },
  person: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tagText: { fontSize: 9, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  callBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  waBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  btnText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: '700' },
  infoGrid: { marginTop: Spacing.md, gap: 4 },
  infoCol: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  infoVal: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  bankBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
  },
  bankTitle: { fontSize: 10, fontWeight: '800', color: Colors.primary, marginBottom: 2 },
  bankDetail: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  statVal: { fontSize: FontSizes.sm, fontWeight: '900', color: Colors.textPrimary, marginTop: 4 },
  historyTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.textPrimary },
  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripLr: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  tripRoute: { fontSize: FontSizes.xs, color: Colors.textPrimary, fontWeight: '600', marginTop: 4 },
  tripVehicle: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  tripAmtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tripAmtLabel: { fontSize: 10, color: Colors.textMuted },
  tripAmt: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.primary },
  empty: { padding: Spacing.xl, alignItems: 'center' },
});

