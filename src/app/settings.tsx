import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';

function Row({
  icon,
  label,
  sublabel,
  onPress,
  value,
  onValueChange,
  last,
}: {
  icon: MaterialIconName;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const content = (
    <>
      <View style={styles.optionIconWrap}>
        <MaterialIcon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionText}>{label}</Text>
        {sublabel ? <Text style={styles.optionSub}>{sublabel}</Text> : null}
      </View>
      {typeof value === 'boolean' && onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: colors.primaryContainer, false: colors.surfaceContainerHigh }}
          thumbColor={value ? colors.onPrimary : colors.surfaceContainerLowest}
        />
      ) : (
        <MaterialIcon name="chevron-right" size={20} color={colors.outlineVariant} />
      )}
    </>
  );

  if (typeof value === 'boolean' && onValueChange) {
    return <View style={[styles.optionRow, last && styles.optionRowLast]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.optionRow, last && styles.optionRowLast]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = createStyles(colors);

  const [notifPrefs, setNotifPrefs] = useState({
    rides: true,
    deliveries: true,
    offers: false,
    safety: true,
  });
  const [prefs, setPrefs] = useState({
    receipts: true,
    shareLive: false,
    language: 'English',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="settings" title="Settings" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.groupTitle}>Appearance</Text>
        <View style={styles.group}>
          <Row
            icon={isDark ? 'light-mode' : 'dark-mode'}
            label="Use dark theme"
            sublabel={isDark ? 'Dark mode is on' : 'Switch to a darker look'}
            value={isDark}
            onValueChange={toggleTheme}
            last
          />
        </View>

        <Text style={styles.groupTitle}>Notifications</Text>
        <View style={styles.group}>
          <Row icon="local-taxi" label="Ride updates" sublabel="Booking, driver & fare alerts" value={notifPrefs.rides} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, rides: v }))} />
          <Row icon="inventory-2" label="Delivery updates" sublabel="Pickup, transit & drop-off alerts" value={notifPrefs.deliveries} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, deliveries: v }))} />
          <Row icon="local-offer" label="Offers & promos" sublabel="Discounts and cashback" value={notifPrefs.offers} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, offers: v }))} />
          <Row icon="shield" label="Safety alerts" sublabel="Route & emergency notifications" value={notifPrefs.safety} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, safety: v }))} last />
        </View>

        <Text style={styles.groupTitle}>Language</Text>
        <View style={styles.group}>
          <View style={styles.langRow}>
            {['English', 'தமிழ்', 'हिन्दी'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langChip, prefs.language === lang && styles.langChipActive]}
                activeOpacity={0.85}
                onPress={() => setPrefs((s) => ({ ...s, language: lang }))}
              >
                <Text style={[styles.langChipText, prefs.language === lang && styles.langChipTextActive]}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.groupTitle}>Ride & Privacy</Text>
        <View style={styles.group}>
          <Row icon="insert-drive-file" label="Send trip receipts on WhatsApp" sublabel="After every ride & delivery" value={prefs.receipts} onValueChange={(v) => setPrefs((s) => ({ ...s, receipts: v }))} />
          <Row icon="my-location" label="Share live location during rides" sublabel="Only with your emergency contacts" value={prefs.shareLive} onValueChange={(v) => setPrefs((s) => ({ ...s, shareLive: v }))} last />
        </View>

        <Text style={styles.groupTitle}>Support & Legal</Text>
        <View style={styles.group}>
          <Row icon="help-outline" label="Help Center" sublabel="FAQs & 24x7 support" onPress={() => router.push('/notifications')} />
          <Row icon="description" label="Terms of Service" onPress={() => router.back()} />
          <Row icon="privacy-tip" label="Privacy Policy" onPress={() => router.back()} />
          <Row icon="verified-user" label="About Ematix" sublabel="Version 1.0.0" onPress={() => router.back()} last />
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={() => router.replace('/login')}>
          <MaterialIcon name="logout" size={18} color={colors.accentRed} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Ematix v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.marginMobile,
    paddingBottom: 100,
  },
  groupTitle: {
    ...type.labelSm,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: spacing.stackSm,
    marginTop: spacing.stackXl,
  },
  group: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.stackXs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    gap: spacing.stackMd,
  },
  optionRowLast: {
    borderBottomWidth: 0,
    paddingBottom: spacing.stackMd,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  optionSub: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    flexWrap: 'wrap',
    paddingVertical: spacing.stackMd,
  },
  langChip: {
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceGray,
  },
  langChipActive: {
    backgroundColor: colors.primaryContainer,
  },
  langChipText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  langChipTextActive: {
    color: colors.onPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.accentRed,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
    marginTop: spacing.stackXl,
  },
  logoutText: {
    color: colors.accentRed,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  versionText: {
    textAlign: 'center',
    color: colors.outlineVariant,
    ...type.bodySm,
    marginTop: spacing.stackLg,
  },
});