import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { usePartyStore } from '../../store/partyStore';
import { saveParty, getAllParties } from '../../db/repositories/partyRepository';
import { Party, PartyType } from '../../types/party.types';
import { toISO } from '../../utils/dateUtils';
import { generateUUID } from '../../utils/uuid';

export default function CreatePartyScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType: PartyType =
    params.type?.toUpperCase() === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';

  const { addParty, setParties } = usePartyStore();
  const [partyType, setPartyType] = useState<PartyType>(initialType);
  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    alternatePh: '',
    gstin: '',
    pan: '',
    city: '',
    state: '',
    address: '',
    bankAccount: '',
    bankIfsc: '',
    bankName: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const setField = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!form.companyName.trim()) {
      Alert.alert('Required Field', 'Please enter Company / Business Name.');
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert('Required Field', 'Please enter Mobile / Phone Number.');
      return;
    }

    setLoading(true);
    try {
      const now = toISO();
      const partyId = generateUUID();

      const newParty: Party = {
        id: partyId,
        partyType,
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim() || form.companyName.trim(),
        phone: form.phone.trim(),
        alternatePh: form.alternatePh.trim() || undefined,
        gstin: form.gstin.trim().toUpperCase() || undefined,
        pan: form.pan.trim().toUpperCase() || undefined,
        city: form.city.trim() || 'Local',
        state: form.state.trim() || 'State',
        address: form.address.trim() || undefined,
        bankDetails: form.bankName.trim()
          ? {
              accountNumber: form.bankAccount.trim(),
              ifscCode: form.bankIfsc.trim().toUpperCase(),
              bankName: form.bankName.trim(),
            }
          : undefined,
        notes: form.notes.trim() || undefined,
        isActive: true,
        isDirty: true,
        createdAt: now,
        updatedAt: now,
      };

      // 1. Save to SQLite database
      await saveParty(newParty);

      // 2. Update Zustand store immediately
      addParty(newParty);

      // 3. Re-sync store from SQLite to ensure consistency
      const allParties = await getAllParties();
      setParties(allParties);

      Alert.alert(
        '✅ Success',
        `${newParty.companyName} (${partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'}) added successfully!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e: any) {
      console.error('Error saving party:', e);
      Alert.alert('Save Failed', e?.message || 'Could not save party. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Add {partyType === 'CUSTOMER' ? 'Customer (Shipper)' : 'Vendor (Fleet)'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Keyboard Avoiding Container */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={false}
          >
            {/* Party Type Switcher */}
            <View style={styles.typeRow}>
              {(['CUSTOMER', 'VENDOR'] as PartyType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, partyType === t && styles.typeBtnActive]}
                  onPress={() => setPartyType(t)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={t === 'CUSTOMER' ? 'factory' : 'truck-fast'}
                    size={20}
                    color={partyType === t ? '#fff' : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      partyType === t && { color: '#fff' },
                    ]}
                  >
                    {t === 'CUSTOMER' ? 'Customer (Shipper)' : 'Vendor (Fleet Owner)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Basic Information Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <Text style={styles.label}>Company / Business Name *</Text>
              <TextInput
                style={styles.input}
                value={form.companyName}
                onChangeText={(v) => setField('companyName', v)}
                placeholder="e.g. Tata Steel Ltd / Om Logistics"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Contact Person</Text>
                  <TextInput
                    style={styles.input}
                    value={form.contactPerson}
                    onChangeText={(v) => setField('contactPerson', v)}
                    placeholder="Manager / Broker"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={(v) => setField('phone', v)}
                    placeholder="9876543210"
                    keyboardType="phone-pad"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>GSTIN (15 Digits)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.gstin}
                    onChangeText={(v) => setField('gstin', v.toUpperCase())}
                    placeholder="27AAAAA0000A1Z5"
                    autoCapitalize="characters"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>PAN Number</Text>
                  <TextInput
                    style={styles.input}
                    value={form.pan}
                    onChangeText={(v) => setField('pan', v.toUpperCase())}
                    placeholder="AAAAA0000A"
                    autoCapitalize="characters"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={form.city}
                    onChangeText={(v) => setField('city', v)}
                    placeholder="e.g. Mumbai"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={form.state}
                    onChangeText={(v) => setField('state', v)}
                    placeholder="e.g. Maharashtra"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <Text style={styles.label}>Full Office Address</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={form.address}
                onChangeText={(v) => setField('address', v)}
                placeholder="Plot/Gala No, Industrial Estate, etc."
                multiline
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Bank Details Card (Bottom Fields) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                🏦 Bank Details {partyType === 'VENDOR' ? '(for freight payout)' : '(optional)'}
              </Text>

              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={form.bankName}
                onChangeText={(v) => setField('bankName', v)}
                placeholder="e.g. State Bank of India"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />

              <View style={styles.row}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.label}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={form.bankAccount}
                    onChangeText={(v) => setField('bankAccount', v)}
                    placeholder="Account No"
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>IFSC Code</Text>
                  <TextInput
                    style={styles.input}
                    value={form.bankIfsc}
                    onChangeText={(v) => setField('bankIfsc', v.toUpperCase())}
                    placeholder="SBIN0001234"
                    autoCapitalize="characters"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>

            {/* Save / Submit Button */}
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {loading ? 'Saving...' : 'Save Party to Directory'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.primary },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 180, // Generous bottom padding to ensure lowest fields & submit button sit above keyboard
    gap: Spacing.md,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  typeBtnActive: { backgroundColor: Colors.primary },
  typeBtnText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.primary },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  saveBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '800' },
});
