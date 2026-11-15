import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { generateUUID } from '../../utils/uuid';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useFirmStore } from '../../store/firmStore';
import { usePartyStore } from '../../store/partyStore';
import { useTripStore } from '../../store/tripStore';
import { saveTrip } from '../../db/repositories/tripRepository';
import { getFirmProfile, incrementLRSequence } from '../../db/repositories/firmRepository';
import { getAllParties } from '../../db/repositories/partyRepository';
import { generateLRNumber } from '../../utils/lrNumber';
import { formatVehicleNumber, validateVehicleNumber } from '../../utils/vehicleValidation';
import { toISO } from '../../utils/dateUtils';
import { formatINR } from '../../utils/currency';
import { Trip, WeightUnit, InsuranceRisk } from '../../types/trip.types';

type Step = 1 | 2 | 3;

interface FormData {
  date: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  origin: string;
  destination: string;
  materialDescription: string;
  packagesCount: string;
  weight: string;
  weightUnit: WeightUnit;
  ewayBillNumber: string;
  insuranceRisk: InsuranceRisk;
  customerFreight: string;
  vendorFreight: string;
  customerAdvance: string;
  vendorAdvance: string;
}

const initialForm: FormData = {
  date: new Date().toISOString().split('T')[0],
  customerId: '',
  customerName: '',
  vendorId: '',
  vendorName: '',
  vehicleNumber: '',
  driverName: '',
  driverPhone: '',
  origin: '',
  destination: '',
  materialDescription: '',
  packagesCount: '',
  weight: '',
  weightUnit: 'MT',
  ewayBillNumber: '',
  insuranceRisk: "OWNER'S_RISK",
  customerFreight: '',
  vendorFreight: '',
  customerAdvance: '0',
  vendorAdvance: '0',
};

function PartySelector({
  label,
  partyType,
  selectedId,
  selectedName,
  onSelect,
}: {
  label: string;
  partyType: 'CUSTOMER' | 'VENDOR';
  selectedId: string;
  selectedName: string;
  onSelect: (id: string, name: string) => void;
}) {
  const { parties, setParties } = usePartyStore();
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);

  const refreshParties = useCallback(() => {
    getAllParties().then(setParties);
  }, [setParties]);

  useEffect(() => {
    refreshParties();
  }, [refreshParties]);

  const filtered = parties.filter(
    (p) =>
      p.partyType === partyType &&
      p.isActive &&
      (!search ||
        (p.companyName && p.companyName.toLowerCase().includes(search.toLowerCase())) ||
        (p.city && p.city.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <View style={psStyles.container}>
      <Text style={psStyles.label}>{label} *</Text>
      {selectedId ? (
        <TouchableOpacity
          style={psStyles.selected}
          onPress={() => {
            refreshParties();
            setShowList(true);
            setSearch('');
          }}
        >
          <View>
            <Text style={psStyles.selectedText}>{selectedName}</Text>
            <Text style={psStyles.selectedHint}>Tap to change</Text>
          </View>
          <MaterialCommunityIcons name="pencil" size={18} color={Colors.primary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={psStyles.placeholder}
          onPress={() => {
            refreshParties();
            setShowList(true);
          }}
        >
          <MaterialCommunityIcons
            name="account-search"
            size={20}
            color={Colors.textMuted}
          />
          <Text style={psStyles.placeholderText}>
            Select {partyType === 'CUSTOMER' ? 'Customer (Shipper)' : 'Vendor (Fleet Owner)'}...
          </Text>
        </TouchableOpacity>
      )}

      {showList && (
        <View style={psStyles.dropdown}>
          <View style={psStyles.dropdownHeader}>
            <Text style={psStyles.dropdownTitle}>
              Select {partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'}
            </Text>
            <TouchableOpacity onPress={() => setShowList(false)}>
              <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={psStyles.searchInput}
            placeholder="Type to search company or city..."
            value={search}
            onChangeText={setSearch}
            autoFocus
            placeholderTextColor={Colors.textMuted}
          />
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {filtered.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={psStyles.item}
                onPress={() => {
                  onSelect(p.id, p.companyName);
                  setShowList(false);
                  setSearch('');
                }}
              >
                <Text style={psStyles.itemName}>{p.companyName}</Text>
                <Text style={psStyles.itemSub}>
                  📍 {p.city}, {p.state} &nbsp;|&nbsp; 📞 {p.phone}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={psStyles.addNewRow}
              onPress={() => {
                setShowList(false);
                router.push(`/party/create?type=${partyType}`);
              }}
            >
              <MaterialCommunityIcons name="plus-circle" size={18} color={Colors.primary} />
              <Text style={psStyles.addNewText}>
                + Add New {partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const psStyles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  selected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  selectedText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  selectedHint: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: { fontSize: FontSizes.sm, color: Colors.textMuted },
  dropdown: {
    marginTop: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  dropdownTitle: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textSecondary },
  searchInput: {
    padding: Spacing.sm,
    marginHorizontal: Spacing.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
  itemSub: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addNewText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '800' },
});

export default function CreateTripScreen() {
  const { firm, setFirm } = useFirmStore();
  const { addTrip } = useTripStore();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState('');

  useEffect(() => {
    getFirmProfile().then((f) => {
      if (f) setFirm(f);
    });
  }, [setFirm]);

  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const customerFreight = parseFloat(form.customerFreight) || 0;
  const vendorFreight = parseFloat(form.vendorFreight) || 0;
  const customerAdvance = parseFloat(form.customerAdvance) || 0;
  const vendorAdvance = parseFloat(form.vendorAdvance) || 0;
  const netCommission = customerFreight - vendorFreight;
  const customerBalance = customerFreight - customerAdvance;
  const vendorBalance = vendorFreight - vendorAdvance;

  const validateStep1 = () => {
    if (!form.customerId) {
      Alert.alert('Missing Field', 'Please select a Customer (Consignor)');
      return false;
    }
    if (!form.vendorId) {
      Alert.alert('Missing Field', 'Please select a Vendor (Fleet Owner)');
      return false;
    }
    if (!form.origin.trim()) {
      Alert.alert('Missing Field', 'Please enter origin city');
      return false;
    }
    if (!form.destination.trim()) {
      Alert.alert('Missing Field', 'Please enter destination city');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.vehicleNumber.trim()) {
      Alert.alert('Missing Field', 'Vehicle number is required');
      return false;
    }
    if (!validateVehicleNumber(form.vehicleNumber)) {
      setVehicleError('Invalid vehicle number format (e.g. MH12AB1234)');
      return false;
    }
    if (!form.materialDescription.trim()) {
      Alert.alert('Missing Field', 'Please enter material / cargo description');
      return false;
    }
    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateStep2()) return;
    if (customerFreight <= 0) {
      Alert.alert('Invalid Amount', 'Customer freight must be greater than ₹0');
      return;
    }
    if (vendorFreight <= 0) {
      Alert.alert('Invalid Amount', 'Vendor freight must be greater than ₹0');
      return;
    }

    setLoading(true);
    try {
      let currentFirm = firm;
      if (!currentFirm) {
        currentFirm = await getFirmProfile();
      }

      const lrPrefix = currentFirm ? currentFirm.lrPrefix : 'FL-2026-';
      const seq = await incrementLRSequence();
      const lrNumber = generateLRNumber(lrPrefix, seq);
      const now = toISO();

      const newTrip: Trip = {
        id: generateUUID(),
        lrNumber,
        date: form.date,
        customerId: form.customerId,
        vendorId: form.vendorId,
        vehicleNumber: formatVehicleNumber(form.vehicleNumber),
        driverName: form.driverName.trim() || undefined,
        driverPhone: form.driverPhone.trim() || undefined,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        materialDescription: form.materialDescription.trim(),
        packagesCount: form.packagesCount ? parseInt(form.packagesCount, 10) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        weightUnit: form.weightUnit,
        ewayBillNumber: form.ewayBillNumber.trim() || undefined,
        insuranceRisk: form.insuranceRisk,
        customerFreight,
        vendorFreight,
        netCommission,
        customerAdvance,
        customerBalance,
        vendorAdvance,
        vendorBalance,
        paymentEntries: [],
        status: 'IN_TRANSIT',
        isDirty: true,
        createdAt: now,
        updatedAt: now,
      };

      await saveTrip(newTrip);
      addTrip(newTrip);

      Alert.alert(
        '🎉 Digital LR Generated!',
        `LR Number: ${lrNumber}\nNet Commission: ${formatINR(netCommission)}`,
        [
          {
            text: 'View Trip & Share LR',
            onPress: () => {
              router.replace(`/trip/${newTrip.id}`);
            },
          },
          {
            text: 'Create Another',
            onPress: () => {
              setForm(initialForm);
              setStep(1);
            },
            style: 'cancel',
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save trip');
    } finally {
      setLoading(false);
    }
  }, [
    form,
    firm,
    addTrip,
    customerFreight,
    vendorFreight,
    netCommission,
    customerAdvance,
    customerBalance,
    vendorAdvance,
    vendorBalance,
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step > 1) setStep((s) => (s - 1) as Step);
            else router.back();
          }}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Create Digital LR — Step {step} of 3
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Stepper Progress Indicator */}
      <View style={styles.stepperWrap}>
        {[
          { num: 1, title: 'Route & Parties' },
          { num: 2, title: 'Vehicle & Cargo' },
          { num: 3, title: 'Freight Ledger' },
        ].map((s) => (
          <View key={s.num} style={styles.stepIndicator}>
            <View
              style={[
                styles.stepCircle,
                s.num === step && styles.stepCircleActive,
                s.num < step && styles.stepCircleDone,
              ]}
            >
              {s.num < step ? (
                <MaterialCommunityIcons name="check" size={14} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepNumText,
                    s.num === step && styles.stepNumTextActive,
                  ]}
                >
                  {s.num}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                s.num === step && styles.stepLabelActive,
              ]}
            >
              {s.title}
            </Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: PARTIES & ROUTE */}
          {step === 1 && (
            <View>
              <Text style={styles.sectionHeader}>🏢 Party Details</Text>
              <PartySelector
                label="Customer (Consignor / Factory / Shipper)"
                partyType="CUSTOMER"
                selectedId={form.customerId}
                selectedName={form.customerName}
                onSelect={(id, name) => {
                  setField('customerId', id);
                  setField('customerName', name);
                }}
              />

              <PartySelector
                label="Truck Vendor (Fleet Owner / Broker)"
                partyType="VENDOR"
                selectedId={form.vendorId}
                selectedName={form.vendorName}
                onSelect={(id, name) => {
                  setField('vendorId', id);
                  setField('vendorName', name);
                }}
              />

              <Text style={[styles.sectionHeader, { marginTop: Spacing.sm }]}>
                🗺️ Route & Booking Date
              </Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Origin City *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.origin}
                    onChangeText={(v) => setField('origin', v)}
                    placeholder="e.g. Pune, MH"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Destination City *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.destination}
                    onChangeText={(v) => setField('destination', v)}
                    placeholder="e.g. Surat, GJ"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={{ marginTop: Spacing.sm }}>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={form.date}
                  onChangeText={(v) => setField('date', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          )}

          {/* STEP 2: VEHICLE & CARGO */}
          {step === 2 && (
            <View>
              <Text style={styles.sectionHeader}>🚛 Truck & Driver Details</Text>

              <View style={{ marginBottom: Spacing.md }}>
                <Text style={styles.inputLabel}>
                  Vehicle Number (Truck No.) *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    vehicleError ? { borderColor: Colors.danger, borderWidth: 1.5 } : {},
                  ]}
                  value={form.vehicleNumber}
                  onChangeText={(v) => {
                    setField('vehicleNumber', formatVehicleNumber(v));
                    setVehicleError('');
                  }}
                  placeholder="MH12AB1234"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                />
                {vehicleError ? (
                  <Text style={styles.errorText}>{vehicleError}</Text>
                ) : (
                  <Text style={styles.inputHint}>Format: MH12AB1234</Text>
                )}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Driver Name</Text>
                  <TextInput
                    style={styles.input}
                    value={form.driverName}
                    onChangeText={(v) => setField('driverName', v)}
                    placeholder="Driver Name"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Driver Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={form.driverPhone}
                    onChangeText={(v) => setField('driverPhone', v)}
                    placeholder="9876543210"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Text style={[styles.sectionHeader, { marginTop: Spacing.md }]}>
                📦 Cargo / Goods Information
              </Text>

              <View style={{ marginBottom: Spacing.md }}>
                <Text style={styles.inputLabel}>Material Description *</Text>
                <TextInput
                  style={styles.input}
                  value={form.materialDescription}
                  onChangeText={(v) => setField('materialDescription', v)}
                  placeholder="e.g. Corrugated Boxes, Steel Coils, Pharma"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Packages / Bags Count</Text>
                  <TextInput
                    style={styles.input}
                    value={form.packagesCount}
                    onChangeText={(v) => setField('packagesCount', v)}
                    placeholder="e.g. 50"
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Weight</Text>
                  <View style={styles.weightWrap}>
                    <TextInput
                      style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                      value={form.weight}
                      onChangeText={(v) => setField('weight', v)}
                      placeholder="e.g. 18.5"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TouchableOpacity
                      style={styles.unitBtn}
                      onPress={() =>
                        setField('weightUnit', form.weightUnit === 'MT' ? 'KG' : 'MT')
                      }
                    >
                      <Text style={styles.unitText}>{form.weightUnit}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={{ marginBottom: Spacing.md }}>
                <Text style={styles.inputLabel}>E-way Bill Number</Text>
                <TextInput
                  style={styles.input}
                  value={form.ewayBillNumber}
                  onChangeText={(v) => setField('ewayBillNumber', v)}
                  placeholder="12-digit E-way Bill No."
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View style={{ marginBottom: Spacing.md }}>
                <Text style={styles.inputLabel}>Insurance Risk</Text>
                <View style={styles.riskRow}>
                  {(["OWNER'S_RISK", "CARRIER'S_RISK"] as InsuranceRisk[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.riskBtn,
                        form.insuranceRisk === r && styles.riskBtnActive,
                      ]}
                      onPress={() => setField('insuranceRisk', r)}
                    >
                      <Text
                        style={[
                          styles.riskText,
                          form.insuranceRisk === r && styles.riskTextActive,
                        ]}
                      >
                        {r.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: FINANCIAL LEDGER & FREIGHT */}
          {step === 3 && (
            <View>
              <Text style={styles.sectionHeader}>💰 Freight & Ledger Setup</Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Customer Freight (Receivable) *</Text>
                  <TextInput
                    style={[styles.input, { fontSize: FontSizes.md, fontWeight: '700' }]}
                    value={form.customerFreight}
                    onChangeText={(v) => setField('customerFreight', v)}
                    keyboardType="decimal-pad"
                    placeholder="₹ 0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Vendor Freight (Payable) *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: FontSizes.md, fontWeight: '700', color: Colors.danger },
                    ]}
                    value={form.vendorFreight}
                    onChangeText={(v) => setField('vendorFreight', v)}
                    keyboardType="decimal-pad"
                    placeholder="₹ 0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Customer Advance Received</Text>
                  <TextInput
                    style={styles.input}
                    value={form.customerAdvance}
                    onChangeText={(v) => setField('customerAdvance', v)}
                    keyboardType="decimal-pad"
                    placeholder="₹ 0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Vendor Advance Paid</Text>
                  <TextInput
                    style={styles.input}
                    value={form.vendorAdvance}
                    onChangeText={(v) => setField('vendorAdvance', v)}
                    keyboardType="decimal-pad"
                    placeholder="₹ 0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Dynamic Profit Ledger Box */}
              <View style={styles.profitBox}>
                <View style={styles.profitHeader}>
                  <MaterialCommunityIcons name="calculator" size={20} color={Colors.primary} />
                  <Text style={styles.profitTitle}>Trip Profit & Balance Ledger</Text>
                </View>

                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Customer Freight (Receivable)</Text>
                  <Text style={[styles.profitVal, { color: Colors.primary }]}>
                    {formatINR(customerFreight)}
                  </Text>
                </View>

                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Truck Vendor Freight (Payable)</Text>
                  <Text style={[styles.profitVal, { color: Colors.danger }]}>
                    - {formatINR(vendorFreight)}
                  </Text>
                </View>

                <View style={[styles.profitRow, styles.commissionHighlight]}>
                  <Text style={styles.commissionTitle}>Net Broker Commission</Text>
                  <Text
                    style={[
                      styles.commissionVal,
                      { color: netCommission >= 0 ? Colors.success : Colors.danger },
                    ]}
                  >
                    {formatINR(netCommission)}
                  </Text>
                </View>

                <View style={[styles.profitRow, { borderBottomWidth: 0 }]}>
                  <View>
                    <Text style={styles.balanceSubLabel}>Customer Balance Due</Text>
                    <Text style={styles.balanceSubVal}>{formatINR(customerBalance)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.balanceSubLabel}>Truck Balance Payable</Text>
                    <Text style={[styles.balanceSubVal, { color: Colors.danger }]}>
                      {formatINR(vendorBalance)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Action Navigation Buttons */}
          <View style={styles.btnRow}>
            {step < 3 ? (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => {
                  if (step === 1 && !validateStep1()) return;
                  setStep((s) => (s + 1) as Step);
                }}
              >
                <Text style={styles.nextBtnText}>Next Step →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <MaterialCommunityIcons name="check-all" size={22} color="#fff" />
                <Text style={styles.nextBtnText}>
                  {loading ? 'Creating Trip & LR...' : 'Generate 1-Click Digital LR'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.primary },
  stepperWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepIndicator: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepCircleDone: { backgroundColor: Colors.success },
  stepNumText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  stepNumTextActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  stepLabelActive: { color: Colors.primary, fontWeight: '800' },
  scroll: { padding: Spacing.md, paddingBottom: 60 },
  sectionHeader: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  inputLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  inputHint: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  errorText: { fontSize: 10, color: Colors.danger, fontWeight: '600', marginTop: 2 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  weightWrap: { flexDirection: 'row' },
  unitBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 0,
  },
  unitText: { fontWeight: '800', color: Colors.primary, fontSize: FontSizes.xs },
  riskRow: { flexDirection: 'row', gap: Spacing.sm },
  riskBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  riskBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  riskText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textPrimary },
  riskTextActive: { color: '#fff' },
  profitBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  profitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  profitTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.primary },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profitLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  profitVal: { fontSize: FontSizes.sm, fontWeight: '700' },
  commissionHighlight: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    marginVertical: 4,
    borderBottomWidth: 0,
  },
  commissionTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.textPrimary },
  commissionVal: { fontSize: FontSizes.md, fontWeight: '900' },
  balanceSubLabel: { fontSize: 10, color: Colors.textMuted },
  balanceSubVal: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  btnRow: { marginTop: Spacing.lg },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '800' },
});

