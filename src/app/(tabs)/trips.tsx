import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useTripStore } from '../../store/tripStore';
import { getAllTrips } from '../../db/repositories/tripRepository';
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS, TripStatus } from '../../constants/tripStatus';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dateUtils';
import { isPODOverdue } from '../../utils/podAlertUtils';
import { Trip } from '../../types/trip.types';

const STATUS_FILTERS: Array<TripStatus | 'ALL'> = [
  'ALL',
  'IN_TRANSIT',
  'DELIVERED',
  'POD_RECEIVED',
  'BILLED',
  'PAID',
];

export default function TripsScreen() {
  const { t } = useTranslation();
  const { trips, setTrips } = useTripStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'ALL'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getAllTrips();
    setTrips(data);
  }, [setTrips]);

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

  const filtered = trips.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      item.lrNumber.toLowerCase().includes(q) ||
      item.origin.toLowerCase().includes(q) ||
      item.destination.toLowerCase().includes(q) ||
      item.vehicleNumber.toLowerCase().includes(q) ||
      item.materialDescription.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const renderTrip = ({ item }: { item: Trip }) => {
    const overdue = isPODOverdue(item);
    return (
      <TouchableOpacity
        style={[styles.card, overdue && styles.cardOverdue]}
        onPress={() => router.push(`/trip/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={styles.lrRow}>
            {overdue && (
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={Colors.danger}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={styles.lrNumber}>{item.lrNumber}</Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: TRIP_STATUS_COLORS[item.status] },
            ]}
          >
            <Text style={styles.badgeText}>{TRIP_STATUS_LABELS[item.status]}</Text>
          </View>
        </View>

        <Text style={styles.route}>
          📍 {item.origin} → {item.destination}
        </Text>
        <Text style={styles.vehicle}>
          🚛 {item.vehicleNumber} &nbsp;|&nbsp; 📦 {item.materialDescription} &nbsp;|&nbsp; 📅 {formatDate(item.date)}
        </Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amtLabel}>Customer ₹</Text>
            <Text style={styles.amtValue}>{formatINR(item.customerFreight)}</Text>
          </View>
          <View>
            <Text style={styles.amtLabel}>Truck ₹</Text>
            <Text style={[styles.amtValue, { color: Colors.danger }]}>
              {formatINR(item.vendorFreight)}
            </Text>
          </View>
          <View>
            <Text style={styles.amtLabel}>Commission</Text>
            <Text style={[styles.amtValue, { color: Colors.success }]}>
              {formatINR(item.netCommission)}
            </Text>
          </View>
        </View>

        {overdue && (
          <View style={styles.overdueBanner}>
            <MaterialCommunityIcons name="clock-alert-outline" size={14} color={Colors.danger} />
            <Text style={styles.overdueText}>
              Delivered &gt;3 days ago · POD Pending upload
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('trips.title', 'Trips & Bilty')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/trip/create')}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>New Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search LR#, vehicle, route, cargo..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={Colors.textMuted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScroll}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text
              style={[styles.filterText, statusFilter === s && styles.filterTextActive]}
            >
              {s === 'ALL' ? 'All' : TRIP_STATUS_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="truck-alert" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {search ? 'No matching trips found' : t('trips.noTrips', 'No trips yet')}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/trip/create')}
            >
              <Text style={styles.emptyBtnText}>+ Create First Trip</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSizes.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: FontSizes.sm, color: Colors.textPrimary },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardOverdue: { borderColor: Colors.danger, borderWidth: 1.5 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lrRow: { flexDirection: 'row', alignItems: 'center' },
  lrNumber: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.primary },
  badge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  route: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  vehicle: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginBottom: Spacing.sm },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  amtLabel: { fontSize: 10, color: Colors.textMuted },
  amtValue: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FFEBEE',
  },
  overdueText: { fontSize: FontSizes.xs, color: Colors.danger, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textMuted, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
