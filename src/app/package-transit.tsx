import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Easing, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import LiveMap, { type LiveMapHandle, type LiveVehicle, type LngLat, type LivePin } from '../components/LiveMap';
import DraggableSheet from '../components/DraggableSheet';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme, type MapThemeTokens } from '../theme/mapTheme';
import { fonts, type } from '../theme/typography';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { telLink } from '../utils/phone';

type RideData = {
  id?: string;
  type?: string;
  status?: string;
  otp?: string | null;
  vehicleType?: string;
  price?: number | string | null;
  pickup?: { address?: string; lat?: number; lng?: number } | null;
  dropoff?: { address?: string; lat?: number; lng?: number } | null;
  packageDetails?: {
    category?: string;
    weightTier?: string;
    fragile?: boolean;
    receiverName?: string;
    receiverPhone?: string;
    notes?: string;
  } | null;
  partner?: {
    id?: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    rating?: number | null;
  } | null;
  createdAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  receiverOtp?: string;
};

// An env override wins; the LAN address stays as the dev fallback until the
// shared `utils/api.ts` layer from the roadmap lands.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.34:4000';

const fmtTime = (value?: string | number | null): string => {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const initialsOf = (name?: string | null): string => {
  if (!name) return 'P';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] ? w[0].toUpperCase() : ''))
      .join('') || 'P'
  );
};

// Rail fill per status, following the order the three steps are drawn in.
const RAIL_PCT: Record<string, number> = {
  pending: 8,
  accepted: 20,
  en_route_pickup: 35,
  arrived: 50,
  en_route_dropoff: 72,
  completed: 100,
};

function BounceMarker() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, buildMapTheme(isDark));
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
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, buildMapTheme(isDark));
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
  const { colors, isDark } = useTheme();
  const mapTheme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const styles = createStyles(colors, mapTheme);
  const router = useRouter();
  const { user, token } = useAuth();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  const [ride, setRide] = useState<RideData | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const [driver, setDriver] = useState<LiveVehicle | null>(null);
  const [follow, setFollow] = useState(true);
  const [routeCoords, setRouteCoords] = useState<LngLat[]>([]);
  const [etaAt, setEtaAt] = useState<number | null>(null);
  const [etaMeters, setEtaMeters] = useState<number | null>(null);
  const [lastFixAt, setLastFixAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const mapRef = useRef<LiveMapHandle | null>(null);

  // Drives the ETA countdown and the "live GPS" freshness check without
  // re-rendering the map every second.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const getLocCoords = (loc: any) => {
    if (!loc) return null;
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) return [parsedLng, parsedLat] as LngLat;
    return null;
  };

  const pickupCoords = useMemo(() => getLocCoords(ride?.pickup), [ride?.pickup]);
  const dropoffCoords = useMemo(() => getLocCoords(ride?.dropoff), [ride?.dropoff]);
  const driverKey = driver ? `${driver.lngLat[0].toFixed(3)},${driver.lngLat[1].toFixed(3)}` : 'none';

  useEffect(() => {
    if (!ride?.status || !pickupCoords || !dropoffCoords) return;
    if (ride.status === 'completed' || ride.status === 'cancelled') return;

    const toPickup = ['pending', 'accepted', 'en_route_pickup'].includes(ride.status);
    const start: LngLat = driver ? driver.lngLat : pickupCoords;
    const end: LngLat = toPickup && driver ? pickupCoords : dropoffCoords;
    if (start[0] === end[0] && start[1] === end[1]) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${process.env.EXPO_PUBLIC_MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        const route = data.routes?.[0];
        if (route?.geometry?.coordinates?.length) setRouteCoords(route.geometry.coordinates);
        else console.warn('Directions failed', data.code, data.message);

        // The arrival clock only means something on the driver -> dropoff leg.
        // The pre-pickup leg's duration is time to the *pickup*, so showing it
        // as the delivery ETA would be wrong.
        if (ride.status === 'en_route_dropoff' && typeof route?.duration === 'number') {
          setEtaAt(Date.now() + route.duration * 1000);
          setEtaMeters(typeof route.distance === 'number' ? route.distance : null);
        } else {
          setEtaAt(null);
          setEtaMeters(null);
        }
      } catch (e) {
        console.warn('Route fetch failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [ride?.status, pickupCoords, dropoffCoords, driverKey]);

  // Socket-free fallback: a cold open, a rejoin after a server restart or a
  // dropped connection still paints the real ride instead of an empty sheet.
  useEffect(() => {
    if (!rideId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rides/${rideId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 403 || res.status === 404) {
          if (!cancelled) setUnavailable(true);
          return;
        }
        if (!res.ok) return;
        // The endpoint returns the serialized ride directly (see
        // GET /api/rides/:rideId), same shape ride-completed.tsx consumes.
        const data: RideData | null = await res.json();
        if (cancelled || !data) return;
        // Live socket data always wins over the REST snapshot.
        setRide((prev) => prev ?? data);
        if (data.status === 'completed' || data.status === 'cancelled') {
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            if (data.status === 'completed') router.replace(`/package-delivered?rideId=${rideId}`);
            else router.replace(`/(tabs)/home`);
          }
        }
      } catch (e) {
        console.warn('Ride REST fallback failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [rideId, token, router]);

  const hasNavigated = useRef(false);

  useEffect(() => {
    socketService.connect();
    if (rideId) socketService.joinRide(rideId, 'customer', user?.id);


    const onDetails = (data: any) => {
      if (!data || !data.id || String(data.id) !== String(rideId)) {
        return;
      }

      // Don't overwrite a terminal state with an older snapshot.
      setRide((prev) => {
        if (
          prev?.status === 'completed' ||
          prev?.status === 'cancelled'
        ) {
          return prev;
        }

        return data;
      });

      // Navigate when the server confirms a terminal status.
      if (
        data.status === 'completed' ||
        data.status === 'cancelled'
      ) {
        if (hasNavigated.current) return;

        hasNavigated.current = true;

        if (data.status === 'completed') {
          router.replace(`/package-delivered?rideId=${rideId}`);
        } else {
          router.replace('/(tabs)/home');
        }
      }
    };


    const onCompleted = (data: any) => {
      if (!data || !data.id || data.id !== rideId) return;
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace(`/package-delivered?rideId=${rideId}`);
    };

    const onCancelled = (data: any) => {
      if (!data || !data.rideId || data.rideId !== rideId) return;
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      setRide((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      Alert.alert('Ride Cancelled', 'The delivery was cancelled by the partner.');
      router.replace(`/(tabs)/home`);
    };

    // Guarded by rideId: the room is shared with the partner app, so a stale
    // ride's status must never rewrite this screen.

    const onStatus = (data: any) => {
      if (!data || !data.rideId || String(data.rideId) !== String(rideId)) {
        return;
      }

      // Calculate reassignment from the current rendered ride BEFORE setRide.
      const currentOrder = [
        'pending',
        'accepted',
        'en_route_pickup',
        'arrived',
        'en_route_dropoff',
        'completed',
        'cancelled',
      ];

      const currentStatus = ride?.status ?? '';
      const currentIndex = currentOrder.indexOf(currentStatus);

      const isReassignment =
        data.status === 'pending' && currentIndex > 0;

      setRide((prev) => {
        if (!prev) return prev;

        // Never overwrite a terminal state.
        if (
          prev.status === 'completed' ||
          prev.status === 'cancelled'
        ) {
          return prev;
        }

        const order = [
          'pending',
          'accepted',
          'en_route_pickup',
          'arrived',
          'en_route_dropoff',
          'completed',
          'cancelled',
        ];

        const prevIndex = order.indexOf(prev.status ?? '');
        const nextIndex = order.indexOf(data.status ?? '');

        if (
          prevIndex !== -1 &&
          nextIndex !== -1 &&
          nextIndex < prevIndex &&
          !isReassignment
        ) {
          return prev;
        }

        return {
          ...prev,
          status: data.status ?? prev.status,
          ...(data.arrivedAt ? { arrivedAt: data.arrivedAt } : {}),
          ...(isReassignment ? { isReassigned: true } : {}),
        };
      });

      if (isReassignment) {
        if (hasNavigated.current) return;

        hasNavigated.current = true;

        Alert.alert(
          'Re-assigning',
          'The previous partner cancelled. Searching for a new partner.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace(`/finding-driver?rideId=${rideId}`);
              },
            },
          ]
        );
      }
    };


    const onStarted = (data: any) => {
      if (!data || !data.rideId || data.rideId !== rideId) return;
      setRide((prev) => {
        if (!prev) return prev;
        if (prev.status === 'completed' || prev.status === 'cancelled') return prev; // Do not exit terminal states

        const order = ['pending', 'accepted', 'en_route_pickup', 'arrived', 'en_route_dropoff', 'completed', 'cancelled'];
        const currentIdx = order.indexOf(prev.status ?? '');
        const newIdx = order.indexOf(data.status ?? 'en_route_dropoff');
        if (currentIdx !== -1 && newIdx !== -1 && newIdx < currentIdx) {
          return prev;
        }
        return {
          ...prev,
          status: data.status ?? prev.status,
          ...(data.startedAt ? { startedAt: data.startedAt } : null),
        };
      });
    };

    const onError = (data: { code: string; rideId?: string }) => {
      if (data?.rideId === rideId && (data.code === 'ride_not_found' || data.code === 'unauthorized')) {
        setUnavailable(true);
      }
    };

    const onDriverLocation = (data: any) => {
      if (data.rideId !== rideId) return;
      if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return;
      setLastFixAt(Date.now());
      setDriver((prev) => ({
        lngLat: [data.lng, data.lat],
        bearing: typeof data.bearing === 'number' ? data.bearing : prev?.bearing,
        kind: 'auto',
      }));
    };

    socketService.on('ride_details', onDetails);
    socketService.on('ride_status_updated', onStatus);
    socketService.on('ride_started', onStarted);
    socketService.on('ride_completed', onCompleted);
    socketService.on('ride_cancelled', onCancelled);
    socketService.on('ride_error', onError);
    socketService.on('driver_location', onDriverLocation);

    return () => {
      socketService.off('ride_details', onDetails);
      socketService.off('ride_status_updated', onStatus);
      socketService.off('ride_started', onStarted);
      socketService.off('ride_completed', onCompleted);
      socketService.off('ride_cancelled', onCancelled);
      socketService.off('ride_error', onError);
      socketService.off('driver_location', onDriverLocation);
    };
  }, [router, rideId, user?.id]);

  const pins: LivePin[] = useMemo(() => {
    const arr: LivePin[] = [];
    if (pickupCoords && ride?.status !== 'en_route_dropoff' && ride?.status !== 'completed') {
      arr.push({ id: 'pickup', lngLat: pickupCoords, color: mapTheme.routeDone, variant: 'dot' });
    }
    if (dropoffCoords) {
      arr.push({ id: 'dropoff', lngLat: dropoffCoords, color: mapTheme.success, variant: ride?.status === 'en_route_dropoff' ? 'dot' : 'end' });
    }
    return arr;
  }, [pickupCoords, dropoffCoords, ride?.status, mapTheme]);

  const status = ride?.status;
  const orderRef = (ride?.id || rideId || '').slice(-6).toUpperCase();
  const collected = !!ride?.startedAt || status === 'en_route_dropoff' || status === 'completed';
  const delivered = status === 'completed';
  const railFillPct = `${RAIL_PCT[status ?? ''] ?? 0}%` as `${number}%`;
  const gpsLive = lastFixAt != null && now - lastFixAt < 60000;
  const remainingMins = etaAt != null ? Math.max(1, Math.ceil((etaAt - now) / 60000)) : null;
  const etaKm = etaMeters != null ? (etaMeters / 1000).toFixed(1) : null;

  const receiverName = ride?.packageDetails?.receiverName || 'Receiver';
  const receiverPhone = ride?.packageDetails?.receiverPhone;
  const receiverNotes = ride?.packageDetails?.notes;

  const partnerName = ride?.partner?.name || 'Delivery partner';
  const partnerMeta = [ride?.partner?.vehicleType, ride?.partner?.vehicleModel, ride?.partner?.vehicleNumber]
    .filter(Boolean)
    .join(' \u2022 ');

  const transitSub = delivered
    ? `Delivered to ${receiverName}${ride?.completedAt ? ` at ${fmtTime(ride.completedAt)}` : ''}`
    : status === 'en_route_dropoff'
      ? remainingMins != null
        ? `${remainingMins} min left${etaKm ? ` \u2022 ${etaKm} km` : ''} to ${receiverName}`
        : 'Moving towards dropoff'
      : status === 'arrived'
        ? `Waiting at ${ride?.pickup?.address || 'pickup'} for PIN handover`
        : status === 'accepted' || status === 'en_route_pickup'
          ? `Heading to ${ride?.pickup?.address || 'pickup'}`
          : 'Waiting for a partner';

  // Only claims what actually happened: the PIN is verified by the server
  // before `startedAt` exists, and "live" is gated on a recent GPS fix.
  const trustSub = delivered
    ? `Delivered${ride?.completedAt ? ` at ${fmtTime(ride.completedAt)}` : ''}`
    : collected
      ? `Pickup PIN verified${ride?.startedAt ? ` at ${fmtTime(ride.startedAt)}` : ''} \u2022 ${gpsLive ? 'Live GPS tracking' : 'Awaiting live GPS from partner'
      }`
      : 'PIN verification at pickup \u2022 Live GPS tracking';

  // LiveMap re-sends `setRoute` whenever this prop's identity changes, so it
  // must not be rebuilt on every render.
  const routeProp = useMemo(
    () => (routeCoords.length > 0 ? { coordinates: routeCoords } : null),
    [routeCoords]
  );

  const callPartner = () => {
    const url = telLink(ride?.partner?.phone);
    if (url) {
      Linking.openURL(url).catch(() => { });
      return;
    }
    Alert.alert('No number available', 'The delivery partner phone number is not available yet.');
  };

  const handleShare = async () => {
    if (!rideId) return;
    // Deep link back into this screen: it opens the app where installed, which
    // is as far as a share can reach without a hosted tracking page.
    const url = Linking.createURL('/package-transit', { queryParams: { rideId } });
    try {
      const result = await Share.share({
        message: `Track my Ematix Go delivery${orderRef ? ` (Order #${orderRef})` : ''}: ${url}`,
        title: 'Ematix Go Live Tracking',
      });
      if (result.action === Share.sharedAction) {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2200);
      }
    } catch (e) {
      console.warn('Share failed', e);
    }
  };

  if (unavailable) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="package-transit" title="Product Delivery Live Tracking" />
        <View style={styles.unavailableWrap}>
          <MaterialIcon name="error-outline" size={48} color={colors.textMuted} />
          <Text style={styles.unavailableTitle}>Delivery not available</Text>
          <Text style={styles.unavailableText}>
            This delivery is no longer available or you are not authorized to view it.
          </Text>
          <TouchableOpacity style={styles.unavailableBtn} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.unavailableBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="package-transit" title="Product Delivery Live Tracking" />

      <View style={{ flex: 1 }}>
        {/* Map Canvas */}
        <View style={StyleSheet.absoluteFill}>
          <LiveMap
            ref={mapRef}
            interactive
            style={styles.mapImage}
            vehicle={driver}
            follow={follow}
            route={routeProp}
            pins={pins}
            onUserMove={() => setFollow(false)}
          >
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
              <TouchableOpacity style={styles.controlBtn} activeOpacity={0.85} onPress={() => { setFollow(true); mapRef.current?.focusVehicle(); }}>
                <MaterialIcon name="my-location" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn} activeOpacity={0.85}>
                <MaterialIcon name="layers" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* ETA Pill */}
            <View style={styles.etaPill}>
              <View style={styles.etaIconWrap}>
                <MaterialIcon name="schedule" size={24} color={colors.primary} />
              </View>
              <View style={styles.etaTextCol}>
                <Text style={styles.etaLabel}>
                  {etaAt ? `Estimated Arrival \u2022 ~${fmtTime(etaAt)}` : 'Estimated Arrival'}
                </Text>
                <Text style={styles.etaTitle} numberOfLines={1}>
                  {status === 'pending' || status === 'accepted' ? 'Connecting to partner'
                    : status === 'en_route_pickup' ? 'Partner on the way to pickup'
                      : status === 'arrived' ? 'Partner arrived at pickup'
                        : status === 'completed' ? 'Delivered'
                          : 'Delivering shortly'}
                </Text>
              </View>
              <View style={styles.etaStats}>
                <Text style={styles.etaStatStrong}>
                  {remainingMins != null ? `${remainingMins} min` : status === 'en_route_dropoff' ? 'In transit' : '\u2014'}
                </Text>
              </View>
            </View>
          </LiveMap>
        </View>

        {/* Sliding Drawer Sheet */}
        <DraggableSheet>
          {/* Transit Tracking Stepper */}
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <Text style={styles.trackingTitle}>Transit Tracking</Text>
              <View style={styles.orderPill}>
                <Text style={styles.orderPillText}>Order #{orderRef || '\u2014'}</Text>
              </View>
            </View>

            <View style={styles.stepper}>
              <View style={styles.stepRail} />
              <View style={[styles.stepRailFill, { height: railFillPct }]} />

              <View style={styles.stepRow}>
                {collected ? (
                  <View style={styles.stepDotDone}>
                    <MaterialIcon name="check" size={14} color={colors.onPrimary} />
                  </View>
                ) : (
                  <View style={styles.stepDotActive}>
                    <PulseDot />
                  </View>
                )}
                <View style={styles.stepTextCol}>
                  <Text style={collected ? styles.stepTitle : styles.stepTitlePending}>
                    {collected ? 'Package Picked Up' : 'Awaiting Pickup'}
                  </Text>
                  <Text style={styles.stepSub} numberOfLines={1}>
                    {ride?.pickup?.address || 'Pickup location'}
                  </Text>
                </View>
                <Text style={styles.stepTime}>{collected ? fmtTime(ride?.startedAt) : ''}</Text>
              </View>

              <View style={styles.stepRow}>
                {delivered ? (
                  <View style={styles.stepDotDone}>
                    <MaterialIcon name="check" size={14} color={colors.onPrimary} />
                  </View>
                ) : collected ? (
                  <View style={styles.stepDotActive}>
                    <PulseDot />
                  </View>
                ) : (
                  <View style={styles.stepDotPending}>
                    <MaterialIcon name="local-shipping" size={14} color={colors.outline} />
                  </View>
                )}
                <View style={styles.stepTextCol}>
                  <View style={styles.stepActiveTitleRow}>
                    <Text style={collected && !delivered ? styles.stepActiveTitle : styles.stepTitlePending}>
                      On the Way
                    </Text>
                    {collected && !delivered && gpsLive ? (
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>Live</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.stepSub} numberOfLines={2}>{transitSub}</Text>
                </View>
              </View>

              <View style={styles.stepRow}>
                <View style={delivered ? styles.stepDotDone : styles.stepDotPending}>
                  <MaterialIcon
                    name={delivered ? 'check' : 'pin-drop'}
                    size={14}
                    color={delivered ? colors.onPrimary : colors.outline}
                  />
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={delivered ? styles.stepTitle : styles.stepTitlePending}>
                    {delivered ? 'Delivered' : 'Arriving at Destination'}
                  </Text>
                  <Text style={styles.stepSub} numberOfLines={1}>
                    {ride?.dropoff?.address || 'Dropoff location'}
                  </Text>
                </View>
                <Text style={styles.stepTimePending}>
                  {delivered ? fmtTime(ride?.completedAt) : etaAt ? `~ ${fmtTime(etaAt)}` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Receiver Contact & OTP Card */}
          <View style={styles.receiverCard}>
            <View style={styles.receiverIconWrap}>
              <MaterialIcon name="call" size={24} color={colors.primary} />
            </View>
            <View style={styles.receiverInfo}>
              <View style={styles.receiverNameRow}>
                <Text style={styles.receiverName} numberOfLines={1}>{receiverName}</Text>
                <Text style={styles.receiverTag}>(Receiver)</Text>
              </View>
              <View style={styles.receiverNotifRow}>
                <Text style={styles.receiverNotifText} numberOfLines={2}>
                  {receiverPhone ? `Contact: ${receiverPhone}` : 'No receiver contact provided'}
                  {receiverNotes ? ` \u2022 ${receiverNotes}` : ''}
                </Text>
              </View>
            </View>
            {ride?.receiverOtp ? (
              <View style={styles.otpPill}>
                <Text style={styles.otpPillLabel}>PIN</Text>
                <Text style={styles.otpPillValue}>{ride.receiverOtp}</Text>
              </View>
            ) : null}
          </View>

          {/* Partner Profile + Contact */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerLeft}>
              <View style={styles.partnerAvatarWrap}>
                <View style={styles.partnerAvatar}>
                  <Text style={styles.partnerAvatarText}>{initialsOf(ride?.partner?.name)}</Text>
                </View>
                <View style={styles.partnerStarBadge}>
                  <MaterialIcon name="star" size={12} color={colors.onPrimary} />
                </View>
              </View>
              <View style={styles.partnerInfo}>
                <View style={styles.partnerNameRow}>
                  <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
                  {ride?.partner?.rating != null ? (
                    <Text style={styles.partnerRating}>{`\u2605 ${Number(ride.partner.rating).toFixed(1)}`}</Text>
                  ) : null}
                </View>
                {partnerMeta ? <Text style={styles.partnerMeta}>{partnerMeta}</Text> : null}
              </View>
            </View>
            <View style={styles.partnerActions}>
              <TouchableOpacity style={styles.contactBtn} activeOpacity={0.85} onPress={callPartner}>
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
              <Text style={styles.trustSub}>{trustSub}</Text>
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
                {shareCopied ? 'Tracking Link Shared!' : 'Share Live Tracking Link'}
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
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, mapTheme: MapThemeTokens) => StyleSheet.create({
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
    backgroundColor: mapTheme.brandTint,
  },
  livePill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: mapTheme.glass,
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
    backgroundColor: mapTheme.glass,
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
    backgroundColor: mapTheme.glass,
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
    backgroundColor: mapTheme.glass,
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
    backgroundColor: mapTheme.glassStrong,
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
  otpPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  otpPillLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    marginBottom: 2,
  },
  otpPillValue: {
    ...type.headlineSm,
    color: colors.primary,
    letterSpacing: 2,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    ...type.labelLg,
    color: colors.onPrimary,
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
    backgroundColor: mapTheme.tintPanel,
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
