import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import LiveMap, {
  type LiveMapHandle,
  type LiveVehicle,
  type LiveVehicleKind,
  type LngLat,
  type LivePin,
} from '../components/LiveMap';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme, type MapThemeTokens } from '../theme/mapTheme';
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
  pickup?: { address?: string; lat?: number; lng?: number } | null;
  dropoff?: { address?: string; lat?: number; lng?: number } | null;
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
  const { colors, isDark } = useTheme();
  const mapTheme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const styles = createStyles(colors, mapTheme);
  const router = useRouter();
  const { user } = useAuth();
  const { rideId, vehicle } = useLocalSearchParams<{ rideId: string, vehicle?: string }>();
  const [ride, setRide] = useState<RideData | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));
  const focusedRef = useRef(true);

  const [driver, setDriver] = useState<LiveVehicle | null>(null);
  const [follow, setFollow] = useState(true);
  const [routeCoords, setRouteCoords] = useState<LngLat[]>([]);
  const mapRef = useRef<LiveMapHandle | null>(null);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] });

  const getVehicleKind = (v: string | undefined): LiveVehicleKind => {
    if (!v) return 'bike';
    const lower = v.toLowerCase();
    if (lower === 'car' || lower.includes('car') || lower.includes('premium') || lower.includes('taxi') || lower.includes('sedan')) return 'car';
    if (lower === 'auto' || lower.includes('auto')) return 'auto';
    return 'bike';
  };
  const vehicleKind: LiveVehicleKind = getVehicleKind(vehicle || ride?.vehicleType);

  const getLocCoords = (loc: any) => {
    if (!loc) return null;
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      return [parsedLng, parsedLat] as LngLat;
    }
    return null;
  };

  const pickupCoords = useMemo(() => getLocCoords(ride?.pickup), [ride?.pickup]);
  const dropoffCoords = useMemo(() => getLocCoords(ride?.dropoff), [ride?.dropoff]);

  const driverKey = driver ? `${driver.lngLat[0].toFixed(3)},${driver.lngLat[1].toFixed(3)}` : 'none';

  // Dynamic route fetching based on ride phase and driver location
  useEffect(() => {
    if (!ride?.status || !pickupCoords || !dropoffCoords) return;

    let start: LngLat, end: LngLat;
    const toPickup = ['pending', 'accepted', 'en_route_pickup'].includes(ride.status);
    if (toPickup) {
      start = driver ? driver.lngLat : pickupCoords;   // no driver yet: show pickup -> dropoff
      end = driver ? pickupCoords : dropoffCoords;
    } else {
      start = driver ? driver.lngLat : pickupCoords;
      end = dropoffCoords;
    }

    let cancelled = false;
    (async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${process.env.EXPO_PUBLIC_MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (!cancelled && coords?.length) setRouteCoords(coords);
        else if (!coords) console.warn('Directions failed', data.code, data.message);
      } catch (e) {
        console.warn('Route fetch failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [ride?.status, pickupCoords, dropoffCoords, driverKey]);

  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasNavigated.current) return;
    if (ride?.status === 'completed') {
      hasNavigated.current = true;
      if (ride.type === 'parcel') {
        router.replace(`/package-delivered?rideId=${rideId}`);
      } else {
        router.replace(`/ride-completed?rideId=${rideId}`);
      }
    } else if (ride?.status === 'cancelled') {
      hasNavigated.current = true;
      Alert.alert('Ride Cancelled', 'This ride has been cancelled.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } else if (ride?.status === 'pending') {
      hasNavigated.current = true;
      const navigateToFinding = () => {
        const params = new URLSearchParams({
          rideId: rideId || '',
          vehicle: ride.vehicleType || vehicle || '',
          pLat: ride.pickup?.lat?.toString() || '',
          pLng: ride.pickup?.lng?.toString() || '',
          pickup: ride.pickup?.address || '',
          dropoff: ride.dropoff?.address || '',
          price: ride.price?.toString() || '',
        }).toString();
        router.replace(`/finding-driver?${params}`);
      };

      if ((ride as any).isReassigned) {
        Alert.alert('Finding New Driver', 'The previous partner cancelled. Searching for a new partner.', [
          { text: 'OK', onPress: navigateToFinding }
        ]);
      } else {
        navigateToFinding();
      }
    }
  }, [ride?.status, ride?.type, rideId, router]);

  useEffect(() => {
    socketService.connect();
    if (rideId) {
      socketService.joinRide(rideId, 'customer', user?.id);
    }

    const handleDetails = (data: RideData | null) => {
      if (!data) {
        setUnavailable(true);
        return;
      }
      if (data.id !== rideId) return; // Ignore stale snapshot, don't crash the active one

      setRide((prev) => {
        if (
          prev?.status === 'completed' ||
          prev?.status === 'cancelled'
        ) {
          return prev;
        }

        return data;
      });
      setHasUnread(getUnread(data.id));
    };

    const handleCompleted = (data: any) => {
      if (!data || !data.id || data.id !== rideId) return;
      setRide((prev) => (prev ? { ...prev, status: 'completed' } : prev));
    };

    const handleCancelled = (data: { rideId: string; reason: string }) => {
      if (!data || !data.rideId || data.rideId !== rideId) return;
      setRide((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    };

    const handleStatus = (data: { rideId: string; status: string }) => {
      if (!data || !data.rideId || data.rideId !== rideId) return;

      setRide((prev) => {
        if (!prev) return prev;
        if (prev.status === 'completed' || prev.status === 'cancelled') return prev; // Do not exit terminal states

        const order = ['pending', 'accepted', 'en_route_pickup', 'arrived', 'en_route_dropoff', 'completed', 'cancelled'];
        const currentIdx = order.indexOf(prev.status);
        const newIdx = order.indexOf(data.status);

        const isReassignment = data.status === 'pending' && currentIdx > 0;
        if (currentIdx !== -1 && newIdx !== -1 && newIdx < currentIdx && !isReassignment) {
          return prev; // Ignore older status
        }
        return { ...prev, status: data.status, ...(isReassignment ? { isReassigned: true } : null) };
      });
    };

    const handleStarted = (data: { rideId: string; status: string; startedAt?: string }) => {
      if (!data || !data.rideId || data.rideId !== rideId) return;
      setRide((prev) => {
        if (!prev) return prev;
        if (prev.status === 'completed' || prev.status === 'cancelled') return prev; // Do not exit terminal states
        // Prevent backward transition
        const order = ['pending', 'accepted', 'en_route_pickup', 'arrived', 'en_route_dropoff', 'completed', 'cancelled'];
        if (order.indexOf(prev.status) > order.indexOf(data.status)) return prev;
        return { ...prev, status: data.status, startedAt: data.startedAt };
      });
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

    // The partner streams their real position while the ride is live. The
    // server only forwards this to sockets in this ride's room, so no other
    // customer can receive it.
    const handleDriverLocation = (data: {
      rideId: string;
      lat: number;
      lng: number;
      bearing?: number | null;
    }) => {
      if (data.rideId !== rideId) return;
      if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return;
      setDriver((prev) => ({
        lngLat: [data.lng, data.lat],
        bearing: typeof data.bearing === 'number' ? data.bearing : prev?.bearing,
        kind: vehicleKind,
      }));
    };

    socketService.on('ride_details', handleDetails);
    socketService.on('ride_completed', handleCompleted);
    socketService.on('ride_cancelled', handleCancelled);
    socketService.on('ride_status_updated', handleStatus);
    socketService.on('ride_started', handleStarted);
    socketService.on('receive_message', handleIncoming);
    socketService.on('ride_error', handleError);
    socketService.on('driver_location', handleDriverLocation);

    return () => {
      socketService.off('ride_details', handleDetails);
      socketService.off('ride_completed', handleCompleted);
      socketService.off('ride_cancelled', handleCancelled);
      socketService.off('ride_status_updated', handleStatus);
      socketService.off('ride_started', handleStarted);
      socketService.off('receive_message', handleIncoming);
      socketService.off('ride_error', handleError);
      socketService.off('driver_location', handleDriverLocation);
    };
  }, [rideId, user?.id, router, pulse, vehicleKind]);

  useFocusEffect(() => {
    focusedRef.current = true;
    return () => {
      focusedRef.current = false;
    };
  });

  const handleMapTap = () => {
    if (ride?.type === 'parcel') {
      router.replace(`/package-delivered?rideId=${rideId}`);
    } else {
      router.replace(`/ride-completed?rideId=${rideId}`);
    }
  };

  /**
   * Re-arms follow mode. The map engine turns follow off by itself as soon as
   * the user pans, so this has to re-enable it on both sides — otherwise the
   * `follow` prop and the engine disagree and the button appears to do nothing.
   */
  const recenter = () => {
    setFollow(true);
    mapRef.current?.focusVehicle();
  };

  const callPartner = () => {
    const url = telLink(ride?.partner?.phone);
    if (url) Linking.openURL(url).catch(() => { });
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

  const getStatusLabel = (r: RideData) => {
    if (r.type === 'parcel') {
      if (r.status === 'pending') return 'Finding a delivery partner';
      if (r.status === 'accepted' || r.status === 'en_route_pickup') return 'Partner on the way to pick up package';
      if (r.status === 'arrived') return 'Partner arrived for pickup';
      if (r.status === 'en_route_dropoff') return 'Package in transit to receiver';
      if (r.status === 'completed') return 'Package delivered';
      if (r.status === 'cancelled') return 'Delivery cancelled';
      return 'Delivery in progress';
    }
    return STATUS_LABELS[r.status] || 'Ride in progress';
  };

  const statusLabel = ride ? getStatusLabel(ride) : 'Connecting...';
  const progress = ride
    ? ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'en_route_pickup' ? 20
      : ride.status === 'arrived' ? 50
        : ride.status === 'en_route_dropoff' ? 75
          : 100
    : 0;

  const pins: LivePin[] = useMemo(() => {
    const arr: LivePin[] = [];
    if (pickupCoords && ride?.status !== 'en_route_dropoff' && ride?.status !== 'completed') {
      arr.push({ id: 'pickup', lngLat: pickupCoords, color: '#4285F4', variant: 'dot' });
    }
    if (dropoffCoords) {
      arr.push({ id: 'dropoff', lngLat: dropoffCoords, color: mapTheme.success, variant: 'end' });
    }
    return arr;
  }, [pickupCoords, dropoffCoords, ride?.status, mapTheme]);

  const route = useMemo(
    () => (routeCoords.length > 0 ? { coordinates: routeCoords } : null),
    [routeCoords]
  );

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
        {/* Live Map Viewport — real Mapbox canvas driven by the command bridge */}
        <View style={styles.mapContainer}>
          <LiveMap
            ref={mapRef}
            interactive
            style={styles.mapImage}
            vehicle={driver}
            follow={false}
            route={route}
            pins={pins}
            onPress={handleMapTap}
            onUserMove={() => setFollow(false)}
            onError={(message) => console.warn('[LiveMap]', message)}
          >

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
                      {ride?.partner?.name ? `${ride.partner.name} · ${ride.partner.vehicleModel || (vehicleKind === 'car' ? 'Economic Car' : 'Ematix Auto')}` : 'Connecting to your partner'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Live Map Re-center Button */}
            <TouchableOpacity style={styles.recenterBtn} activeOpacity={0.7} onPress={recenter}>
              <MaterialIcon name="my-location" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </LiveMap>
        </View>

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
                  <Text style={styles.otpCardTitle}>{ride?.type === 'parcel' ? 'Sender Pickup PIN' : 'Trip Start PIN'}</Text>
                </View>
                <Text style={styles.otpCardDigits}>{ride.otp.split('').join('  ')}</Text>
                <Text style={styles.otpCardHint}>
                  {ride?.type === 'parcel'
                    ? (ride?.status === 'arrived' ? 'Your driver is here. Share this PIN to hand over the package.' : 'Share this PIN with your driver to hand over the package.')
                    : (ride?.status === 'arrived'
                      ? 'Your driver is here at pickup. Share this PIN to start the trip.'
                      : 'Share this PIN with your driver at pickup to start the trip.')}
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
                  <Text style={styles.modelText}>{ride?.partner?.vehicleModel || (vehicleKind === 'car' ? 'Economic Car' : 'Ematix Auto')}</Text>
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

const createStyles = (colors: any, mapTheme: MapThemeTokens) => StyleSheet.create({
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
    backgroundColor: mapTheme.tintPanelTrack,
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
    backgroundColor: mapTheme.glass,
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
    backgroundColor: mapTheme.glass,
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
    backgroundColor: colors.surfaceContainerHighest,
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