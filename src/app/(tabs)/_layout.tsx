import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 10);
  const tabHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1D4ED8',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard.title', 'Dashboard'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('trips.title', 'Trips'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="truck" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="parties"
        options={{
          title: t('parties.title', 'Parties'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: t('invoices.title', 'Invoices'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
