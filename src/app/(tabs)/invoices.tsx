import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useInvoiceStore } from '../../store/invoiceStore';
import { getAllInvoices } from '../../db/repositories/invoiceRepository';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dateUtils';
import { Invoice } from '../../types/invoice.types';
import { GST_MODE_LABELS } from '../../constants/gstRates';

export default function InvoicesScreen() {
  const { t } = useTranslation();
  const { invoices, setInvoices } = useInvoiceStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getAllInvoices();
    setInvoices(data);
  }, [setInvoices]);

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

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/invoice/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.invLeftHeader}>
          <Text style={styles.invNumber}>{item.invoiceNumber}</Text>
          <Text style={styles.date}>📅 {formatDate(item.invoiceDate)}</Text>
        </View>
        <View
          style={[
            styles.paidBadge,
            { backgroundColor: item.isPaid ? Colors.success : Colors.warning },
          ]}
        >
          <Text style={styles.paidText}>{item.isPaid ? 'PAID' : 'PAYMENT DUE'}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.trips}>
          📑 {item.tripIds.length} Linked Trip{item.tripIds.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.gstBadge}>
          <Text style={styles.gstText}>{GST_MODE_LABELS[item.gstMode]}</Text>
        </View>
      </View>

      <View style={styles.amtRow}>
        <View>
          <Text style={styles.subtotalLabel}>Subtotal: {formatINR(item.subtotal)}</Text>
          {item.totalGST > 0 ? (
            <Text style={styles.gstDetailLabel}>GST: {formatINR(item.totalGST)}</Text>
          ) : (
            <Text style={styles.gstDetailLabel}>GST: RCM (0%)</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amtLabel}>Grand Total</Text>
          <Text style={styles.amtValue}>{formatINR(item.grandTotal)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('invoices.title', 'GST Invoices')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/invoice/create')}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>New Invoice</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
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
              name="file-document-outline"
              size={52}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>No GST tax invoices yet</Text>
            <Text style={styles.emptySub}>
              Select completed trips to auto-generate a GST invoice PDF
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/invoice/create')}
            >
              <Text style={styles.emptyBtnText}>+ Create GST Invoice</Text>
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
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  invLeftHeader: { gap: 2 },
  invNumber: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.primary },
  date: { fontSize: 10, color: Colors.textMuted },
  paidBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  paidText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  trips: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '600' },
  gstBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gstText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  amtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: Spacing.sm,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  subtotalLabel: { fontSize: 10, color: Colors.textSecondary },
  gstDetailLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  amtLabel: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase' },
  amtValue: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: Spacing.xl },
  emptyText: { fontSize: FontSizes.md, color: Colors.textPrimary, fontWeight: '700' },
  emptySub: { fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    marginTop: 6,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});

