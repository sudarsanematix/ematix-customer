import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Linking from 'expo-linking';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import RealMap from '../components/RealMap';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/typography';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { telLink } from '../utils/phone';
import { setUnread, getUnread, clearUnread } from '../utils/unread';

type RideData = {
  id: string;
  status: string;
  type?: string;
  otp?: string | null;
  vehicleType?: string;
  pickup?: { address?: string } | null;
  dropoff?: { address?: string } | null;
  price?: number | string | null;
  startedAt?: string;
  partner?: {
    id: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    rating?: number | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting for partner',
  accepted: 'Partner on the way',
  en_route_pickup: 'Partner on the way',
  arrived: 'Partner has arrived',
  en_route_dropoff: 'On route to dropoff',
  completed: 'Ride completed',
  cancelled: 'Ride cancelled',
};

export default function ActiveRideScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuth();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [driverOffset] = useState(() => new Animated.Value(0));
  const [ride, setRide] = useState<RideData | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));
  const focusedRef = useRef(true);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(driverOffset, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(driverOffset, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [driverOffset]);

  useEffect(() => {
    socketService.connect();
    socketService.emit('join_ride', { rideId, role: 'customer', userId: user?.id });

    const handleDetails = (data: RideData | null) => {
      if (!data) {
        setUnavailable(true);
        return;
      }
      setRide(data);
      setHasUnread(getUnread(data.id));
      if (data.status === 'completed') {
        router.replace(`/ride-completed?rideId=${rideId}`);
      }
    };

    const handleCompleted = () => {
      router.replace(`/ride-completed?rideId=${rideId}`);
    };

    const handleStatus = (data: { rideId: string; status: string }) => {
      setRide((prev) => (prev ? { ...prev, status: data.status } : prev));
    };

    const handleStarted = (data: { rideId: string; status: string; startedAt?: string }) => {
      setRide((prev) => (prev ? { ...prev, status: data.status, startedAt: data.startedAt } : prev));
    };

    const handleIncoming = (data: any) => {
      if (data.rideId === rideId && data.sender === 'partner' && focusedRef.current) {
        setUnread(rideId, true);
        setHasUnread(true);
        pulse.setValue(0);
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
          ]),
          { iterations: 3 }
        ).start();
      }
    };

    const handleError = (data: { code: string; rideId?: string }) => {
      if (data.rideId === rideId && (data.code === 'ride_not_found' || data.code === 'unauthorized')) {
        setUnavailable(true);
      }
    };

    socketService.on('ride_details', handleDetails);
    socketService.on('ride_completed', handleCompleted);
    socketService.on('ride_status_updated', handleStatus);
    socketService.on('ride_started', handleStarted);
    socketService.on('receive_message', handleIncoming);
    socketService.on('ride_error', handleError);

    return () => {
      socketService.off('ride_details', handleDetails);
      socketService.off('ride_completed', handleCompleted);
      socketService.off('ride_status_updated', handleStatus);
      socketService.off('ride_started', handleStarted);
      socketService.off('receive_message', handleIncoming);
      socketService.off('ride_error', handleError);
    };
  }, [rideId, user?.id, router, pulse]);

  useFocusEffect(() => {
    focusedRef.current = true;
    return () => {
      focusedRef.current = false;
    };
  });

  const handleMapTap = () => {
    router.replace(`/ride-completed?rideId=${rideId}`);
  };

  const callPartner = () => {
    const url = telLink(ride?.partner?.phone);
    if (url) Linking.openURL(url).catch(() => {});
  };

  const openChat = () => {
    clearUnread(rideId);
    setHasUnread(false);
    router.push(`/chat?rideId=${rideId}`);
  };

  const initials = (ride?.partner?.name || 'Partner')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const statusLabel = ride ? STATUS_LABELS[ride.status] || 'Ride in progress' : 'Connecting...';
  const progress = ride
    ? ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'en_route_pickup' ? 20
      : ride.status === 'arrived' ? 50
      : ride.status === 'en_route_dropoff' ? 75
      : 100
    : 0;

  const markerX = driverOffset.interpolate({ inputRange: [0, 1], outputRange: [-50, -47] });
  const markerY = driverOffset.interpolate({ inputRange: [0, 1], outputRange: [-50, -48.5] });

  if (unavailable) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="active-ride" title="Active Ride Tracking" />
        <View style={styles.unavailableWrap}>
          <MaterialIcon name="error-outline" size={48} color={colors.textMuted} />
          <Text style={styles.unavailableTitle}>Ride not available</Text>
          <Text style={styles.unavailableText}>This ride is no longer available or you are not authorized to view it.</Text>
          <TouchableOpacity style={styles.unavailableBtn} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.unavailableBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="active-ride" title="Active Ride Tracking" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
        {/* Map Simulation Viewport */}
        <TouchableOpacity style={styles.mapContainer} onPress={handleMapTap} activeOpacity={1}>
          <RealMap interactive style={styles.mapImage}>
            {/* Stylized Map Gradient Overlay */}
            <LinearGradient
              colors={['rgba(0,33,124,0.2)', 'transparent', 'rgba(220,217,217,0.4)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Route Polyline */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 390 370">
              <Path
                d="M 96 112 C 140 130, 160 190, 210 215 C 248 235, 278 210, 310 262"
                opacity={0.45}
                stroke="#809ffe"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={8}
              />
              <Path
                d="M 96 112 C 140 130, 160 190, 210 215 C 248 235, 278 210, 310 262"
                stroke="#0033b1"
                strokeDasharray="6 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={4}
              />
              <Circle cx={96} cy={112} r={14} fill="#0033b1" fillOpacity={0.16} />
              <Circle cx={96} cy={112} r={6} fill="#00217c" />
              <Circle cx={96} cy={112} r={2.5} fill="#ffffff" />
              <Circle cx={310} cy={262} r={12} fill="#C52A2E" fillOpacity={0.2} />
              <Path
                d="M 310 248 C 304.5 248 300 252.5 300 258 C 300 266 310 274 310 274 C 310 274 320 266 320 258 C 320 252.5 315.5 248 310 248 Z"
                fill="#C52A2E"
              />
              <Circle cx={310} cy={257} r={3.5} fill="#ffffff" />
            </Svg>

            {/* Animated Live Driver Vehicle Marker */}
            <Animated.View
              style={[
                styles.driverMarkerWrap,
                { transform: [{ translateX: markerX }, { translateY: markerY }] },
              ]}
            >
              <View style={styles.driverPulseRing} />
              <View style={styles.driverHalo}>
                <View style={styles.driverInner}>
                  <MaterialIcon name="electric-rickshaw" size={19} color={colors.onPrimary} />
                </View>
              </View>
              <View style={styles.bearingBadge}>
                <MaterialIcon name="navigation" size={10} color={colors.onPrimary} />
              </View>
            </Animated.View>

            {/* Floating Top Trip Status Banner */}
            <View style={styles.statusBanner}>
              <View style={styles.statusInner}>
                <View style={styles.statusLeft}>
                  <View style={styles.shieldIconWrapper}>
                    <MaterialIcon name="shield" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.statusTextCol}>
                    <View style={styles.arrivingRow}>
                      <View style={styles.arrivingPulse} />
                      <Text style={styles.arrivingText} numberOfLines={1}>{statusLabel}</Text>
                    </View>
                    <Text style={styles.distanceText} numberOfLines={1}>
                      {ride?.partner?.name ? `${ride.partner.name} · ${ride.partner.vehicleModel || 'Partner'}` : 'Connecting to your partner'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Live Map Re-center Button */}
            <TouchableOpacity style={styles.recenterBtn} activeOpacity={0.7}>
              <MaterialIcon name="my-location" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </RealMap>
        </TouchableOpacity>

        {/* Bottom Sheet Live Tracking Drawer */}
        <View style={styles.bottomSheet}>
          <View style={styles.dragHandle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent} nestedScrollEnabled>
            {/* Trip Start PIN */}
            {ride?.otp && ride.status !== 'en_route_dropoff' && ride.status !== 'completed' ? (
              <View style={[styles.otpCard, ride?.status === 'arrived' ? styles.otpCardArrived : null]}>
                <View style={styles.otpCardTop}>
                  <View style={styles.otpCardIcon}>
                    <MaterialIcon name="pin" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.otpCardTitle}>Trip Start PIN</Text>
                </View>
                <Text style={styles.otpCardDigits}>{ride.otp.split('').join('  ')}</Text>
                <Text style={styles.otpCardHint}>
                  {ride?.status === 'arrived'
                    ? 'Your driver is here at pickup. Share this PIN to start the trip.'
                    : 'Share this PIN with your driver at pickup to start the trip.'}
                </Text>
              </View>
            ) : null}

            {/* Partner & Vehicle Profile */}
            <View style={styles.profileCard}>
              <View style={styles.profileLeft}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarInitials}>
                    <Text style={styles.avatarInitialsText}>{initials}</Text>
                  </View>
                </View>
                <View style={styles.profileTextCol}>
                  <Text style={styles.driverName} numberOfLines={1}>{ride?.partner?.name || 'Partner'}</Text>
                  {ride?.partner?.rating != null ? (
                    <View style={styles.statsRow}>
                      <View style={styles.ratingBadge}>
                        <MaterialIcon name="star" size={13} color={colors.onSurface} />
                        <Text style={styles.ratingText}>{ride.partner.rating}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.tripsText} numberOfLines={1}>
                      {ride?.partner?.phone ? `+91 ${ride.partner.phone.replace(/\d(?=\d{4})/g, '*')}` : 'Verified partner'}
                    </Text>
                  )}
                </View>
              </View>

              {ride?.partner?.vehicleNumber || ride?.partner?.vehicleModel ? (
                <View style={styles.vehicleMeta}>
                  <Text style={styles.plateText}>{ride?.partner?.vehicleNumber || '—'}</Text>
                  <Text style={styles.modelText}>{ride?.partner?.vehicleModel || 'Vehicle'}</Text>
                </View>
              ) : null}
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionBtnPrimary} activeOpacity={0.9} onPress={callPartner}>
                <MaterialIcon name="call" size={20} color={colors.primary} />
                <Text style={styles.actionLabel}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                activeOpacity={0.9}
                onPress={openChat}
              >
                {hasUnread && (
                  <View style={styles.unreadDotWrap}>
                    <Animated.View style={[styles.unreadRing, { opacity: ringOpacity, transform: [{ scale }] }]} />
                    <Animated.View style={[styles.unreadDotInner, { transform: [{ scale }] }]} />
                  </View>
                )}
                <MaterialIcon name="chat-bubble" size={20} color={colors.primary} />
                <Text style={styles.actionLabel}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnSecondary} activeOpacity={0.9}>
                <MaterialIcon name="share-location" size={20} color={colors.onSurfaceVariant} />
                <Text style={styles.actionLabelMuted}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnDanger} activeOpacity={0.9}>
                <MaterialIcon name="emergency" size={20} color={colors.accentRed} />
                <Text style={styles.actionLabelDanger}>Safety</Text>
              </TouchableOpacity>
            </View>

            {/* Journey Live Progress Section */}
            <View style={styles.journeyCard}>
              <View style={styles.journeyHeader}>
                <View style={styles.journeyHeaderLeft}>
                  <Text style={styles.journeyTitle}>Live Journey</Text>
                  <Text style={styles.journeyStatus}>• {statusLabel}</Text>
                </View>
                <View style={styles.journeyHeaderRight}>
                  <Text style={styles.distLeftText}>{progress === 100 ? 'Completed' : `${progress}%`}</Text>
                </View>
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>

              <View style={styles.waypointsRow}>
                <View style={styles.waypointCol}>
                  <View style={styles.waypointDotBlue} />
                  <View style={styles.waypointText}>
                    <Text style={styles.waypointLabel}>PICKUP</Text>
                    <Text style={styles.waypointValue} numberOfLines={1}>{ride?.pickup?.address || 'Pickup location'}</Text>
                  </View>
                </View>
                <View style={styles.waypointArrowWrap}>
                  <MaterialIcon name="arrow-forward" size={16} color={colors.outline} />
                </View>
                <View style={[styles.waypointCol, styles.waypointColRight]}>
                  <View style={[styles.waypointText, styles.waypointTextRight]}>
                    <Text style={styles.waypointLabel}>DROPOFF</Text>
                    <Text style={styles.waypointValue} numberOfLines={1}>{ride?.dropoff?.address || 'Dropoff location'}</Text>
                  </View>
                  <View style={styles.waypointDotRed} />
                </View>
              </View>
            </View>

            {/* Trip Fare Summary */}
            <View style={styles.fareSummary}>
              <View style={styles.fareLeft}>
                <View style={styles.walletIconWrapper}>
                  <MaterialIcon name="account-balance-wallet" size={16} color={colors.primary} />
                </View>
                <Text style={styles.paymentMethod}>Trip Fare</Text>
              </View>
              <View style={styles.fareRight}>
                <Text style={styles.fareAmount}>
                  {ride?.price != null
                    ? typeof ride.price === 'number'
                      ? `₹${ride.price}`
                      : String(ride.price)
                    : '—'}
                </Text>
                <Text style={styles.fareLabel}>Total Fare</Text>
              </View>
            </View>

            {/* Safety Badge Footer */}
            <View style={styles.safetyFooter}>
              <MaterialIcon name="lock" size={14} color={colors.outline} />
              <Text style={styles.safetyFooterText}>All rides are protected with 24/7 Ematix Safety Guard</Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
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
    height: 370,
    backgroundColor: colors.surfaceContainerHighest,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  driverMarkerWrap: {
    position: 'absolute',
    top: 172,
    left: 175,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverPulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(128, 159, 254, 0.4)',
  },
  driverHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  driverInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  bearingBadge: {
    position: 'absolute',
    top: 4,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  statusInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  shieldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statusTextCol: {
    flex: 1,
    minWidth: 0,
  },
  arrivingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrivingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  arrivingText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    flexShrink: 1,
  },
  distanceText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetContent: {
    gap: 16,
    paddingBottom: 8,
  },
  otpCard: {
    backgroundColor: colors.lightBlueTint,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  otpCardArrived: {
    backgroundColor: colors.primaryContainer,
  },
  otpCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otpCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  otpCardDigits: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 6,
    color: colors.onSurface,
  },
  otpCardHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.surfaceGray,
    padding: 12,
    borderRadius: 16,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  avatarInitials: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.onPrimary,
  },
  profileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  driverName: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurface,
  },
  tripsText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    flexShrink: 1,
  },
  vehicleMeta: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  plateText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  modelText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  actionBtnSecondary: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnDanger: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.errorContainer,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  unreadDotWrap: {
    position: 'absolute',
    top: 8,
    right: 18,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentRed,
  },
  unreadDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
  },
  actionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  actionLabelMuted: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  actionLabelDanger: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.accentRed,
  },
  journeyCard: {
    backgroundColor: colors.surfaceGray,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journeyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  journeyStatus: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  journeyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distLeftText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(217, 217, 217, 0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  waypointsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  waypointCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  waypointColRight: {
    justifyContent: 'flex-end',
    textAlign: 'right',
  },
  waypointDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
    flexShrink: 0,
  },
  waypointDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
    marginTop: 4,
    flexShrink: 0,
  },
  waypointText: {
    flex: 1,
    minWidth: 0,
  },
  waypointTextRight: {
    alignItems: 'flex-end',
  },
  waypointLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  waypointValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  waypointArrowWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  fareSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethod: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  fareRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  fareAmount: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },
  fareLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  safetyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 8,
    borderRadius: 12,
  },
  safetyFooterText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  unavailableWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  unavailableTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
    textAlign: 'center',
  },
  unavailableText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  unavailableBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  unavailableBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onPrimary,
  },
});