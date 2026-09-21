import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing } from '../theme/typography';
import MaterialIcon from './MaterialIcon';

interface SharedHeaderProps {
  currentScreen?: string;
  title?: string;
}

export default function SharedHeader({ currentScreen = 'home', title }: SharedHeaderProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = createStyles(colors, isDark);

  const router = useRouter();

  const isRootTab = ['home', 'orders', 'profile', 'ask-ematix'].includes(currentScreen);
  const displayTitle = title || currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1).replace('-', ' ');

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {!isRootTab && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialIcon name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        )}
        {isRootTab && (
          <View style={styles.logoRow}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>E</Text>
            </View>
            <Text style={styles.brandName}>Ematix</Text>
            <View style={styles.divider} />
          </View>
        )}
        <Text style={styles.screenTitle} numberOfLines={1}>{displayTitle}</Text>
      </View>

      <View style={styles.rightSection}>
        {isRootTab && (
          <TouchableOpacity
            style={styles.locationSelector}
            activeOpacity={0.85}
            onPress={() => {}}
          >
            <MaterialIcon name="location-on" size={18} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>Downtown</Text>
            <MaterialIcon name="expand-more" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.themeBtn}
          activeOpacity={0.7}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <MaterialIcon name={isDark ? 'light-mode' : 'dark-mode'} size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileAvatar} activeOpacity={0.85}>
          <MaterialIcon name="person" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    backgroundColor: isDark ? 'rgba(18, 18, 26, 0.85)' : 'rgba(252, 249, 248, 0.85)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  backBtn: {
    width: spacing.touchTarget,
    height: spacing.touchTarget,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.stackSm,
    marginLeft: -8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 28,
    height: 28,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.stackSm,
  },
  logoText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  brandName: {
    ...type.headlineSm,
    color: colors.primary,
    letterSpacing: -0.3,
    fontFamily: fonts.semibold,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: colors.borderGray,
    marginHorizontal: spacing.stackXs,
  },
  screenTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    flexShrink: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    flexShrink: 0,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    height: spacing.touchTarget,
    paddingHorizontal: spacing.stackSm,
    borderRadius: 999,
    backgroundColor: colors.lightBlueTint,
    gap: 4,
  },
  locationText: {
    ...type.labelSm,
    color: colors.primary,
    maxWidth: 80,
    fontFamily: fonts.semibold,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
  },
});