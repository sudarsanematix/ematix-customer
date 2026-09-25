import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing, Image, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import RealMap from '../components/RealMap';
import DraggableSheet from '../components/DraggableSheet';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type } from '../theme/typography';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';

type RideData = {
  id?: string;
  partner?: {
    name?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  } | null;
};

function BounceMarker() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [bounce] = useState(() => new Animated.Value(0));
  const [ping] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    );
    bounceLoop.start();
    return () => bounceLoop.stop();
  }, [bounce]);

  useEffect(() => {
    const pingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ping, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ping, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pingLoop.start();
    return () => pingLoop.stop();
  }, [ping]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const pingScale = ping.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.8] });
  const pingOpacity = ping.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Animated.View style={[styles.markerWrap, { transform: [{ translateY }] }]}>
      <View style={styles.markerHalo}>
        <View style={styles.markerCore}>
          <MaterialIcon name="two-wheeler" size={22} color={colors.onPrimary} />
        </View>
        <Animated.View style={[styles.markerPingBadge, { transform: [{ scale: pingScale }], opacity: pingOpacity }]} />
        <View style={styles.markerStatusDot} />
      </View>
      <View style={styles.markerLabel}>
        <Text style={styles.markerLabelText}>{'Courier (Moving)'}</Text>
      </View>
    </Animated.View>
  );
}

function PulseDot() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] });

  return (
    <View style={styles.pulseDotWrap}>
      <Animated.View style={[styles.pulseDotRing, { transform: [{ scale }], opacity }]} />
      <View style={styles.pulseDotCore} />
    </View>
  );
}

export default function PackageTransitScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuth();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  const [ride, setRide] = useState<RideData | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    socketService.connect();
    if (rideId) socketService.joinRide(rideId, 'customer', user?.id);

    const onDetails = (data: any) => {
      if (!data) return;
      if (rideId && data.id && data.id !== rideId) return;
      setRide(data);
    };

    const onCompleted = (data: any) => {
      if (rideId && data?.id && data.id !== rideId) return;
      console.log('Parcel delivered!');
      router.replace('/package-delivered');
    };

    socketService.on('ride_details', onDetails);
    socketService.on('ride_completed', onCompleted);

    return () => {
      socketService.off('ride_details', onDetails);
      socketService.off('ride_completed', onCompleted);
    };
  }, [router, rideId, user?.id]);

  const partnerName = ride?.partner?.name || 'Suresh Kumar';
  const partnerMeta = `${ride?.partner?.vehicleType || 'Two Wheeler'} \u2022 ${ride?.partner?.vehicleNumber || 'TN 07 BV 4120'}`;

  const handleShare = () => {
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="package-transit" title="Product Delivery Live Tracking" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Map Canvas */}
        <View style={styles.mapContainer}>
          <RealMap interactive style={styles.mapImage}>
            <View style={styles.mapOverlay} />

            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 390 360" preserveAspectRatio="xMidYMid slice">
              <Path d="M 72 260 C 130 250, 150 170, 220 160 C 270 152, 290 95, 320 65" stroke="#0033b1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.18} strokeWidth={8} />
              <Path d="M 72 260 C 130 250, 150 170, 220 160 C 270 152, 290 95, 320 65" stroke="#0033b1" strokeDasharray="6 4" strokeLinecap="round" strokeWidth={4} />
            </Svg>

            {/* Live Status Pill */}
            <View style={styles.livePill}>
              <View style={styles.liveDotWrap}>
                <View style={styles.liveDotPing} />
                <View style={styles.liveDot} />
              </View>
              <Text style={styles.livePillText}>Live Transit</Text>
            </View>

            {/* Map Controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity style={styles.controlBtn} activeOpacity={0.85}>
                <MaterialIcon name="my-location" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn} activeOpacity={0.85}>
                <MaterialIcon name="layers" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Pickup Waypoint */}
            <View style={styles.waypointPickup}>
              <View style={styles.waypointPill}>
                <MaterialIcon name="check-circle" size={12} color={colors.primaryContainer} />
                <Text style={styles.waypointPillText}>Greenways Rd</Text>
              </View>
              <View style={styles.waypointDot}>
                <View style={styles.waypointDotCore}>
                  <MaterialIcon name="inventory-2" size={10} color={colors.onPrimary} />
                </View>
              </View>
            </View>

            {/* Drop Waypoint */}
            <View style={styles.waypointDrop}>
              <View style={styles.waypointDropPill}>
                <Text style={styles.waypointDropText}>Indiranagar</Text>
              </View>
              <View style={styles.waypointDropDot}>
                <MaterialIcon name="location-on" size={16} color={colors.onPrimary} />
              </View>
            </View>

            {/* Moving Marker */}
            <BounceMarker />

            {/* ETA Pill */}
            <View style={styles.etaPill}>
              <View style={styles.etaIconWrap}>
                <MaterialIcon name="schedule" size={24} color={colors.primary} />
              </View>
              <View style={styles.etaTextCol}>
                <Text style={styles.etaLabel}>Estimated Arrival</Text>
                <Text style={styles.etaTitle} numberOfLines={1}>Delivering by 06:15 PM</Text>
              </View>
              <View style={styles.etaStats}>
                <Text style={styles.etaStatStrong}>14 mins left</Text>
                <Text style={styles.etaStatSub}>3.8 km</Text>
              </View>
            </View>
          </RealMap>
        </View>

        {/* Sliding Drawer Sheet */}
        <DraggableSheet>
          {/* Transit Tracking Stepper */}
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <Text style={styles.trackingTitle}>Transit Tracking</Text>
              <View style={styles.orderPill}>
                <Text style={styles.orderPillText}>Order #EM-89240</Text>
              </View>
            </View>

            <View style={styles.stepper}>
              <View style={styles.stepRail} />
              <View style={styles.stepRailFill} />

              <View style={styles.stepRow}>
                <View style={styles.stepDotDone}>
                  <MaterialIcon name="check" size={14} color={colors.onPrimary} />
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepTitle}>Package Picked Up</Text>
                  <Text style={styles.stepSub}>Greenways Road Hub</Text>
                </View>
                <Text style={styles.stepTime}>05:48 PM</Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepDotActive}>
                  <PulseDot />
                </View>
                <View style={styles.stepTextCol}>
                  <View style={styles.stepActiveTitleRow}>
                    <Text style={styles.stepActiveTitle}>On the Way</Text>
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>Live</Text>
                    </View>
                  </View>
                  <Text style={styles.stepSub}>Passing Adyar Bridge • Moving smoothly</Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepDotPending}>
                  <MaterialIcon name="pin-drop" size={14} color={colors.outline} />
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepTitlePending}>Arriving at Destination</Text>
                  <Text style={styles.stepSub}>14/B, Palm Meadows, Indiranagar</Text>
                </View>
                <Text style={styles.stepTimePending}>~ 06:15 PM</Text>
              </View>
            </View>
          </View>

          {/* Receiver Notification Card */}
          <View style={styles.receiverCard}>
            <View style={styles.receiverIconWrap}>
              <MaterialIcon name="mark-email-read" size={24} color={colors.primary} />
            </View>
            <View style={styles.receiverInfo}>
              <View style={styles.receiverNameRow}>
                <Text style={styles.receiverName} numberOfLines={1}>Priya Sharma</Text>
                <Text style={styles.receiverTag}>(Receiver)</Text>
              </View>
              <View style={styles.receiverNotifRow}>
                <View style={styles.greenDot} />
                <Text style={styles.receiverNotifText} numberOfLines={1}>
                  Notified via WhatsApp &amp; Live Tracking Link
                </Text>
              </View>
            </View>
          </View>

          {/* Partner Profile + Contact */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerLeft}>
              <View style={styles.partnerAvatarWrap}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80' }} style={styles.partnerAvatar} />
                <View style={styles.partnerStarBadge}>
                  <MaterialIcon name="star" size={12} color={colors.onPrimary} />
                </View>
              </View>
              <View style={styles.partnerInfo}>
                <View style={styles.partnerNameRow}>
                  <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
                  <Text style={styles.partnerRating}>★ 4.9</Text>
                </View>
                <Text style={styles.partnerMeta}>{partnerMeta}</Text>
              </View>
            </View>
            <View style={styles.partnerActions}>
              <TouchableOpacity style={styles.contactBtn} activeOpacity={0.85}>
                <MaterialIcon name="call" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactBtn} activeOpacity={0.85} onPress={() => { if (rideId) router.push(`/chat?rideId=${rideId}`); }}>
                <MaterialIcon name="chat" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Trust Badge */}
          <View style={styles.trustCard}>
            <View style={styles.trustIconWrap}>
              <MaterialIcon name="verified-user" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.trustInfo}>
              <View style={styles.trustTitleRow}>
                <Text style={styles.trustTitle}>Ematix SecureDelivery™</Text>
                <View style={styles.encryptedPill}>
                  <Text style={styles.encryptedPillText}>ENCRYPTED</Text>
                </View>
              </View>
              <Text style={styles.trustSub}>Live GPS tracking &amp; Tamper-proof OTP verification enabled</Text>
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.shareBtn} activeOpacity={0.97} onPress={handleShare}>
              {shareCopied ? (
                <MaterialIcon name="done" size={20} color={colors.onPrimary} />
              ) : (
                <MaterialIcon name="share" size={20} color={colors.onPrimary} />
              )}
              <Text style={styles.shareBtnText}>
                {shareCopied ? 'Tracking Link Copied!' : 'Share Live Tracking Link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.supportBtn}
              activeOpacity={0.9}
              onPress={() => Alert.alert('Support', 'Connecting to Ematix customer support...')}
            >
              <MaterialIcon name="support-agent" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.supportBtnText}>Report Issue / Customer Support</Text>
            </TouchableOpacity>
          </View>
        </DraggableSheet>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  mapContainer: {
    height: 400,
    width: '100%',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 33, 124, 0.12)',
  },
  livePill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  liveDotWrap: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDotPing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
    opacity: 0.5,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
  },
  livePillText: {
    ...type.labelSm,
    color: colors.accentRed,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  waypointPickup: {
    position: 'absolute',
    bottom: 84,
    left: 20,
    alignItems: 'center',
  },
  waypointPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  waypointPillText: {
    ...type.labelSm,
    color: colors.onSurface,
  },
  waypointDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  waypointDotCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waypointDrop: {
    position: 'absolute',
    top: 40,
    right: 20,
    alignItems: 'center',
  },
  waypointDropPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  waypointDropText: {
    ...type.labelSm,
    color: colors.accentRed,
    fontFamily: fonts.semibold,
  },
  waypointDropDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  markerWrap: {
    position: 'absolute',
    top: '44%',
    left: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -22,
    marginTop: -22,
  },
  markerHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  markerCore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPingBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.lightBlueTint,
  },
  markerStatusDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
  markerLabel: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markerLabelText: {
    ...type.labelSm,
    color: colors.onPrimary,
  },
  etaPill: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  etaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  etaTextCol: {
    flex: 1,
    minWidth: 0,
  },
  etaLabel: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  etaTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    fontSize: 16,
  },
  etaStats: {
    flexShrink: 0,
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  etaStatStrong: {
    ...type.labelMd,
    color: colors.primary,
  },
  etaStatSub: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  drawer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 20,
    gap: 16,
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderGray,
    alignSelf: 'center',
    marginBottom: 4,
  },
  trackingCard: {
    backgroundColor: colors.surfaceGray,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingTitle: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  orderPill: {
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  orderPillText: {
    ...type.labelSm,
    color: colors.primary,
  },
  stepper: {
    position: 'relative',
    gap: 16,
  },
  stepRail: {
    position: 'absolute',
    left: 19,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: colors.borderGray,
  },
  stepRailFill: {
    position: 'absolute',
    left: 19,
    top: 14,
    height: '52%',
    width: 2,
    backgroundColor: colors.primary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    zIndex: 1,
  },
  stepDotDone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextCol: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  stepSub: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 1,
  },
  stepTime: {
    ...type.bodySm,
    color: colors.textMuted,
    alignSelf: 'center',
  },
  stepDotActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  pulseDotCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  stepActiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepActiveTitle: {
    ...type.headlineSm,
    color: colors.primary,
    fontSize: 16,
  },
  liveBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  liveBadgeText: {
    ...type.labelSm,
    color: colors.onPrimary,
  },
  stepDotPending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitlePending: {
    ...type.labelMd,
    color: colors.textMuted,
  },
  stepTimePending: {
    ...type.labelSm,
    color: colors.textMuted,
    alignSelf: 'center',
  },
  receiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  receiverIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  receiverInfo: {
    flex: 1,
    minWidth: 0,
  },
  receiverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiverName: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  receiverTag: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  receiverNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  receiverNotifText: {
    ...type.bodySm,
    color: colors.textMuted,
    flex: 1,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceGray,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  partnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  partnerAvatarWrap: {
    position: 'relative',
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
  },
  partnerStarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInfo: {
    minWidth: 0,
    flex: 1,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerName: {
    ...type.labelLg,
    color: colors.onSurface,
    flexShrink: 1,
  },
  partnerRating: {
    ...type.labelSm,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  partnerMeta: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 1,
  },
  partnerActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  contactBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(234, 241, 255, 0.7)',
    padding: 14,
    borderRadius: 16,
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trustInfo: {
    flex: 1,
    minWidth: 0,
  },
  trustTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustTitle: {
    ...type.labelSm,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  encryptedPill: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  encryptedPillText: {
    ...type.labelSm,
    color: colors.onPrimaryFixedVariant,
    fontSize: 10,
  },
  trustSub: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  bottomActions: {
    gap: 8,
    paddingTop: 4,
  },
  shareBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  shareBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
  supportBtn: {
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surfaceGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportBtnText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
});