import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type } from '../../theme/typography';
import MaterialIcon from '../../components/MaterialIcon';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: isDark ? 'rgba(18, 18, 26, 0.95)' : 'rgba(252, 249, 248, 0.95)' }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcon name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <MaterialIcon name="receipt-long" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ask-ematix"
        options={{
          title: 'Ask Ematix',
          tabBarIcon: ({ color }) => <MaterialIcon name="auto-awesome" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcon name="account-circle" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 10,
    position: 'absolute',
    bottom: 0,
  },
  tabLabel: {
    ...type.labelSm,
    fontFamily: fonts.semibold,
    marginTop: 4,
  },
  tabIcon: {
    marginTop: 2,
  },
});