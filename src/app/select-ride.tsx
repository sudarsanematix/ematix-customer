import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import SharedHeader from '../components/SharedHeader';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme, type MapThemeTokens } from '../theme/mapTheme';
import { type, spacing, radius, fonts } from '../theme/typography';
import MaterialIcon from '../components/MaterialIcon';
import RealMap from '../components/RealMap';
import DraggableSheet from '../components/DraggableSheet';
import SwipeButton from '../components/SwipeButton';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';

const RIDE_OPTIONS = [
  {
    id: 'car',
    name: 'Prime Sedan - XYZ123',
    rating: 4.8,
    image: require('../../assets/images/car.png'),
    distance: '20km',
    time: '45mins',
    promo: 'Not Applied',
    price: '₹65',
  },
  {
    id: 'auto',
    name: 'Ematix Auto - ABC789',
    rating: 4.5,
    image: require('../../assets/images/auto.png'),
    distance: '20km',
    time: '52mins',
    promo: 'ECO50 Applied',
    price: '₹35',
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
  const { colors, isDark } = useTheme();
  const mapTheme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const styles = createStyles(colors, mapTheme);
  const router = useRouter();
  const { user } = useAuth();
  const { 
    vehicle, 
    pickup: routePickup, 
    destination: routeDestination,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    distance,
    duration
  } = useLocalSearchParams();
  const pendingRideRef = useRef<((data: any) => void) | null>(null);

  const pickup = typeof routePickup === 'string' ? routePickup : '';
  const dropoff = typeof routeDestination === 'string' ? routeDestination : '';

  const pLat = pickupLat ? parseFloat(pickupLat as string) : 13.0450;
  const pLng = pickupLng ? parseFloat(pickupLng as string) : 80.2310;
  const dLat = dropoffLat ? parseFloat(dropoffLat as string) : 13.0150;
  const dLng = dropoffLng ? parseFloat(dropoffLng as string) : 80.2450;

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([[pLng, pLat], [dLng, dLat]]);

  const parsedDistance = distance ? parseFloat(distance as string) : null;
  const parsedDuration = duration ? parseFloat(duration as string) : null;
  const distKm = parsedDistance ? (parsedDistance / 1000).toFixed(1) + 'km' : '20km';
  const timeMins = parsedDuration ? Math.ceil(parsedDuration / 60) + 'mins' : '45mins';

  // Base calculation for dynamic prices
  // Car: 40 base + 12/km, Auto: 20 base + 8/km
  const carPrice = parsedDistance ? Math.round(40 + (parsedDistance / 1000) * 12) : 65;
  const autoPrice = parsedDistance ? Math.round(20 + (parsedDistance / 1000) * 8) : 35;

  const dynamicRideOptions = RIDE_OPTIONS.map(ride => {
    if (ride.id === 'car') {
      return { ...ride, distance: distKm, time: timeMins, price: '₹' + carPrice };
    } else if (ride.id === 'auto') {
      return { ...ride, distance: distKm, time: timeMins, price: '₹' + autoPrice };
    }
    return ride;
  });

  // Find the selected vehicle, default to car if not provided
  const selectedVehicleType = vehicle || 'car';
  const selectedRide = dynamicRideOptions.find((r) => r.id === selectedVehicleType) || dynamicRideOptions[0];

  useEffect(() => {
    // Fetch Mapbox Directions route
    const fetchRoute = async () => {
      try {
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pLng},${pLat};${dLng},${dLat}?geometries=geojson&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          setRouteCoords(data.routes[0].geometry.coordinates);
        }
      } catch (err) {
        console.warn('Error fetching route:', err);
      }
    };
    fetchRoute();
  }, [pLat, pLng, dLat, dLng]);

  useEffect(() => {
    socketService.connect();
    const onRideRequested = (data: any) => {
      if (pendingRideRef.current) {
        pendingRideRef.current(data);
        pendingRideRef.current = null;
      }
    };
    socketService.on('ride_requested', onRideRequested);
    return () => socketService.off('ride_requested', onRideRequested);
  }, []);

  const requestRide = () => {
    socketService.emit('request_ride', {
      type: 'ride',
      customerId: user?.id,
      vehicle: selectedRide.name,
      price: selectedRide.price,
      pickup: { address: pickup, lat: pLat, lng: pLng },
      dropoff: { address: dropoff, lat: dLat, lng: dLng },
      eta: selectedRide.time,
    });

    const fallback = setTimeout(() => router.push({ pathname: '/finding-driver', params: { vehicle: selectedVehicleType, pickup, dropoff, pLat, pLng, price: selectedRide.price } }), 8000);
    pendingRideRef.current = (data: any) => {
      clearTimeout(fallback);
      router.push({ pathname: '/finding-driver', params: { rideId: data?.id ? String(data.id) : '', vehicle: selectedVehicleType, pickup, dropoff, pLat, pLng, price: selectedRide.price } });
    };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="select-ride" title="Select Vehicle" />

      {/* Map Canvas with Overlays */}
      <View style={styles.mapContainer}>
        <RealMap 
          interactive 
          style={styles.mapImage}
          showUserLocation={true}
          markers={[
            { id: 'pickup', latitude: pLat, longitude: pLng, color: mapTheme.routeDone },
            { id: 'dropoff', latitude: dLat, longitude: dLng, color: mapTheme.success }
          ]}
          routeCoordinates={routeCoords}
          mapPadding={{ top: 80, bottom: 420, left: 40, right: 40 }}
        >
          <LinearGradient
            colors={[mapTheme.brandTint, 'transparent', mapTheme.scrimToSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.mapScrim}
            pointerEvents="none"
          />


        </RealMap>
      </View>

      {/* Bottom Sheet UI */}
      <View style={styles.bottomSheetWrapper}>

        {/* Fake White Background that starts lower down */}
        <View style={styles.sheetBackground} />

        {/* Single Vehicle View */}
        <View style={styles.singleVehicleView}>

          {/* Overlapping Vehicle Image */}
          <Image source={selectedRide.image} style={styles.vehicleImage} resizeMode="contain" />

          {/* Vehicle Title & Rating */}
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleTitle}>{selectedRide.name}</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcon
                  key={star}
                  name={star <= Math.floor(selectedRide.rating) ? "star" : "star-border"}
                  size={18}
                  color="#F4B000"
                />
              ))}
            </View>
          </View>

          {/* 4 Circular Info Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badgeColumn}>
              <View style={styles.badgeCircle}>
                <MaterialIcon name="route" size={20} color={colors.primary} />
              </View>
              <Text style={styles.badgeLabel}>{selectedRide.distance}</Text>
            </View>

            <View style={styles.badgeColumn}>
              <View style={styles.badgeCircle}>
                <MaterialIcon name="schedule" size={20} color={colors.primary} />
              </View>
              <Text style={styles.badgeLabel}>{selectedRide.time}</Text>
            </View>

            <View style={styles.badgeColumn}>
              <View style={styles.badgeCircle}>
                <MaterialIcon name="local-offer" size={20} color={colors.primary} />
              </View>
              <Text style={styles.badgeLabel}>{selectedRide.promo}</Text>
            </View>

            <View style={styles.badgeColumn}>
              <View style={[styles.badgeCircle, { backgroundColor: '#00215E' }]}>
                <MaterialIcon name="currency-rupee" size={20} color="#34C759" />
              </View>
              <Text style={[styles.badgeLabel, { color: '#34C759', fontFamily: fonts.bold }]}>{selectedRide.price}</Text>
            </View>
          </View>

        </View>

        {/* Swipe Button Pinned to Bottom */}
        <View style={styles.swipeWrap}>
          <SwipeButton
            title="Slide To Send Request"
            onSwipeComplete={requestRide}
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, mapTheme: MapThemeTokens) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  mapContainer: { flex: 1, backgroundColor: colors.surfaceContainer },
  mapImage: { width: '100%', height: '100%' },
  mapScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  routeSvg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  originNode: {
    position: 'absolute',
    top: 150,
    left: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nodeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mapTheme.glass,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  nodeLabelText: { ...type.labelSm, fontFamily: 'Inter_600SemiBold', color: colors.onSurface },
  originCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: mapTheme.onBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destNode: {
    position: 'absolute',
    top: 40,
    right: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nodeLabelDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.9)',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  nodeLabelTextDark: {
    ...type.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: mapTheme.onPrimary,
  },
  destCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: mapTheme.onBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 450, // 380 + 70px overlap area
    zIndex: 10,
  },
  sheetBackground: {
    position: 'absolute',
    top: 70, // Start below the overlapping image area
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 20,
  },
  singleVehicleView: {
    flex: 1,
    alignItems: 'center',
  },
  vehicleImage: {
    width: 280,
    height: 180,
    marginTop: 0, // No negative margin needed! It sits in the transparent top area of the wrapper
    borderRadius: 16,
  },
  vehicleInfo: {
    alignItems: 'center',
    marginTop: 4,
  },
  vehicleTitle: {
    ...type.headlineMd,
    color: colors.onSurface,
    fontFamily: fonts.semibold,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 32,
    marginTop: 24,
  },
  badgeColumn: {
    alignItems: 'center',
    gap: 8,
  },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLabel: {
    ...type.labelSm,
    color: colors.onSurface,
    fontFamily: fonts.semibold,
  },
  swipeWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 20,
    right: 20,
  }
});