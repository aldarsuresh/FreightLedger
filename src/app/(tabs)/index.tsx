import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { getDashboardSummary, getAllTrips } from '../../db/repositories/tripRepository';
import { getFirmProfile } from '../../db/repositories/firmRepository';
import { formatINR } from '../../utils/currency';
import { useTripStore } from '../../store/tripStore';
import { useFirmStore } from '../../store/firmStore';
import { getOverdueTrips } from '../../utils/podAlertUtils';
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../../constants/tripStatus';
import { formatDate } from '../../utils/dateUtils';

interface SummaryData {
  totalReceivable: number;
  totalPayable: number;
  netCommission: number;
  pendingPODCount: number;
}

export default function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<SummaryData>({
    totalReceivable: 0,
    totalPayable: 0,
    netCommission: 0,
    pendingPODCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const { trips, setTrips } = useTripStore();
  const { firm, setFirm } = useFirmStore();

  const overdueTrips = getOverdueTrips(trips);
  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const loadData = useCallback(async () => {
    try {
      const [s, firmData, allTrips] = await Promise.all([
        getDashboardSummary(),
        getFirmProfile(),
        getAllTrips(),
      ]);
      setSummary(s);
      setTrips(allTrips);
      if (firmData) setFirm(firmData);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    }
  }, [setTrips, setFirm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const cards = [
    {
      label: t('dashboard.totalReceivable', 'Total Receivable'),
      subLabel: i18n.language === 'mr' ? 'येणे बाकी' : i18n.language === 'hi' ? 'कुल प्राप्य' : 'Receivable',
      value: summary.totalReceivable,
      icon: 'arrow-down-circle',
      color: Colors.primary,
      bg: Colors.primaryLight,
    },
    {
      label: t('dashboard.totalPayable', 'Total Payable'),
      subLabel: i18n.language === 'mr' ? 'देणे बाकी' : i18n.language === 'hi' ? 'कुल देय' : 'Payable',
      value: summary.totalPayable,
      icon: 'arrow-up-circle',
      color: Colors.danger,
      bg: '#FFEBEE',
    },
    {
      label: t('dashboard.netCommission', 'Net Commission'),
      subLabel: i18n.language === 'mr' ? 'निव्वळ नफा' : i18n.language === 'hi' ? 'शुद्ध लाभ' : 'Net Profit',
      value: summary.netCommission,
      icon: 'cash-multiple',
      color: Colors.success,
      bg: '#E8F5E9',
    },
    {
      label: t('dashboard.pendingPOD', 'Pending POD'),
      subLabel: i18n.language === 'mr' ? 'प्रलंबित POD' : i18n.language === 'hi' ? 'लंबित POD' : 'Waiting POD',
      value: summary.pendingPODCount,
      icon: 'file-clock',
      color: Colors.warning,
      bg: '#FFF8E1',
      isCount: true,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>FreightLedger 🚛</Text>
          <Text style={styles.firmName} numberOfLines={1}>
            {firm ? firm.firmName : 'Setup Broker Profile'}
          </Text>
        </View>

        {/* Language Switcher */}
        <View style={styles.langSwitch}>
          {(['en', 'mr', 'hi'] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langBtn, i18n.language === lang && styles.langBtnActive]}
              onPress={() => changeLanguage(lang)}
            >
              <Text
                style={[
                  styles.langBtnText,
                  i18n.language === lang && styles.langBtnTextActive,
                ]}
              >
                {lang === 'en' ? 'EN' : lang === 'mr' ? 'मरा' : 'हिं'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/onboarding')}
          style={styles.settingsBtn}
        >
          <MaterialCommunityIcons name="cog" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Metric Cards Grid */}
        <View style={styles.cardsGrid}>
          {cards.map((card) => (
            <View key={card.label} style={[styles.card, { backgroundColor: card.bg }]}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name={card.icon as any} size={24} color={card.color} />
                <Text style={styles.cardSubLabel}>{card.subLabel}</Text>
              </View>
              <Text style={styles.cardValue}>
                {card.isCount ? String(card.value) : formatINR(card.value)}
              </Text>
              <Text style={styles.cardLabel} numberOfLines={1}>
                {card.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 3-day POD Overdue Banner */}
        {overdueTrips.length > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => router.push('/(tabs)/trips')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="alert-circle" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>
                🚨 {overdueTrips.length} Trip{overdueTrips.length > 1 ? 's' : ''} Delayed POD (&gt;3 Days)
              </Text>
              <Text style={styles.alertSub}>Tap to view and collect proof of delivery</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.qaBtn}
            onPress={() => router.push('/trip/create')}
          >
            <View style={[styles.qaIconWrap, { backgroundColor: Colors.primaryLight }]}>
              <MaterialCommunityIcons name="truck-plus" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.qaLabel}>New LR / Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.qaBtn}
            onPress={() => router.push('/party/create')}
          >
            <View style={[styles.qaIconWrap, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="account-plus" size={24} color={Colors.accent} />
            </View>
            <Text style={styles.qaLabel}>Add Party</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.qaBtn}
            onPress={() => router.push('/invoice/create')}
          >
            <View style={[styles.qaIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="file-percent" size={24} color={Colors.success} />
            </View>
            <Text style={styles.qaLabel}>GST Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Trips */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {recentTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="truck-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No trips created yet</Text>
            <Text style={styles.emptySub}>Create your first digital Lorry Receipt</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/trip/create')}
            >
              <Text style={styles.emptyBtnText}>+ Create Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripRow}
              onPress={() => router.push(`/trip/${trip.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.tripLeft}>
                <View style={styles.tripLrBadge}>
                  <Text style={styles.tripLR}>{trip.lrNumber}</Text>
                  <Text style={styles.tripDate}>{formatDate(trip.date)}</Text>
                </View>
                <Text style={styles.tripRoute}>
                  📍 {trip.origin} → {trip.destination}
                </Text>
                <Text style={styles.tripVehicle}>🚛 {trip.vehicleNumber}</Text>
              </View>

              <View style={styles.tripRight}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: TRIP_STATUS_COLORS[trip.status] },
                  ]}
                >
                  <Text style={styles.statusText}>{TRIP_STATUS_LABELS[trip.status]}</Text>
                </View>
                <Text style={styles.commissionLabel}>Commission</Text>
                <Text style={styles.tripAmount}>{formatINR(trip.netCommission)}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '600' },
  firmName: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.primary },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    padding: 2,
    marginRight: Spacing.sm,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  langBtnActive: { backgroundColor: Colors.primary },
  langBtnText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  langBtnTextActive: { color: '#fff' },
  settingsBtn: { padding: 4 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  card: {
    width: '48%',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSubLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
  cardValue: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.textPrimary, marginTop: 4 },
  cardLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '600' },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  alertTitle: { color: '#fff', fontWeight: '800', fontSize: FontSizes.sm },
  alertSub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.xs, marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary },
  viewAllText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary },
  quickActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  qaBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qaIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  tripRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripLeft: { flex: 1 },
  tripLrBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  tripLR: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  tripDate: { fontSize: 10, color: Colors.textMuted },
  tripRoute: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: '600', marginTop: 2 },
  tripVehicle: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  tripRight: { alignItems: 'flex-end' },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  commissionLabel: { fontSize: 9, color: Colors.textMuted },
  tripAmount: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.success },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: FontSizes.xs, color: Colors.textMuted },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    marginTop: Spacing.sm,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSizes.sm },
});

