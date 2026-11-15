import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { generateUUID } from '../utils/uuid';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { useFirmStore } from '../store/firmStore';
import { getFirmProfile, saveFirmProfile } from '../db/repositories/firmRepository';
import { FirmProfile } from '../types/firm.types';
import { toISO } from '../utils/dateUtils';

export default function OnboardingScreen() {
  const { firm, setFirm } = useFirmStore();
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({
    firmName: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    lrPrefix: 'FL-2026-',
    bankAccount: '',
    bankIfsc: '',
    bankName: '',
    bankBranch: '',
  });

  useEffect(() => {
    getFirmProfile().then((f) => {
      if (f) {
        setExistingId(f.id);
        setLogoUri(f.logoUri);
        setForm({
          firmName: f.firmName,
          gstin: f.gstin,
          pan: f.pan,
          address: f.address,
          city: f.city,
          state: f.state,
          pincode: f.pincode,
          phone: f.phone,
          email: f.email ?? '',
          lrPrefix: f.lrPrefix,
          bankAccount: f.bankDetails.accountNumber,
          bankIfsc: f.bankDetails.ifscCode,
          bankName: f.bankDetails.bankName,
          bankBranch: f.bankDetails.branchName ?? '',
        });
      }
    });
  }, []);

  const setField = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Permission to access photos is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!form.firmName.trim() || !form.phone.trim()) {
      Alert.alert('Required Fields', 'Firm Name and Phone Number are required.');
      return;
    }

    setLoading(true);
    try {
      const now = toISO();
      const firmProfile: FirmProfile = {
        id: existingId ?? generateUUID(),
        firmName: form.firmName.trim(),
        gstin: form.gstin.trim().toUpperCase() || 'UNREGISTERED',
        pan: form.pan.trim().toUpperCase() || 'N/A',
        address: form.address.trim(),
        city: form.city.trim() || 'Mumbai',
        state: form.state.trim() || 'Maharashtra',
        pincode: form.pincode.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        lrPrefix: form.lrPrefix.trim() || 'FL-2026-',
        currentLrSequence: firm?.currentLrSequence ?? 1,
        logoUri,
        bankDetails: {
          accountNumber: form.bankAccount.trim(),
          ifscCode: form.bankIfsc.trim().toUpperCase(),
          bankName: form.bankName.trim() || 'State Bank of India',
          branchName: form.bankBranch.trim() || undefined,
        },
        createdAt: firm?.createdAt ?? now,
        updatedAt: now,
      };

      await saveFirmProfile(firmProfile);
      setFirm(firmProfile);

      Alert.alert(
        '✅ Profile Saved!',
        'Your broker firm profile and LR template settings have been configured.',
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save firm profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Broker Firm Setup</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo Picker Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Firm Logo (for LR & Invoices)</Text>
            <View style={styles.logoRow}>
              <TouchableOpacity style={styles.logoWrap} onPress={pickLogo}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImg} />
                ) : (
                  <MaterialCommunityIcons name="camera-plus" size={28} color={Colors.primary} />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.logoTitle}>Official Stamp / Logo</Text>
                <Text style={styles.logoSub}>
                  Will appear on top of all generated Lorry Receipts and GST Tax Invoices.
                </Text>
                <TouchableOpacity onPress={pickLogo} style={{ marginTop: 4 }}>
                  <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 12 }}>
                    {logoUri ? 'Change Logo' : '+ Upload Logo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Firm Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Information</Text>

            <Text style={styles.label}>Firm / Agency Name *</Text>
            <TextInput
              style={styles.input}
              value={form.firmName}
              onChangeText={(v) => setField('firmName', v)}
              placeholder="e.g. All-India Freight Services"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>GSTIN</Text>
                <TextInput
                  style={styles.input}
                  value={form.gstin}
                  onChangeText={(v) => setField('gstin', v.toUpperCase())}
                  placeholder="27AAAAA0000A1Z5"
                  autoCapitalize="characters"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PAN</Text>
                <TextInput
                  style={styles.input}
                  value={form.pan}
                  onChangeText={(v) => setField('pan', v.toUpperCase())}
                  placeholder="AAAAA0000A"
                  autoCapitalize="characters"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(v) => setField('phone', v)}
                  placeholder="9876543210"
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={(v) => setField('email', v)}
                  placeholder="broker@example.com"
                  keyboardType="email-address"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.label}>LR Prefix (for auto-incrementing numbers)</Text>
            <TextInput
              style={styles.input}
              value={form.lrPrefix}
              onChangeText={(v) => setField('lrPrefix', v)}
              placeholder="e.g. AFS-2026-"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Address */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Registered Office Address</Text>

            <Text style={styles.label}>Address Line</Text>
            <TextInput
              style={styles.input}
              value={form.address}
              onChangeText={(v) => setField('address', v)}
              placeholder="Shop/Office No, Transport Nagar"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={form.city}
                  onChangeText={(v) => setField('city', v)}
                  placeholder="Mumbai"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={form.state}
                  onChangeText={(v) => setField('state', v)}
                  placeholder="Maharashtra"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  value={form.pincode}
                  onChangeText={(v) => setField('pincode', v)}
                  placeholder="400001"
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Bank Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              🏦 Bank Account (Printed on Invoices for Customer Payment)
            </Text>

            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={form.bankName}
              onChangeText={(v) => setField('bankName', v)}
              placeholder="e.g. HDFC Bank Ltd"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.row}>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.label}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  value={form.bankAccount}
                  onChangeText={(v) => setField('bankAccount', v)}
                  placeholder="Account Number"
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput
                  style={styles.input}
                  value={form.bankIfsc}
                  onChangeText={(v) => setField('bankIfsc', v.toUpperCase())}
                  placeholder="HDFC0001234"
                  autoCapitalize="characters"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <MaterialCommunityIcons name="content-save-check" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>
              {loading ? 'Saving Profile...' : 'Save & Update Profile'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
  scroll: { padding: Spacing.md, paddingBottom: 60, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  logoTitle: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  logoSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  label: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '800' },
});

