import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SAVED_PLACES } from '../../data/mockData';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';
import RealMap from '../../components/RealMap';
import Skeleton from '../../components/Skeleton';

function PingRing({ color, size }: { color: string; size: number }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.pingRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        },
      ]}
    />
  );
}

function PulsingDot({ color, size = 8 }: { color: string; size?: number }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: anim }} />
  );
}

type PosOffset = number | `${number}%`;

const HOME_PLACE_ICONS = (c: any): Record<string, { icon: any; bg: any; color: any }> => ({
  home: { icon: 'home' as const, bg: c.lightBlueTint, color: c.primary },
  work: { icon: 'corporate-fare' as const, bg: c.surfaceContainerHigh, color: c.onSurface },
  default: { icon: 'sports-tennis' as const, bg: c.surfaceContainerHigh, color: c.onSurface },
});

function DriftingPin({
  top,
  left,
  right,
  bottom,
  color,
  icon,
  delay = 0,
}: {
  top?: PosOffset;
  left?: PosOffset;
  right?: PosOffset;
  bottom?: PosOffset;
  color: string;
  icon: 'electric-rickshaw' | 'directions-car';
  delay?: number;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [translate] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translate, {
          toValue: { x: 6, y: -6 },
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: { x: 0, y: 0 },
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [translate, delay]);

  return (
    <Animated.View
      style={[
        styles.pinWrap,
        { top, left, right, bottom },
        { transform: [{ translateX: translate.x }, { translateY: translate.y }] },
      ]}
    >
      <View style={styles.pin}>
        <MaterialIcon name={icon} size={18} color={color} />
        <View style={[styles.pinDot, { backgroundColor: color === colors.accentRed ? colors.accentRed : colors.primary }]} />
      </View>
    </Animated.View>
  );
}

// Places are moved inside component to access dynamic colors

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data from backend
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="home" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Greeting + location */}
        <View style={styles.greetingRow}>
          <View>
            {isLoading ? (
              <Skeleton width={120} height={28} radius={6} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={styles.greeting}>Hello, Alex 👋</Text>
            )}
            <TouchableOpacity style={styles.locationBtn} activeOpacity={0.8}>
              <MaterialIcon name="near-me" size={18} color={colors.primary} />
              <Text style={styles.locationText}>74th St, T. Nagar, Chennai</Text>
              <MaterialIcon name="expand-more" size={16} color={colors.outline} />
            </TouchableOpacity>
          </View>
          <View style={styles.notifWrap}>
            <TouchableOpacity
              style={styles.notifBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/notifications')}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              hitSlop={8}
            >
              <MaterialIcon name="notifications" size={20} color={colors.onSurface} />
            </TouchableOpacity>
            <View style={styles.notifDot} />
          </View>
        </View>

        {/* Search card */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputRow}>
            <MaterialIcon name="search" size={22} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Where do you want to go?"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={styles.micBtn} activeOpacity={0.8}>
              <MaterialIcon name="mic" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
            <TouchableOpacity style={styles.tag}>
              <MaterialIcon name="work" size={16} color={colors.primary} />
              <Text style={styles.tagText}>Work • Express Ave</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tag}>
              <MaterialIcon name="shopping-bag" size={16} color={colors.accentRed} />
              <Text style={styles.tagText}>Phoenix Marketcity</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tag, styles.tagRecent]}>
              <MaterialIcon name="history" size={16} color={colors.primary} />
              <Text style={styles.tagRecentText}>Recent</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Core actions grid */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionCard}>
            <View style={styles.rideDecor} />
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.lightBlueTint }]}>
                <MaterialIcon name="local-taxi" size={24} color={colors.primary} />
              </View>
              <View style={styles.etaBadge}>
                <PingRing color={colors.primary} size={6} />
                <Text style={styles.etaText}>3m away</Text>
              </View>
            </View>
            <Text style={styles.actionTitle}>Book a Ride</Text>
            <Text style={styles.actionDesc}>Autos & Cabs with guaranteed upfront fares</Text>
            <TouchableOpacity style={[styles.actionBtn, styles.rideBtn]} activeOpacity={0.85} onPress={() => router.push('/choose-vehicle')}>
              <Text style={styles.rideBtnText}>Ride Now</Text>
              <MaterialIcon name="arrow-forward" size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.sendDecor} />
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <MaterialIcon name="inventory-2" size={24} color={colors.accentRed} />
              </View>
              <View style={styles.doorBadge}>
                <Text style={styles.doorText}>Door-to-door</Text>
              </View>
            </View>
            <Text style={styles.actionTitle}>Send Parcel</Text>
            <Text style={styles.actionDesc}>Instant delivery via Two-wheelers & Autos</Text>
            <TouchableOpacity style={[styles.actionBtn, styles.sendBtn]} activeOpacity={0.85} onPress={() => router.push('/package-details')}>
              <Text style={styles.sendBtnText}>Send Now</Text>
              <MaterialIcon name="send" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ask Ematix AI card */}
        <View style={styles.aiCard}>
          <View style={styles.aiDecor} />
          <View style={styles.aiHeader}>
            <View style={styles.aiHeaderLeft}>
              <View style={styles.aiIconWrap}>
                <MaterialIcon name="auto-awesome" size={20} color={colors.onPrimary} />
              </View>
              <View>
                <Text style={styles.aiTitle}>Ask Ematix</Text>
                <Text style={styles.aiSubtitle}>Smart Mobility & Delivery Concierge</Text>
              </View>
            </View>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI Agent</Text>
            </View>
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiPrompt}>How can I assist your travel or delivery today?</Text>
            <View style={styles.aiChips}>
              <TouchableOpacity style={styles.aiChip} activeOpacity={0.85}>
                <Text style={styles.aiChipText}>⚡ Book auto to T. Nagar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiChip} activeOpacity={0.85}>
                <Text style={styles.aiChipText}>📊 Compare Auto vs Cab</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiChip} activeOpacity={0.85}>
                <Text style={styles.aiChipText}>📦 Send parcel to Anna Nagar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.aiInputRow}>
            <TextInput
              style={styles.aiInput}
              placeholder="Type or ask Ematix anything..."
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={styles.aiSendBtn} activeOpacity={0.85}>
              <MaterialIcon name="arrow-upward" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Vehicles Nearby */}
        <View style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <View>
              <Text style={styles.radarTitle}>Live Vehicles Nearby</Text>
              <Text style={styles.radarSubtitle}>14 Drivers active in T. Nagar grid</Text>
            </View>
            <View style={styles.liveBadge}>
              <PulsingDot color={colors.primary} />
              <Text style={styles.liveText}>Live Radar</Text>
            </View>
          </View>
          <View style={styles.mapBox}>
            <RealMap interactive style={styles.mapImage} />
            <View style={styles.mapOverlay} />
            <DriftingPin top={32} left={56} color={colors.accentRed} icon="electric-rickshaw" delay={0} />
            <DriftingPin top={80} right={64} color={colors.primary} icon="directions-car" delay={800} />
            <DriftingPin bottom={40} left="33.33%" color={colors.accentRed} icon="electric-rickshaw" delay={400} />
            <View style={styles.youWrap}>
              <PingRing color={colors.primary} size={16} />
              <View style={styles.youDot} />
              <View style={styles.youLabel}>
                <Text style={styles.youLabelText}>You</Text>
              </View>
            </View>
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accentRed }]} />
                <Text style={styles.legendText}>Auto 2m</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Cab 4m</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Destinations */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.radarTitle}>Recent Destinations</Text>
            <TouchableOpacity activeOpacity={0.85}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentList}>
            {isLoading
              ? [1, 2, 3].map((key) => (
                  <View key={key} style={styles.recentCard}>
                    <View style={styles.recentCardLeft}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <View style={styles.recentTextWrap}>
                        <Skeleton variant="text" width="60%" height={14} style={{ marginBottom: 4 }} />
                        <Skeleton variant="text" width="85%" height={12} />
                      </View>
                    </View>
                    <Skeleton width={70} height={36} radius={8} />
                  </View>
                ))
              : SAVED_PLACES.map((p: any) => {
                  const placeCfg = HOME_PLACE_ICONS(colors)[p.tagType] || HOME_PLACE_ICONS(colors).default;
                  return (
                  <TouchableOpacity key={p.title} style={styles.recentCard} activeOpacity={0.9}>
                    <View style={styles.recentCardLeft}>
                      <View style={[styles.recentIconWrap, { backgroundColor: placeCfg.bg }]}>
                        <MaterialIcon name={placeCfg.icon} size={22} color={placeCfg.color} />
                      </View>
                      <View style={styles.recentTextWrap}>
                        <Text style={styles.recentTitle} numberOfLines={1}>{p.title}</Text>
                        <Text style={styles.recentAddr} numberOfLines={1}>{p.subtitle}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.rebookBtn} activeOpacity={0.85}>
                      <Text style={styles.rebookText}>Rebook</Text>
                      <MaterialIcon name="chevron-right" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  );
                })}
          </View>
        </View>

        {/* SafeRide banner */}
        <View style={styles.safeRideCard}>
          <View style={styles.safeRideIconWrap}>
            <MaterialIcon name="shield" size={28} color={colors.primary} />
          </View>
          <View style={styles.safeRideTextWrap}>
            <Text style={styles.safeRideTitle}>Ematix SafeRide Active</Text>
            <Text style={styles.safeRideDesc}>Verified captains & real-time route deviation protection enabled.</Text>
          </View>
          <MaterialIcon name="verified" size={20} color={colors.primary} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: {
    padding: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    paddingBottom: 132,
    gap: spacing.stackLg,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { ...type.headlineMd, color: colors.onSurface },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locationText: { ...type.labelMd, color: colors.onSurfaceVariant },
  notifWrap: { position: 'relative' },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
  },
  searchCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: spacing.stackSm,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: radius.lg,
    gap: spacing.stackSm,
  },
  searchInput: {
    flex: 1,
    ...type.bodyMd,
    color: colors.onSurface,
    padding: 0,
  },
  micBtn: { padding: 4, borderRadius: 999 },
  tagsRow: { gap: 8, paddingTop: 4, paddingRight: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
  },
  tagRecent: { backgroundColor: colors.lightBlueTint },
  tagText: { ...type.labelSm, color: colors.onSurfaceVariant },
  tagRecentText: { ...type.labelSm, color: colors.primary },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between',
  },
  rideDecor: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.lightBlueTint,
  },
  sendDecor: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.surfaceContainerHigh,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 1,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 6,
    height: 20,
  },
  pingRing: { position: 'absolute' },
  etaText: { ...type.labelSm, color: colors.primary, fontSize: 11 },
  doorBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  doorText: { ...type.labelSm, color: colors.textMuted, fontSize: 11 },
  actionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    marginTop: 8,
    zIndex: 1,
  },
  actionDesc: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 4,
    zIndex: 1,
  },
  actionBtn: {
    marginTop: 12,
    width: '100%',
    height: 40,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  rideBtn: { backgroundColor: colors.primaryContainer },
  rideBtnText: { ...type.labelMd, color: colors.onPrimary },
  sendBtn: { backgroundColor: colors.lightBlueTint },
  sendBtnText: { ...type.labelMd, color: colors.primary },
  aiCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.stackMd,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  aiDecor: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(128,159,254,0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  aiHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitle: { ...type.headlineSm, color: colors.onPrimary, letterSpacing: -0.3 },
  aiSubtitle: { ...type.bodySm, color: colors.onPrimaryContainer },
  aiBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  aiBadgeText: { ...type.labelSm, color: colors.onPrimary, fontSize: 11 },
  aiContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.stackSm,
    borderRadius: radius.lg,
    zIndex: 1,
  },
  aiPrompt: { ...type.bodyMd, color: colors.onPrimary, marginBottom: spacing.stackSm },
  aiChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  aiChipText: { ...type.labelSm, color: colors.onPrimary },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.onPrimary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 8,
    zIndex: 1,
  },
  aiInput: { flex: 1, ...type.bodyMd, color: colors.onSurface, padding: 0 },
  aiSendBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.stackMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radarTitle: { ...type.headlineSm, color: colors.onSurface },
  radarSubtitle: { ...type.bodySm, color: colors.textMuted },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  liveText: { ...type.labelSm, color: colors.primary, fontFamily: fonts.semibold },
  mapBox: {
    height: 192,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,33,124,0.10)',
  },
  pinWrap: {
    position: 'absolute',
  },
  pin: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDot: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  youWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -8,
    marginLeft: -8,
    alignItems: 'center',
  },
  youDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  youLabel: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  youLabelText: { ...type.labelSm, color: colors.primary, fontFamily: fonts.bold },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...type.labelSm, color: colors.onSurface },
  recentSection: { flexDirection: 'column', gap: spacing.stackSm },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  seeAll: { ...type.labelMd, color: colors.primary },
  recentList: { flexDirection: 'column', gap: 8 },
  recentCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.cardPadding,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  recentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTextWrap: { flexDirection: 'column', flex: 1, minWidth: 0 },
  recentTitle: { ...type.labelLg, color: colors.onSurface },
  recentAddr: { ...type.bodySm, color: colors.textMuted },
  rebookBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGray,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  rebookText: { ...type.labelMd, color: colors.primary, fontSize: 12 },
  safeRideCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.cardPadding,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  safeRideIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeRideTextWrap: { flex: 1, minWidth: 0 },
  safeRideTitle: { ...type.labelLg, color: colors.onSurface },
  safeRideDesc: { ...type.bodySm, color: colors.textMuted, marginTop: 2 },
});