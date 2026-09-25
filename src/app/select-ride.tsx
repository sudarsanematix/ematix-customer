import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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
    price: '$65',
  },
  {
    id: 'auto',
    name: 'Ematix Auto - ABC789',
    rating: 4.5,
    image: require('../../assets/images/auto.png'),
    distance: '20km',
    time: '52mins',
    promo: 'ECO50 Applied',
    price: '$35',
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
  const { user } = useAuth();
  const { vehicle } = useLocalSearchParams();
  const pendingRideRef = useRef<((data: any) => void) | null>(null);

  // Find the selected vehicle, default to car if not provided
  const selectedVehicleType = vehicle || 'car';
  const selectedRide = RIDE_OPTIONS.find((r) => r.id === selectedVehicleType) || RIDE_OPTIONS[0];

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
      pickup: '1400 Ocean St, Santa Cruz',
      dropoff: '2221 S Havana St, Aurora',
      eta: selectedRide.time,
    });

    // Fallback if the ack is somehow missed: navigate without an id and let
    // finding-driver recover via ride_accepted/join_ride.
    const fallback = setTimeout(() => router.push('/finding-driver'), 8000);
    pendingRideRef.current = (data: any) => {
      clearTimeout(fallback);
      router.push(`/finding-driver?rideId=${data?.id ? String(data.id) : ''}`);
    };
  };

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
              stroke="#000" // Mockup uses black solid line for route
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4}
            />
          </Svg>

          {/* Origin node (from mockup) */}
          <View style={styles.originNode}>
            <View style={styles.nodeLabel}>
              <Text style={styles.nodeLabelText}>1400 Ocean St, Santa Cruz</Text>
              <View style={styles.originCircle}>
                <MaterialIcon name="near-me" size={12} color="#85C77A" />
              </View>
            </View>
          </View>

          {/* Destination node (from mockup) */}
          <View style={styles.destNode}>
            <View style={styles.nodeLabelDark}>
              <Text style={styles.nodeLabelTextDark}>2221 S Havana St, Aurora</Text>
              <View style={styles.destCircle}>
                <MaterialIcon name="near-me" size={12} color="#F4B000" />
              </View>
            </View>
          </View>

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
                <MaterialIcon name="attach-money" size={20} color="#34C759" />
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

const createStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.95)',
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
    backgroundColor: '#000',
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
  nodeLabelTextDark: { ...type.labelSm, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  destCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
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