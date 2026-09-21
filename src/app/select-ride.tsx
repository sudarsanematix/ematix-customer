import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import SharedHeader from '../components/SharedHeader';
import { useTheme } from '../theme/ThemeProvider';
import { type, spacing, radius } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';
import RealMap from '../components/RealMap';
import AnimatedButton from '../components/AnimatedButton';
import DraggableSheet from '../components/DraggableSheet';

const RIDE_OPTIONS = [
  {
    id: 'auto',
    name: 'Ematix Auto',
    emoji: '🛺',
    price: 135,
    originalPrice: 160,
    time: 'Drop ~05:42 PM',
    seats: 3,
    description: 'Quickest in city traffic',
    badge: 'ECO',
    eta: '3m away',
    active: true,
  },
  {
    id: 'car',
    name: 'Ematix Car',
    emoji: '🚗',
    price: 260,
    originalPrice: 285,
    time: 'Premium comfort',
    seats: 4,
    description: 'Comfortable AC ride',
    badge: 'AC PRIME',
    eta: '5m away',
    active: false,
  },
];

function PingDot({ color }: { color: string }) {
  const [ring] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ring, pulse]);

  return (
    <View style={{ width: 8, height: 8, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
        }}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: pulse }} />
    </View>
  );
}

function BouncePin({ children }: { children: React.ReactNode }) {
  const [bounce] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -4, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  return <Animated.View style={{ transform: [{ translateY: bounce }] }}>{children}</Animated.View>;
}

export default function SelectRideScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [selectedRide, setSelectedRide] = useState(RIDE_OPTIONS[0]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="select-ride" title="Select Vehicle" />

      {/* Map Canvas with Overlays */}
      <View style={styles.mapContainer}>
        <RealMap interactive style={styles.mapImage}>
          <LinearGradient
            colors={['rgba(0,33,124,0.1)', 'transparent', 'rgba(252,249,248,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.mapScrim}
          />

          {/* Route progress float bar */}
          <View style={styles.routeFloatBar}>
            <PingDot color={colors.accentRed} />
            <Text style={styles.routeFloatText}>Live Traffic: Moderate on Mount Road</Text>
            <Text style={styles.routeFloatMeta}>• 8.4 km</Text>
          </View>

          {/* Route SVG */}
          <Svg style={styles.routeSvg} width="100%" height="100%" viewBox="0 0 390 320">
            <Defs>
              <SvgGradient id="routeGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                <Stop offset="0%" stopColor="#0033b1" />
                <Stop offset="50%" stopColor="#3859b3" />
                <Stop offset="100%" stopColor="#c52a2e" />
              </SvgGradient>
            </Defs>
            <Path
              d="M 60,65 Q 120,110 180,130 T 320,200"
              fill="none"
              opacity={0.8}
              stroke="#dde1ff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={8}
            />
            <Path
              d="M 60,65 Q 120,110 180,130 T 320,200"
              fill="none"
              stroke="url(#routeGradient)"
              strokeDasharray="6,4"
              strokeLinecap="round"
              strokeWidth={4}
            />
          </Svg>

          {/* Origin node */}
          <View style={styles.originNode}>
            <View style={styles.originCircle}>
              <MaterialIcon name="trip-origin" size={16} color={colors.onPrimary} />
            </View>
            <View style={styles.nodeLabel}>
              <Text style={styles.nodeLabelText}>Anna Salai</Text>
            </View>
          </View>

          {/* Traffic delay pill */}
          <View style={styles.delayPill}>
            <MaterialIcon name="traffic" size={12} color={colors.onTertiary} />
            <Text style={styles.delayText}>+4m delay</Text>
          </View>

          {/* Destination node */}
          <View style={styles.destNode}>
            <View style={styles.nodeLabel}>
              <Text style={styles.nodeLabelText}>Marina Bay</Text>
            </View>
            <BouncePin>
              <View style={styles.destCircle}>
                <MaterialIcon name="location-on" size={18} color={colors.onTertiary} />
              </View>
            </BouncePin>
          </View>

          {/* Map controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlBtn} activeOpacity={0.85}>
              <MaterialIcon name="layers" size={20} color={colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapControlBtn} activeOpacity={0.85}>
              <MaterialIcon name="my-location" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </RealMap>
      </View>

      {/* Bottom Sheet */}
      <DraggableSheet>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetSubtitle}>Fastest Route</Text>
              <Text style={styles.sheetTitle}>Select your ride</Text>
            </View>
            <View style={styles.routeBadge}>
              <MaterialIcon name="navigation" size={16} color={colors.primary} />
              <Text style={styles.routeText}>8.4 km • ~22 mins</Text>
            </View>
          </View>

          {/* Ride options */}
          <View style={styles.optionsList}>
            {RIDE_OPTIONS.map((option) => {
              const isSelected = selectedRide.id === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.rideCard, isSelected && styles.rideCardSelected]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedRide(option)}
                >
                  {isSelected && <View style={styles.selectedBar} />}
                  <View style={styles.rideCardInner}>
                    <View style={styles.rideInfoLeft}>
                      <View style={[styles.rideIconWrapper, !isSelected && styles.rideIconWrapperInactive]}>
                        <Text style={styles.rideEmoji}>{option.emoji}</Text>
                        <View style={[styles.etaTag, isSelected ? styles.etaTagActive : styles.etaTagInactive]}>
                          <Text style={[styles.etaTagText, isSelected ? styles.etaTagTextActive : styles.etaTagTextInactive]}>
                            {option.eta}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rideDetails}>
                        <View style={styles.rideTitleRow}>
                          <Text style={styles.rideName} numberOfLines={1}>{option.name}</Text>
                          <View style={[styles.badge, option.badge === 'AC PRIME' ? styles.badgePrime : styles.badgeEco]}>
                            {option.badge === 'ECO' && <MaterialIcon name="eco" size={12} color={colors.primary} />}
                            <Text
                              style={[styles.badgeText, option.badge === 'AC PRIME' ? styles.badgeTextPrime : styles.badgeTextEco]}
                            >
                              {option.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.rideDesc} numberOfLines={1}>{option.description}</Text>
                        <View style={styles.rideMetaRow}>
                          <View style={styles.metaItem}>
                            <MaterialIcon name="person" size={14} color={colors.textMuted} />
                            <Text style={styles.rideMetaText}>{option.seats} seats</Text>
                          </View>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={[styles.rideMetaText, isSelected && styles.rideMetaTextActive]}>{option.time}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.ridePriceCol}>
                      <Text style={styles.priceText}>₹{option.price}</Text>
                      <Text style={styles.originalPriceText}>₹{option.originalPrice}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Payment & Promo */}
          <View style={styles.paySection}>
            <View style={styles.promoRow}>
              <View style={styles.promoLeft}>
                <View style={styles.promoIconWrap}>
                  <MaterialIcon name="local-offer" size={14} color={colors.primary} />
                </View>
                <Text style={styles.promoText} numberOfLines={1}>
                  <Text style={styles.promoBold}>EMATIX50</Text> applied (-₹25 savings)
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.promoRemove}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <View style={styles.paymentIconWrap}>
                  <MaterialIcon name="account-balance-wallet" size={16} color={colors.primary} />
                </View>
                <View style={styles.paymentTextRow}>
                  <Text style={styles.paymentName}>Google Pay UPI</Text>
                  <Text style={styles.paymentSuffix}>•••• 4821</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.changeBtn} activeOpacity={0.8}>
                <Text style={styles.changeBtnText}>Change</Text>
                <MaterialIcon name="chevron-right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary CTA */}
          <View style={styles.ctaWrap}>
            <AnimatedButton
              style={styles.bookBtn}
              activeScale={0.97}
              onPress={() => router.push('/finding-driver' as never)}
            >
              <View style={styles.bookBtnLeft}>
                <MaterialIcon name="bolt" size={20} color={colors.onPrimary} />
                <Text style={styles.bookBtnText}>Continue with {selectedRide.name.replace('Ematix ', '')}</Text>
              </View>
              <View style={styles.bookBtnRight}>
                <Text style={styles.bookBtnPrice}>₹{selectedRide.price}</Text>
                <MaterialIcon name="arrow-forward" size={20} color={colors.onPrimary} />
              </View>
            </AnimatedButton>
            <Text style={styles.ctaFooter}>Guaranteed pickup speed with Ematix Smart Dispatch</Text>
          </View>
        </ScrollView>
      </DraggableSheet>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  mapContainer: { height: 320, backgroundColor: colors.surfaceContainer },
  mapImage: { width: '100%', height: '100%' },
  mapScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  routeSvg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  routeFloatBar: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  routeFloatText: { ...type.labelSm, color: colors.onSurface },
  routeFloatMeta: { ...type.labelSm, color: colors.onSurfaceVariant },
  originNode: {
    position: 'absolute',
    top: 48,
    left: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  originCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(221,225,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  nodeLabel: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nodeLabelText: { ...type.labelSm, fontFamily: 'Inter_700Bold', color: colors.onSurface },
  delayPill: {
    position: 'absolute',
    top: 135,
    left: 170,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentRed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    transform: [{ scale: 0.9 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  delayText: { ...type.labelSm, color: colors.onTertiary },
  destNode: {
    position: 'absolute',
    bottom: 64,
    right: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  destCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,218,215,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
  },
  mapControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheet: {
    marginTop: -24,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 35,
    elevation: 20,
    zIndex: 10,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    opacity: 0.6,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.stackMd,
  },
  sheetContent: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: 32,
    gap: spacing.stackMd,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetSubtitle: {
    ...type.labelSm,
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sheetTitle: { ...type.headlineMd, color: colors.onSurface },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: spacing.stackSm,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  routeText: { ...type.labelSm, color: colors.onSurface, fontFamily: 'Inter_600SemiBold' },
  optionsList: { flexDirection: 'column', gap: spacing.stackSm },
  rideCard: {
    position: 'relative',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.stackMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideCardSelected: {
    backgroundColor: colors.lightBlueTint,
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    transform: [{ scale: 1.01 }],
  },
  selectedBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 6,
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  rideCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  rideInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    flex: 1,
    minWidth: 0,
  },
  rideIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  rideIconWrapperInactive: { backgroundColor: colors.surfaceContainerLow },
  rideEmoji: { fontSize: 32, marginBottom: 8 },
  etaTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  etaTagActive: { backgroundColor: 'rgba(0, 33, 124, 0.1)' },
  etaTagInactive: { backgroundColor: 'rgba(28, 27, 27, 0.05)' },
  etaTagText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  etaTagTextActive: { color: colors.primary },
  etaTagTextInactive: { color: colors.onSurfaceVariant },
  rideDetails: { flex: 1, minWidth: 0 },
  rideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rideName: { ...type.headlineSm, color: colors.onSurface, flexShrink: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 2,
  },
  badgeEco: { backgroundColor: colors.surfaceGray },
  badgePrime: { backgroundColor: colors.secondaryFixed },
  badgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  badgeTextEco: { color: colors.primary },
  badgeTextPrime: { color: colors.onSecondaryFixed },
  rideDesc: { ...type.bodySm, color: colors.onSurfaceVariant, marginVertical: 2 },
  rideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rideMetaText: { ...type.labelSm, color: colors.textMuted },
  rideMetaTextActive: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
  metaDot: { color: colors.borderGray, fontSize: 12 },
  ridePriceCol: { alignItems: 'flex-end', flexShrink: 0 },
  priceText: { ...type.displayMetric, color: colors.onSurface },
  originalPriceText: { ...type.labelSm, color: colors.textMuted, textDecorationLine: 'line-through' },
  paySection: { flexDirection: 'column', gap: 8, marginTop: 4 },
  promoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGray,
  },
  promoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  promoIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoText: { ...type.labelSm, color: colors.onSurface },
  promoBold: { color: colors.primary, fontFamily: 'Inter_700Bold' },
  promoRemove: { ...type.labelSm, color: colors.accentRed, fontFamily: 'Inter_600SemiBold' },
  paymentRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  paymentIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentTextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentName: { ...type.labelMd, color: colors.onSurface },
  paymentSuffix: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeBtnText: { ...type.labelSm, color: colors.primary, fontFamily: 'Inter_700Bold' },
  ctaWrap: { paddingTop: 4 },
  bookBtn: {
    width: '100%',
    height: spacing.touchTarget,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sheetPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtnText: { ...type.labelLg, color: colors.onPrimary },
  bookBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookBtnPrice: { ...type.headlineSm, color: colors.onPrimary, fontFamily: 'Inter_700Bold' },
  ctaFooter: {
    textAlign: 'center',
    marginTop: spacing.stackSm,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
  },
});