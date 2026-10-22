import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../utils/api';
import { changeAppLanguage } from '../i18n';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../i18n/languages';

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
  const { t, i18n } = useTranslation();
  const { token, login } = useAuth();

  const [notifPrefs, setNotifPrefs] = useState({
    rides: true,
    deliveries: true,
    offers: false,
    safety: true,
  });
  const [prefs, setPrefs] = useState({
    receipts: true,
    shareLive: false,
  });

  // The language lives in the i18n singleton rather than in local state: it
  // has to change every screen at once, and it has to survive a restart. The
  // account copy is written afterwards and never blocks the switch.
  const activeLanguage = (i18n.language.split('-')[0] || 'en') as AppLanguage;

  const selectLanguage = async (language: AppLanguage) => {
    await changeAppLanguage(language, async (code) => {
      if (!token) return;
      const data = await authedFetch('/api/profile/customer/preferences', token, {
        method: 'PUT',
        body: { language: code },
      });
      if (data?.user) await login(data.user, token);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="settings" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.groupTitle}>{t('settings.groupAppearance')}</Text>
        <View style={styles.group}>
          <Row
            icon={isDark ? 'light-mode' : 'dark-mode'}
            label={t('settings.useDarkTheme')}
            sublabel={isDark ? t('profile.darkModeOn') : t('profile.darkModeHint')}
            value={isDark}
            onValueChange={toggleTheme}
            last
          />
        </View>

        <Text style={styles.groupTitle}>{t('settings.groupNotifications')}</Text>
        <View style={styles.group}>
          <Row icon="local-taxi" label={t('settings.notifRides')} sublabel={t('profile.notifRidesSublabel')} value={notifPrefs.rides} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, rides: v }))} />
          <Row icon="inventory-2" label={t('settings.notifDeliveries')} sublabel={t('profile.notifDeliveriesSublabel')} value={notifPrefs.deliveries} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, deliveries: v }))} />
          <Row icon="local-offer" label={t('settings.notifOffers')} sublabel={t('profile.notifOffersSublabel')} value={notifPrefs.offers} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, offers: v }))} />
          <Row icon="shield" label={t('settings.notifSafety')} sublabel={t('profile.notifSafetySublabel')} value={notifPrefs.safety} onValueChange={(v) => setNotifPrefs((s) => ({ ...s, safety: v }))} last />
        </View>

        <Text style={styles.groupTitle}>{t('settings.groupLanguage')}</Text>
        <View style={styles.group}>
          <View style={styles.langRow}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langChip, activeLanguage === lang.code && styles.langChipActive]}
                activeOpacity={0.85}
                onPress={() => selectLanguage(lang.code)}
              >
                <Text style={[styles.langChipText, activeLanguage === lang.code && styles.langChipTextActive]}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.groupTitle}>{t('settings.groupPrivacy')}</Text>
        <View style={styles.group}>
          <Row icon="insert-drive-file" label={t('profile.receiptsWhatsapp')} sublabel={t('profile.receiptsSublabel')} value={prefs.receipts} onValueChange={(v) => setPrefs((s) => ({ ...s, receipts: v }))} />
          <Row icon="my-location" label={t('profile.shareLiveLocation')} sublabel={t('profile.shareLiveSublabel')} value={prefs.shareLive} onValueChange={(v) => setPrefs((s) => ({ ...s, shareLive: v }))} last />
        </View>

        <Text style={styles.groupTitle}>{t('settings.groupLegal')}</Text>
        <View style={styles.group}>
          <Row icon="help-outline" label={t('nav.helpCenter')} sublabel={t('profile.helpSublabel')} onPress={() => router.push('/notifications')} />
          <Row icon="description" label={t('auth.termsOfService')} onPress={() => router.back()} />
          <Row icon="privacy-tip" label={t('auth.privacyPolicy')} onPress={() => router.back()} />
          <Row icon="verified-user" label={t('settings.aboutEmatix')} sublabel={t('profile.versionSublabel')} onPress={() => router.back()} last />
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={() => router.replace('/login')}>
          <MaterialIcon name="logout" size={18} color={colors.accentRed} />
          <Text style={styles.logoutText}>{t('common.signOut')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{t('common.appVersion')}</Text>
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