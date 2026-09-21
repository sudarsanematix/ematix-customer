import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import RealMap from '../components/RealMap';
import { useTheme } from '../theme/ThemeProvider';
import { radius, fonts } from '../theme/typography';

interface PingRingProps {
  size: number;
  duration: number;
  delay: number;
  color: string;
}

function PingRing({ size, duration, delay, color }: PingRingProps) {
  const [scale] = useState(() => new Animated.Value(0.3));
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scale, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      })
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    fade.start();
    return () => {
      loop.stop();
      fade.stop();
    };
  }, [scale, opacity, duration, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

interface MapIconPingProps {
  top: string;
  left?: string;
  right?: string;
  kind: 'taxi' | 'rickshaw';
}

function MapIconPing({ top, left, right, kind }: MapIconPingProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const positionStyles: Record<string, string> = { top };
  if (left) positionStyles.left = left;
  if (right) positionStyles.right = right;
  return (
    <View
      style={[styles.driverPin, positionStyles]}
    >
      <MaterialIcon
        name={kind === 'taxi' ? 'local-taxi' : 'electric-rickshaw'}
        size={16}
        color={colors.primary}
      />
    </View>
  );
}

export default function FindingDriverScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [timer, setTimer] = useState(24);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const modalRef = useRef(false);

  useEffect(() => {
    modalRef.current = showCancelModal;
  }, [showCancelModal]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    const navTimeout = setTimeout(() => {
      clearInterval(interval);
      if (!modalRef.current) {
        router.replace('/active-ride');
      }
    }, 12000);

    return () => {
      clearInterval(interval);
      clearTimeout(navTimeout);
    };
  }, [router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="finding-driver" title="Finding Driver" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
        {/* Map Simulation Layer */}
        <View style={styles.mapContainer}>
          <RealMap interactive style={styles.mapImage}>
            {/* Vignette Gradient */}
            <LinearGradient
              colors={['rgba(252,249,248,0.7)', 'transparent', colors.surface]}
              style={StyleSheet.absoluteFill}
            />

            {/* Floating Pill Status Beacon */}
            <View style={styles.beaconContainer}>
              <View style={styles.beaconPill}>
                <View style={styles.beaconDotWrap}>
                  <View style={styles.beaconPing} />
                  <View style={styles.beaconDot} />
                </View>
                <Text style={styles.beaconText}>Connecting to nearby drivers</Text>
              </View>
            </View>

            {/* Radar Waves & User Beacon Node */}
            <View style={styles.radarCenter}>
              <PingRing size={256} duration={3000} delay={0} color="rgba(0,33,124,0.1)" />
              <PingRing size={176} duration={2000} delay={600} color="rgba(0,33,124,0.15)" />
              <View style={styles.radarGlow}>
                <View style={styles.radarCore}>
                  <View style={styles.radarPulse}>
                    <View style={styles.radarDot} />
                  </View>
                </View>
              </View>
            </View>

            {/* Simulated Nearby Driver Pings */}
            <MapIconPing top="38%" left="28%" kind="taxi" />
            <MapIconPing top="62%" right="24%" kind="taxi" />
            <MapIconPing top="28%" right="32%" kind="rickshaw" />

            {/* Recenter Button */}
            <TouchableOpacity style={styles.recenterBtn} activeOpacity={0.7}>
              <MaterialIcon name="my-location" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </RealMap>
        </View>

        {/* Persistent Search Sheet */}
        <View style={styles.bottomSheet}>
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.sheetHeader}>
            <View style={styles.titleRow}>
              <Animated.View style={styles.syncSpin}>
                <MaterialIcon name="sync" size={22} color={colors.primary} />
              </Animated.View>
              <Text style={styles.sheetTitle}>Finding an Auto near you...</Text>
            </View>
            <Text style={styles.sheetSubtitle}>Matching with top-rated drivers within 1.5 km</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <View style={styles.progressLeft}>
                <View style={styles.progressPulseDot} />
                <Text style={styles.progressText}>Contacting 4 nearby autos...</Text>
              </View>
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
            </View>
            <View style={styles.trackBar}>
              <View style={[styles.trackFill, { width: `${Math.min(95, 45 + (timer % 30))}%` }]} />
            </View>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleIconWrapper}>
                  <MaterialIcon name="electric-rickshaw" size={28} color={colors.primary} />
                </View>
                <View>
                  <View style={styles.vehicleTitleRow}>
                    <Text style={styles.vehicleTitle}>Ematix Auto</Text>
                    <View style={styles.ecoBadge}>
                      <Text style={styles.ecoBadgeText}>Eco</Text>
                    </View>
                  </View>
                  <View style={styles.etaRow}>
                    <MaterialIcon name="schedule" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.etaText}>Est. pickup: 3–5 mins</Text>
                  </View>
                </View>
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.priceText}>₹135</Text>
                <Text style={styles.guaranteeText}>Guaranteed</Text>
              </View>
            </View>

            <View style={styles.routeBox}>
              <View style={styles.routeLineColumn}>
                <View style={styles.routeDotBlue} />
                <View style={styles.routeLine} />
                <View style={styles.routeDotRed} />
              </View>
              <View style={styles.routeTextColumn}>
                <View style={styles.routePointRow}>
                  <Text style={styles.routeLocationText} numberOfLines={1}>Anna Salai, Mount Road</Text>
                  <Text style={styles.routeLabelText}>Pickup</Text>
                </View>
                <View style={styles.routePointRow}>
                  <Text style={styles.routeLocationText} numberOfLines={1}>Marina Bay Promenade</Text>
                  <Text style={styles.routeLabelText}>Drop</Text>
                </View>
              </View>
            </View>

            <View style={styles.trustBadge}>
              <MaterialIcon name="verified-user" size={18} color={colors.primary} />
              <Text style={styles.trustText}>Price locked • No hidden surge • Verified partners</Text>
            </View>
          </View>

          <View style={styles.actionArea}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.9} onPress={() => setShowCancelModal(true)}>
              <MaterialIcon name="close" size={20} color={colors.accentRed} />
              <Text style={styles.cancelBtnText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.alertIconWrapper}>
                <MaterialIcon name="warning" size={26} color={colors.accentRed} />
              </View>
              <Text style={styles.modalTitle}>Cancel Search?</Text>
              <Text style={styles.modalSubtitle}>
                We are almost done matching with a driver nearby. Cancelling will forfeit your guaranteed
                upfront fare of ₹135.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.keepSearchBtn}
                activeOpacity={0.9}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.keepSearchBtnText}>Keep Searching</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                activeOpacity={0.9}
                onPress={() => {
                  setShowCancelModal(false);
                  router.back();
                }}
              >
                <Text style={styles.confirmCancelBtnText}>Yes, Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  mapContainer: {
    height: 360,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  beaconContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  beaconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252, 249, 248, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  beaconDotWrap: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beaconPing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
    opacity: 0.75,
  },
  beaconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
    alignSelf: 'center',
  },
  beaconText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },
  radarCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -128,
    marginLeft: -128,
    width: 256,
    height: 256,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  radarGlow: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(0, 33, 124, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 51, 177, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarPulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.onPrimary,
  },
  driverPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(252, 249, 248, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 20,
  },
  bottomSheet: {
    backgroundColor: 'rgba(252, 249, 248, 0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 20,
    gap: 16,
  },
  dragHandleWrap: {
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.borderGray,
    borderRadius: 2,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncSpin: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },
  sheetSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'column',
    gap: 8,
    backgroundColor: 'rgba(234, 241, 255, 0.7)',
    padding: 12,
    borderRadius: radius.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  progressText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  timerText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  trackBar: {
    height: 6,
    backgroundColor: 'rgba(180, 197, 255, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.primaryContainer,
    borderRadius: 3,
  },
  detailsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#06358f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  ecoBadge: {
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ecoBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  etaText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.84,
    color: colors.onSurface,
  },
  guaranteeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  routeBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeLineColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 0,
  },
  routeDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: colors.borderGray,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
  },
  routeTextColumn: {
    flex: 1,
    gap: 4,
  },
  routePointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeLocationText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  routeLabelText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
    flexShrink: 0,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  trustText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  actionArea: {
    paddingTop: 4,
  },
  cancelBtn: {
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  cancelBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.accentRed,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(49, 48, 48, 0.4)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
    textAlign: 'center',
  },
  alertIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'column',
    gap: 8,
  },
  keepSearchBtn: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepSearchBtnText: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  confirmCancelBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    color: colors.accentRed,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
});