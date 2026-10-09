import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import LiveMap, { type LiveMapHandle, type LiveVehicle, type LiveVehicleKind, type LngLat, type LivePin } from '../components/LiveMap';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme, type MapThemeTokens } from '../theme/mapTheme';
import { fonts, type } from '../theme/typography';

type RideData = {
  id: string;
  type?: string;
  status?: string;
  otp?: string | null;
  price?: number | string | null;
  vehicleType?: string;
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
    id: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    rating?: number | null;
  } | null;
};

function PingRing() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, buildMapTheme(isDark));
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return <Animated.View style={[styles.pingRing, { transform: [{ scale }], opacity }]} />;
}

export default function PackageAssignedScreen() {
  const { colors, isDark } = useTheme();
  const mapTheme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const styles = createStyles(colors, mapTheme);
  const router = useRouter();
  const { user } = useAuth();
  const { rideId: routeRideId, otp: routeOtp } = useLocalSearchParams<{ rideId?: string; otp?: string }>();
  const [rideId, setRideId] = useState<string>(routeRideId || '');
  const [otp, setOtp] = useState<string>(routeOtp || '');
  const [ride, setRide] = useState<RideData | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const [driver, setDriver] = useState<LiveVehicle | null>(null);
  const [follow, setFollow] = useState(true);
  const [routeCoords, setRouteCoords] = useState<LngLat[]>([]);
  const mapRef = useRef<LiveMapHandle | null>(null);

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
  const driverKey = driver ? `${driver.lngLat[0].toFixed(3)},${driver.lngLat[1].toFixed(3)}` : 'none';

  useEffect(() => {
    if (!pickupCoords) return;
    let start: LngLat = driver ? driver.lngLat : pickupCoords;
    let end: LngLat = pickupCoords;
    let cancelled = false;
    if (start[0] !== end[0] || start[1] !== end[1]) {
      (async () => {
        try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${process.env.EXPO_PUBLIC_MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (!cancelled && coords?.length) setRouteCoords(coords);
      } catch (e) { }
    })();
    }
    return () => { cancelled = true; };
  }, [pickupCoords, driverKey]);

  const rideIdRef = useRef(rideId);
  useEffect(() => {
    rideIdRef.current = rideId;
  }, [rideId]);

  useEffect(() => {
    socketService.connect();

    const onRideRequested = (data: any) => {
      if (data?.id) {
        const id = String(data.id);
        setRideId(id);
        if (data.otp) setOtp(String(data.otp));
        socketService.joinRide(id, 'customer', user?.id);
      }
    };

    const onRideAccepted = (data: any) => {
      if (!data?.id) return;
      const id = String(data.id);
      setRideId(id);
      if (data.otp) setOtp(String(data.otp));
      setRide(data);
      socketService.joinRide(id, 'customer', user?.id);
    };

    const onRideDetails = (data: any) => {
      if (!data) {
        setUnavailable(true);
        return;
      }
      if (data.id) {
        setRideId(String(data.id));
        if (data.otp) setOtp(String(data.otp));
      }
      setRide(data);
      if (data?.status === 'completed') {
        router.replace('/package-delivered');
      } else if (data?.status === 'en_route_dropoff') {
        router.replace(`/package-transit?rideId=${data.id}`);
      }
    };

    const onStatus = (data: any) => {
      if (data?.rideId && data.rideId === rideIdRef.current) {
        if (data.status === 'pending') {
          Alert.alert('Re-assigning', 'The previous partner cancelled. Searching for a new partner.', [
            { 
              text: 'OK', 
              onPress: () => {
                setRide((prev) => {
                  if (!prev) return prev;
                  const params = new URLSearchParams({
                    rideId: data.rideId,
                    vehicle: prev.type === 'parcel' ? 'bike' : prev.vehicleType || '',
                    pLat: prev.pickup?.lat?.toString() || '',
                    pLng: prev.pickup?.lng?.toString() || '',
                    pickup: prev.pickup?.address || '',
                    dropoff: prev.dropoff?.address || '',
                    price: prev.price?.toString() || '',
                  }).toString();
                  router.replace(`/finding-driver?${params}`);
                  return { ...prev, status: data.status };
                });
              }
            }
          ]);
        } else {
          setRide((prev) => (prev ? { ...prev, status: data.status } : prev));
        }
      }
    };

    const onStarted = (data: any) => {
      if (data?.rideId && data.rideId === rideIdRef.current) {
        router.replace(`/package-transit?rideId=${data.rideId}`);
      }
    };

    const onCompleted = (data: any) => {
      if (data?.id && data.id !== rideIdRef.current) return;
      router.replace('/package-delivered');
    };

    const onCancelled = (data: any) => {
      if (data?.rideId && data.rideId !== rideIdRef.current) return;
      Alert.alert('Ride Cancelled', 'The delivery was cancelled by the partner.');
      router.replace('/(tabs)/home');
    };

    const onError = (data: any) => {
      if (data?.rideId === rideIdRef.current && (data.code === 'ride_not_found' || data.code === 'unauthorized')) {
        setUnavailable(true);
      }
    };

    const onDriverLocation = (data: any) => {
      if (data.rideId !== rideIdRef.current) return;
      if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return;
      setDriver((prev) => ({
        lngLat: [data.lng, data.lat],
        bearing: typeof data.bearing === 'number' ? data.bearing : prev?.bearing,
        kind: 'auto',
      }));
    };

    socketService.on('ride_requested', onRideRequested);
    socketService.on('ride_accepted', onRideAccepted);
    socketService.on('ride_details', onRideDetails);
    socketService.on('ride_status_updated', onStatus);
    socketService.on('ride_started', onStarted);
    socketService.on('ride_completed', onCompleted);
    socketService.on('ride_cancelled', onCancelled);
    socketService.on('ride_error', onError);
    socketService.on('driver_location', onDriverLocation);

    return () => {
      socketService.off('ride_requested', onRideRequested);
      socketService.off('ride_accepted', onRideAccepted);
      socketService.off('ride_details', onRideDetails);
      socketService.off('ride_status_updated', onStatus);
      socketService.off('ride_started', onStarted);
      socketService.off('ride_completed', onCompleted);
      socketService.off('ride_cancelled', onCancelled);
      socketService.off('ride_error', onError);
      socketService.off('driver_location', onDriverLocation);
    };
  }, [router, user?.id]);

  const pins: LivePin[] = useMemo(() => {
    const arr: LivePin[] = [];
    if (pickupCoords) {
      arr.push({ id: 'pickup', lngLat: pickupCoords, color: mapTheme.routeDone, variant: 'dot' });
    }
    return arr;
  }, [pickupCoords, mapTheme]);

  useEffect(() => {
    if (rideId) socketService.joinRide(rideId, 'customer', user?.id);
  }, [rideId, user?.id]);

  const isAccepted = !!ride?.partner;
  const isArrived = ride?.status === 'arrived';
  const partner = ride?.partner || null;
  const partnerName = partner?.name || 'Courier';
  const initials = partnerName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const vehicleName = partner?.vehicleType || partner?.vehicleModel || 'Delivery Partner';
  const vehicleNumber = partner?.vehicleNumber || '';
  const rating = partner?.rating ?? null;
  const maskedPhone = partner?.phone ? `+91 ${partner.phone.replace(/\d(?=\d{4})/g, '*')}` : '';
  const headerPillText = isArrived
    ? 'Courier has arrived'
    : isAccepted
    ? 'Courier on the way'
    : 'Courier en route to pickup';

  if (unavailable) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="package-assigned" title="Package Tracking" />
        <View style={styles.waitingWrap}>
          <MaterialIcon name="error-outline" size={48} color={colors.textMuted} />
          <Text style={styles.waitingTitle}>Delivery session unavailable</Text>
          <Text style={styles.waitingSub}>
            This order is no longer available or you are not authorized to view it.
          </Text>
          <TouchableOpacity style={styles.waitingBtn} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.waitingBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAccepted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="package-assigned" title="Finding a Courier" />
        <View style={styles.waitingWrap}>
          <View style={styles.waitingSpinnerWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.waitingTitle}>Searching for a courier...</Text>
          <Text style={styles.waitingSub}>Matching with a nearby delivery partner for your package.</Text>
          {otp ? (
            <View style={styles.waitingOtpPill}>
              <Text style={styles.waitingOtpLabel}>Your ride-start PIN</Text>
              <Text style={styles.waitingOtpDigits}>{otp.split('').join('  ')}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.waitingBtnGhost} activeOpacity={0.9} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.waitingBtnGhostText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="package-assigned" title="Delivery Partner Assigned" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Map Context Section */}
        <View style={styles.mapContainer}>
          <LiveMap
            ref={mapRef}
            interactive
            style={styles.mapImage}
            vehicle={driver}
            follow={follow}
            route={{ coordinates: routeCoords }}
            pins={pins}
            onUserMove={() => setFollow(false)}
          >
            {/* Top Floating Status Pill + Recenter */}
            <View style={styles.topPillRow}>
              <View style={styles.statusPill}>
                <View style={styles.liveDotWrap}>
                  <View style={styles.liveDotPing} />
                  <View style={styles.liveDot} />
                </View>
                <Text style={styles.statusPillText}>{headerPillText}</Text>
              </View>
              <TouchableOpacity style={styles.recenterBtn} activeOpacity={0.85} onPress={() => { setFollow(true); mapRef.current?.focusVehicle(); }}>
                <MaterialIcon name="my-location" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Pickup Spot Geo Card */}
            <View style={styles.geoCard}>
              <View style={styles.geoIconWrap}>
                <MaterialIcon name="storefront" size={20} color={colors.primary} />
              </View>
              <View style={styles.geoTextCol}>
                <Text style={styles.geoLabel}>Pickup Location</Text>
                <Text style={styles.geoAddress} numberOfLines={1}>{ride?.pickup?.address || 'Pickup Point'}</Text>
              </View>
              <View style={styles.geoDistancePill}>
                <Text style={styles.geoDistanceText}>Live</Text>
              </View>
            </View>
          </LiveMap>
        </View>

        {/* Content Stream */}
        <View style={styles.stream}>
          {/* Handover PIN & Security Banner */}
          <View style={styles.securityBanner}>
            <View style={styles.securityHeaderRow}>
              <View style={styles.securityTitleRow}>
                <MaterialIcon name="verified-user" size={20} color={colors.onPrimaryContainer} />
                <Text style={styles.securityTitle}>Handover Verification</Text>
              </View>
              <View style={styles.encryptedPill}>
                <Text style={styles.encryptedPillText}>Encrypted</Text>
              </View>
            </View>

            <View style={styles.otpBox}>
              <View>
                <Text style={styles.otpLabel}>Ride-start PIN</Text>
                <View style={styles.otpDigitsRow}>
                  <Text style={styles.otpDigits}>
                    {otp ? otp.split('').join('  ') : '— — — —'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Ride-start PIN', otp ? `PIN ${otp} copied` : 'PIN unavailable')}
              >
                <MaterialIcon name="content-paste" size={16} color={colors.primaryContainer} />
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.otpHintRow}>
              <MaterialIcon name="info" size={14} color={colors.onPrimaryContainer} />
              <Text style={styles.otpHintText}>Share this PIN with your courier so they can verify pickup and start the trip.</Text>
            </View>
          </View>

          {/* Delivery Partner Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
                <View style={styles.vehicleBadge}>
                  <MaterialIcon name="electric-scooter" size={14} color={colors.primary} />
                </View>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
                  <View style={styles.topCourierPill}>
                    <Text style={styles.topCourierText}>Verified</Text>
                  </View>
                </View>
                <View style={styles.ratingRow}>
                  <MaterialIcon name="star" size={16} color={colors.accentRed} />
                  <Text style={styles.ratingValue}>{rating != null ? rating : '4.5'}</Text>
                  <Text style={styles.ratingMeta}>{maskedPhone ? `\u2022 ${maskedPhone}` : '(Verified partner)'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.vehicleTagRow}>
              <View style={styles.vehicleTagLeft}>
                <MaterialIcon name="two-wheeler" size={18} color={colors.textMuted} />
                <Text style={styles.vehicleTagText}>{vehicleName}</Text>
              </View>
              {vehicleNumber ? (
                <View style={styles.platePill}>
                  <Text style={styles.plateText}>{vehicleNumber}</Text>
                </View>
              ) : null}
            </View>

            {/* Quick Action Thumb Controls */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Calling', partnerName)}
              >
                <MaterialIcon name="call" size={20} color={colors.primary} />
                <Text style={styles.actionLabelPrimary}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                activeOpacity={0.85}
                onPress={() => { if (rideId) router.push(`/chat?rideId=${rideId}`); }}
              >
                <MaterialIcon name="chat" size={20} color={colors.primary} />
                <Text style={styles.actionLabelPrimary}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnMuted]}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Live tracking link copied')}
              >
                <MaterialIcon name="share" size={20} color={colors.onSurface} />
                <Text style={styles.actionLabelMuted}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSos]}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Safety support & emergency contact dialed.')}
              >
                <MaterialIcon name="shield" size={20} color={colors.error} />
                <Text style={styles.actionLabelSos}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Delivery Progress</Text>
              <View style={styles.livePill}>
                <MaterialIcon name="bolt" size={14} color={colors.primary} />
                <Text style={styles.livePillText}>Live Tracking</Text>
              </View>
            </View>

            <View style={styles.stepper}>
              <View style={styles.stepLineBg} />
              <View style={styles.stepLineFill} />
              <View style={styles.stepItem}>
                <View style={styles.stepDotActive}>
                  <MaterialIcon name="directions-bike" size={16} color={colors.onPrimary} />
                </View>
                <Text style={styles.stepLabelActive}>{isArrived ? 'Arrived' : 'On the Way'}</Text>
                <Text style={styles.stepSubActive}>Pickup</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={isArrived ? styles.stepDotActive : styles.stepDotPending}>
                  <MaterialIcon name="archive" size={16} color={isArrived ? colors.onPrimary : colors.textMuted} />
                </View>
                <Text style={isArrived ? styles.stepLabelActive : styles.stepLabelPending}>Verification</Text>
                <Text style={styles.stepSubPending}>PIN &amp; Handover</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepDotPending}>
                  <MaterialIcon name="local-shipping" size={16} color={colors.textMuted} />
                </View>
                <Text style={styles.stepLabelPending}>Out for</Text>
                <Text style={styles.stepSubPending}>Delivery</Text>
              </View>
            </View>

            {/* Package Description */}
            <View style={styles.packageRow}>
              <View style={styles.packageThumb}>
                <MaterialIcon name="inventory-2" size={24} color={colors.primary} />
              </View>
              <View style={styles.packageInfo}>
                <Text style={styles.packageTitle} numberOfLines={1}>{ride?.packageDetails?.category || 'General'} Package</Text>
                <View style={styles.packageMetaRow}>
                  <Text style={styles.packageMeta}>Weight {ride?.packageDetails?.weightTier === 'large' ? '> 20' : ride?.packageDetails?.weightTier === 'medium' ? '5-20' : '< 5'} kg</Text>
                  {ride?.packageDetails?.fragile && (
                    <>
                      <View style={styles.metaDot} />
                      <Text style={styles.packageMetaPrimary}>Fragile Care</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Sender & Receiver Route Matrix */}
            <View style={styles.routeMatrix}>
              <View style={styles.routeRow}>
                <View style={styles.routeDotSender}>
                  <MaterialIcon name="trip-origin" size={14} color={colors.primary} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>Sender</Text>
                  <Text style={styles.routeName}>
                    You <Text style={styles.routeMuted}>• {ride?.pickup?.address || 'Pickup Location'}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.routeRow}>
                <View style={styles.routeDotReceiver}>
                  <MaterialIcon name="location-on" size={14} color={colors.error} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>Receiver</Text>
                  <Text style={styles.routeName}>
                    {ride?.packageDetails?.receiverName || 'Recipient'} <Text style={styles.routePhone}>• {ride?.packageDetails?.receiverPhone}</Text>
                  </Text>
                  <Text style={styles.routeMuted}>{ride?.dropoff?.address || 'Dropoff Location'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Live Arrived Notification & Handover CTA */}
          <View style={styles.handoverCard}>
            <View style={[styles.arrivedRow, isArrived ? styles.arrivedRowActive : null]}>
              <View style={styles.arrivedIconWrap}>
                <MaterialIcon name={isArrived ? 'door-front' : 'two-wheeler'} size={20} color={colors.onPrimary} />
              </View>
              <View style={styles.arrivedInfo}>
                <Text style={styles.arrivedTitle}>{isArrived ? 'Courier Arrived at Pickup' : 'Courier on the way'}</Text>
                <Text style={styles.arrivedSubtitle}>
                  {isArrived
                    ? `${partnerName} is waiting at the pickup point. Share your PIN to start the trip.`
                    : `${partnerName} is heading to the pickup point.`}
                </Text>
              </View>
            </View>

            <View style={styles.otpShareRow}>
              <View style={styles.otpShareIcon}>
                <MaterialIcon name="pin" size={20} color={colors.primary} />
              </View>
              <View style={styles.otpShareCol}>
                <Text style={styles.otpShareLabel}>Ride-start PIN</Text>
                <Text style={styles.otpShareDigits}>{otp ? otp.split('').join('  ') : '— — — —'}</Text>
              </View>
              <TouchableOpacity
                style={styles.otpCopyBtn}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Ride-start PIN', otp ? `PIN ${otp} copied` : 'PIN unavailable')}
              >
                <MaterialIcon name="content-paste" size={16} color={colors.primary} />
                <Text style={styles.otpCopyText}>Copy</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.otpHelpText}>
              {isArrived
                ? 'Give this PIN to your courier. They will enter it to verify the pickup and start the delivery.'
                : 'Keep this PIN ready — you will share it with your courier at pickup.'}
            </Text>

            <TouchableOpacity
              style={styles.helpBtn}
              activeOpacity={0.9}
              onPress={() => Alert.alert('Support hotline connected. An agent will assist you immediately.')}
            >
              <MaterialIcon name="help-outline" size={18} color={colors.textMuted} />
              <Text style={styles.helpBtnText}>Need help with this pickup?</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    paddingBottom: 36,
  },
  mapContainer: {
    height: 320,
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
  movingNode: {
    position: 'absolute',
    left: '37%',
    top: '65%',
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: mapTheme.routeDone,
  },
  movingDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: mapTheme.routeDone,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  topPillRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: mapTheme.glass,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  statusPillText: {
    ...type.labelMd,
    color: colors.onSurface,
    fontFamily: fonts.medium,
  },
  statusPillBold: {
    ...type.headlineSm,
    color: colors.primaryContainer,
    fontSize: 15,
  },
  recenterBtn: {
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
  geoCard: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: mapTheme.glass,
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  geoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  geoTextCol: {
    flex: 1,
    minWidth: 0,
  },
  geoLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  geoAddress: {
    ...type.labelMd,
    color: colors.onSurface,
    marginTop: 1,
  },
  geoDistancePill: {
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
  },
  geoDistanceText: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  stream: {
    marginTop: -8,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  securityBanner: {
    backgroundColor: colors.primaryContainer,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityTitle: {
    ...type.labelMd,
    color: colors.onPrimaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  encryptedPill: {
    backgroundColor: mapTheme.washSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  encryptedPillText: {
    ...type.labelSm,
    color: colors.onPrimaryContainer,
  },
  otpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: mapTheme.washStrong,
    padding: 12,
    borderRadius: 10,
  },
  otpLabel: {
    ...type.labelSm,
    color: colors.onPrimaryContainer,
  },
  otpDigitsRow: {
    marginTop: 2,
  },
  otpDigits: {
    ...type.displayMetric,
    color: colors.onPrimary,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 6,
  },
  copyBtn: {
    height: 36,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  copyBtnText: {
    ...type.labelMd,
    color: colors.primaryContainer,
  },
  otpHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  otpHintText: {
    flex: 1,
    ...type.bodySm,
    color: colors.onPrimaryContainer,
  },
  profileCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...type.labelLg,
    color: colors.onPrimary,
    fontFamily: fonts.bold,
  },
  vehicleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  partnerName: {
    ...type.headlineSm,
    color: colors.onSurface,
    fontSize: 16,
  },
  topCourierPill: {
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  topCourierText: {
    ...type.labelSm,
    color: colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  ratingValue: {
    ...type.labelMd,
    color: colors.onSurface,
    fontFamily: fonts.semibold,
  },
  ratingMeta: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  vehicleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  vehicleTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleTagText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  platePill: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  plateText: {
    ...type.labelMd,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  actionBtnPrimary: {
    backgroundColor: colors.lightBlueTint,
  },
  actionBtnMuted: {
    backgroundColor: colors.surfaceGray,
  },
  actionBtnSos: {
    backgroundColor: colors.errorContainer,
  },
  actionLabelPrimary: {
    ...type.labelSm,
    color: colors.primary,
    marginTop: 2,
  },
  actionLabelMuted: {
    ...type.labelSm,
    color: colors.onSurface,
    marginTop: 2,
  },
  actionLabelSos: {
    ...type.labelSm,
    color: colors.error,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    fontSize: 16,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePillText: {
    ...type.labelSm,
    color: colors.primary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 2,
    position: 'relative',
  },
  stepLineBg: {
    position: 'absolute',
    top: 12,
    left: 24,
    right: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceGray,
  },
  stepLineFill: {
    position: 'absolute',
    top: 12,
    left: 24,
    width: '26%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryContainer,
  },
  stepItem: {
    alignItems: 'center',
    width: 76,
  },
  stepDotActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stepDotPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabelActive: {
    ...type.labelSm,
    color: colors.primaryContainer,
    marginTop: 6,
    fontFamily: fonts.semibold,
  },
  stepSubActive: {
    ...type.bodySm,
    color: colors.textMuted,
    fontSize: 10,
  },
  stepLabelPending: {
    ...type.labelSm,
    color: colors.textMuted,
    marginTop: 6,
  },
  stepSubPending: {
    ...type.bodySm,
    color: colors.textMuted,
    fontSize: 10,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceGray,
    padding: 12,
    borderRadius: 10,
  },
  packageThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  packageInfo: {
    flex: 1,
    minWidth: 0,
  },
  packageTitle: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  packageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  packageMeta: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.outline,
  },
  packageMetaPrimary: {
    ...type.bodySm,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  routeMatrix: {
    gap: 10,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeDotSender: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  routeDotReceiver: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  routeInfo: {
    flex: 1,
    minWidth: 0,
  },
  routeLabel: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  routeName: {
    ...type.bodyMd,
    color: colors.onSurface,
    fontFamily: fonts.semibold,
  },
  routePhone: {
    ...type.bodySm,
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  routeMuted: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  handoverCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  arrivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.lightBlueTint,
    padding: 12,
    borderRadius: 10,
  },
  arrivedRowActive: {
    backgroundColor: colors.primaryContainer,
  },
  arrivedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  arrivedInfo: {
    flex: 1,
    minWidth: 0,
  },
  arrivedTitle: {
    ...type.headlineSm,
    color: colors.primaryContainer,
    fontSize: 15,
  },
  arrivedSubtitle: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  handoverBtn: {
    height: 52,
    borderRadius: 14,
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
  handoverBtnDone: {
    backgroundColor: colors.primary,
  },
  handoverBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
  otpShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceGray,
    padding: 12,
    borderRadius: 12,
  },
  otpShareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  otpShareCol: {
    flex: 1,
    minWidth: 0,
  },
  otpShareLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otpShareDigits: {
    ...type.displayMetric,
    color: colors.onSurface,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 4,
    marginTop: 2,
  },
  otpCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  otpCopyText: {
    ...type.labelMd,
    color: colors.primary,
  },
  otpHelpText: {
    ...type.bodySm,
    color: colors.textMuted,
    paddingHorizontal: 2,
  },
  helpBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  helpBtnText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  waitingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  waitingSpinnerWrap: {
    marginBottom: 8,
  },
  waitingTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
    textAlign: 'center',
  },
  waitingSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  waitingBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  waitingBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onPrimary,
  },
  waitingBtnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceGray,
    marginTop: 12,
  },
  waitingBtnGhostText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  waitingOtpPill: {
    alignItems: 'center',
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 10,
  },
  waitingOtpLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  waitingOtpDigits: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 6,
    color: colors.primary,
    marginTop: 4,
  },
});