import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { usePartyStore } from '../../store/partyStore';
import { getAllParties } from '../../db/repositories/partyRepository';
import { Party } from '../../types/party.types';

export default function PartiesScreen() {
  const { t } = useTranslation();
  const { parties, setParties } = usePartyStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CUSTOMER' | 'VENDOR'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllParties();
      setParties(data);
    } catch (e) {
      console.error('Failed to load parties:', e);
    }
  }, [setParties]);

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

  const filtered = parties.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (p.companyName && p.companyName.toLowerCase().includes(q)) ||
      (p.contactPerson && p.contactPerson.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q));

    const matchFilter = filter === 'ALL' || p.partyType === filter;
    return Boolean(matchSearch && matchFilter && p.isActive);
  });

  const callParty = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const whatsappParty = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const num = clean.startsWith('91') ? clean : `91${clean}`;
    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
  };

  const renderParty = ({ item }: { item: Party }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/party/${item.id}`)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor:
              item.partyType === 'CUSTOMER' ? Colors.primaryLight : '#FFF3E0',
          },
        ]}
      >
        <Text
          style={[
            styles.avatarText,
            { color: item.partyType === 'CUSTOMER' ? Colors.primary : Colors.accent },
          ]}
        >
          {item.companyName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.companyName}
          </Text>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  item.partyType === 'CUSTOMER' ? Colors.primaryLight : '#E8F5E9',
              },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                {
                  color:
                    item.partyType === 'CUSTOMER' ? Colors.primary : Colors.success,
                },
              ]}
            >
              {item.partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'}
            </Text>
          </View>
        </View>

        <Text style={styles.sub}>
          👤 {item.contactPerson} &nbsp;|&nbsp; 📍 {item.city}, {item.state}
        </Text>
        {item.gstin ? (
          <Text style={styles.gstin}>GSTIN: {item.gstin}</Text>
        ) : null}
      </View>

      {/* Quick Call & WhatsApp Action Buttons */}
      <View style={styles.actionBtns}>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => callParty(item.phone)}
        >
          <MaterialCommunityIcons name="phone" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#E8F5E9' }]}
          onPress={() => whatsappParty(item.phone)}
        >
          <MaterialCommunityIcons name="whatsapp" size={18} color={Colors.success} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('parties.title', 'Party Directory')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/party/create')}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Party</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search party name, contact, city, phone..."
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

      <View style={styles.filterRow}>
        {(['ALL', 'CUSTOMER', 'VENDOR'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'ALL'
                ? 'All Parties'
                : f === 'CUSTOMER'
                ? '🏭 Customers (Shippers)'
                : '🚛 Vendors (Fleet)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderParty}
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
            <MaterialCommunityIcons
              name="account-group-outline"
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>No parties found</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/party/create')}
            >
              <Text style={styles.emptyBtnText}>+ Add First Party</Text>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSizes.lg, fontWeight: '900' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full },
  typeText: { fontSize: 9, fontWeight: '700' },
  sub: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  gstin: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  actionBtns: { flexDirection: 'row', gap: 6 },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textMuted },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});

