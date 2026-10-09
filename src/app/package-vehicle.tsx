import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { PARCEL_VEHICLES } from '../data/mockData';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme } from '../theme/mapTheme';
import { fonts } from '../theme/typography';
import { Image } from 'react-native';
import { socketService } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import RealMap from '../components/RealMap';

const INSTRUCTION_CHIPS = ['+ Ring bell twice', '+ Leave at gate', '+ Call receiver'];

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.34:4000';

const calculateParcelFare = (dist: number, type: string, weight: string, serverConfigs: any) => {
  const typeMap: Record<string, string> = {
    'two-wheeler': 'bike',
    'auto': 'auto'
  };
  const backendType = typeMap[type] || 'bike';

  const c = serverConfigs && serverConfigs[backendType]
    ? { base: serverConfigs[backendType].baseFare, perKm: serverConfigs[backendType].perKmRate, min: serverConfigs[backendType].minFare }
    : (type === 'auto' ? { base: 45, perKm: 12, min: 60 } : { base: 25, perKm: 7, min: 30 }); // fallback

  let weightSurge = 0;
  if (weight === 'medium') weightSurge = 10;
  if (weight === 'large') weightSurge = 20;
  const fare = c.base + (dist * c.perKm) + weightSurge;
  return Math.max(Math.round(fare), c.min);
};

export default function PackageVehicleScreen() {
  const { colors, isDark } = useTheme();
  const mapTheme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const pickupAddr = params.pickup as string || 'Greenways Road, RA Puram';
  const dropoffAddr = params.dropoff as string || '12th Cross St, Indiranagar';
  const pickupLat = parseFloat(params.pickupLat as string) || 13.0234;
  const pickupLng = parseFloat(params.pickupLng as string) || 80.2524;
  const dropoffLat = parseFloat(params.dropoffLat as string) || 13.0646;
  const dropoffLng = parseFloat(params.dropoffLng as string) || 80.2319;
  const distanceKm = parseFloat(params.distance as string) / 1000 || 6.2;
  const durationMins = Math.ceil(parseFloat(params.duration as string) / 60) || 24;

  const recipientName = params.recipientName as string || 'Priya Sharma';
  const recipientPhone = params.recipientPhone as string || '+91 98765 43210';
  const selectedCategory = params.selectedCategory as string || 'electronics';
  const weightTier = params.weightTier as string || 'small';
  const isFragile = params.isFragile === 'true';

  const [selectedVehicleId, setSelectedVehicleId] = useState('two-wheeler');
  const [notes, setNotes] = useState('');
  const [fareConfigs, setFareConfigs] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const isRequestingRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<{ onRequested?: (d: any) => void, onError?: (d: any) => void }>({});
  const idempotencyKeyRef = useRef<string>(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/fares`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.fares) {
          setFareConfigs(data.fares);
        }
      })
      .catch(err => console.error('Failed to fetch fares', err));
  }, []);

  const dynamicVehicles = PARCEL_VEHICLES.map((v: any) => ({
    ...v,
    price: calculateParcelFare(distanceKm, v.id, weightTier, fareConfigs),
    eta: durationMins + ' mins',
    distance: distanceKm.toFixed(1) + ' km'
  }));

  useEffect(() => {
    // Fetch Mapbox Directions route for map polyline
    const fetchRoute = async () => {
      try {
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?geometries=geojson&access_token=${token}`;
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
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const vehicle = dynamicVehicles.find((v: any) => v.id === selectedVehicleId) || dynamicVehicles[0];
  const isTwoWheeler = selectedVehicleId === 'two-wheeler';

  // Clean up any pending requests on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      if (handlersRef.current.onRequested) {
        socketService.off('ride_requested', handlersRef.current.onRequested);
      }
      if (handlersRef.current.onError) {
        socketService.off('ride_error', handlersRef.current.onError);
      }
    };
  }, []);

  const requestParcel = () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    setIsRequesting(true);

    const cleanup = () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      isRequestingRef.current = false;
      setIsRequesting(false);
      socketService.off('ride_requested', onRideRequested);
      socketService.off('ride_error', onRideError);
    };

    const onRideRequested = (data: any) => {
      cleanup();
      if (!data?.id) {
        Alert.alert('Error', 'Invalid response from server. Please try again.');
        return;
      }
      const otp = data?.otp ? String(data.otp) : '';
      router.push(`/package-assigned?rideId=${String(data.id)}&otp=${otp}`);
    };

    const onRideError = (data: any) => {
      cleanup();
      Alert.alert('Request Failed', data?.message || 'Could not request delivery. Please try again.');
    };

    handlersRef.current = { onRequested: onRideRequested, onError: onRideError };

    socketService.on('ride_requested', onRideRequested);
    socketService.on('ride_error', onRideError);

    // Start fallback timer *before* emit so there's no gap
    fallbackTimeoutRef.current = setTimeout(() => {
      // Remove this attempt's listeners and timer before allowing a retry.
      cleanup();

      Alert.alert(
        'Connection Delayed',
        'No response was received. You can retry the request.'
      );
    }, 15000);

    socketService.emit('request_ride', {
      idempotencyKey: idempotencyKeyRef.current,
      type: 'parcel',
      customerId: user?.id,
      vehicle: vehicle.name,
      price: vehicle.price,
      pickup: { address: pickupAddr, lat: pickupLat, lng: pickupLng },
      dropoff: { address: dropoffAddr, lat: dropoffLat, lng: dropoffLng },
      eta: vehicle.eta,
      packageDetails: {
        category: selectedCategory,
        weightTier,
        receiverName: recipientName,
        receiverPhone: recipientPhone,
        fragile: isFragile,
        notes
      }
    });
  };

  const appendInstruction = (text: string) => {
    const clean = text.startsWith('+ ') ? text.slice(2) : text;
    setNotes((prev) => (prev.trim() === '' ? clean : `${prev.trim()}, ${clean}`));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="package-vehicle" title="Package Delivery Details" />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Map Preview */}
        <View style={{ height: 180, borderRadius: 16, overflow: 'hidden', marginHorizontal: 20, marginTop: 16 }}>
          <RealMap
            interactive={false}
            style={{ width: '100%', height: '100%' }}
            markers={[
              { id: 'pickup', latitude: pickupLat, longitude: pickupLng, color: mapTheme.routeDone, title: 'Pickup' },
              { id: 'dropoff', latitude: dropoffLat, longitude: dropoffLng, color: mapTheme.success, title: 'Drop-off' }
            ]}
            routeCoordinates={routeCoords}
          />
        </View>

        {/* Route Timeline Card */}
        <View style={styles.routeCard}>
          <View style={styles.timelineRow}>
            <View style={styles.timelineSpine}>
              <View style={styles.spineDotBlue}>
                <View style={styles.spineDotBlueInner} />
              </View>
              <View style={styles.spineLine} />
              <View style={styles.spineDotRed}>
                <View style={styles.spineDotRedInner} />
              </View>
            </View>
            <View style={styles.timelineTextCol}>
              <View style={styles.stopRow}>
                <View style={styles.stopHeader}>
                  <Text style={styles.stopLabelBlue}>Pickup Point</Text>
                  <View style={styles.stopSepDot} />
                  <Text style={styles.stopSender}>Sender: Me</Text>
                </View>
                <Text style={styles.stopAddress} numberOfLines={1}>{pickupAddr}</Text>
              </View>
              <View style={styles.stopRow}>
                <Text style={styles.stopLabelRed}>Drop-off Point</Text>
                <Text style={styles.stopAddress} numberOfLines={1}>{dropoffAddr}</Text>
                <Text style={styles.stopReceiver} numberOfLines={1}>Receiver: {recipientName} • {recipientPhone}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.routeToggleBtn} activeOpacity={0.85}>
              <MaterialIcon name="alt-route" size={18} color={colors.outline} />
            </TouchableOpacity>
          </View>

          {/* Package Spec Tags */}
          <View style={styles.tagBar}>
            <View style={styles.tagPrimary}>
              <MaterialIcon name="inventory-2" size={16} color={colors.primary} />
              <Text style={styles.tagPrimaryText}>{selectedCategory.toUpperCase()}</Text>
            </View>
            <View style={styles.tagMuted}>
              <MaterialIcon name="scale" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.tagMutedText}>{weightTier}</Text>
            </View>
            <View style={styles.tagMuted}>
              <MaterialIcon name={isFragile ? "warning" : "verified"} size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.tagMutedText}>{isFragile ? 'Fragile' : 'Normal Handling'}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Selection */}
        <View style={styles.vehicleHeader}>
          <Text style={styles.sectionTitle}>Choose Delivery Vehicle</Text>
          <View style={styles.fastestBadge}>
            <MaterialIcon name="bolt" size={14} color={colors.primary} />
            <Text style={styles.fastestText}>Fastest matching</Text>
          </View>
        </View>
        <View style={styles.vehicleList}>
          {dynamicVehicles.map((v: any) => {
            const isSelected = selectedVehicleId === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => setSelectedVehicleId(v.id)}
                style={[styles.vehicleCard, isSelected ? styles.vehicleCardActive : styles.vehicleCardInactive]}
                activeOpacity={0.9}
              >
                <View style={styles.vehicleTopRow}>
                  <View style={styles.vehicleLeft}>
                    <View style={[styles.vehicleAvatarWrapper, isTwoWheeler ? styles.avatarScooter : styles.avatarAuto]}>
                      <Image
                        source={v.id === 'two-wheeler' ? require('../../assets/images/bike.jpg') : require('../../assets/images/auto.png')}
                        style={styles.vehicleImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.vehicleInfoCol}>
                      <View style={styles.vehicleTitleRow}>
                        <Text style={styles.vehicleName}>{v.name}</Text>
                        <View style={[styles.vehicleBadge, isSelected ? styles.vehicleBadgeActive : styles.vehicleBadgeInactive]}>
                          <Text style={[styles.vehicleBadgeText, isSelected && styles.vehicleBadgeTextActive]}>{v.badge}</Text>
                        </View>
                      </View>
                      <View style={styles.etaRow}>
                        <MaterialIcon name="schedule" size={15} color={isSelected ? colors.primary : colors.textMuted} />
                        <Text style={[styles.etaText, isSelected && styles.etaTextActive]}>ETA {v.eta}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={[styles.priceValue, isSelected && styles.priceValueActive]}>₹{v.price}</Text>
                    <Text style={styles.priceCaption}>Guaranteed fare</Text>
                  </View>
                </View>
                <Text style={styles.vehicleDesc}>{v.description}</Text>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <MaterialIcon name="check" size={14} color={colors.onPrimary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Delivery Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <View style={styles.instructionsLabel}>
              <MaterialIcon name="edit-note" size={18} color={colors.primary} />
              <Text style={styles.instructionsTitle}>Delivery Instructions</Text>
            </View>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={2}
            placeholder="Add delivery note or gate code..."
            placeholderTextColor={colors.outline}
            value={notes}
            onChangeText={setNotes}
          />
          <View style={styles.chipBar}>
            {INSTRUCTION_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.instructionChip}
                onPress={() => appendInstruction(chip)}
                activeOpacity={0.85}
              >
                <Text style={styles.instructionChipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.fareCard}>
          <View style={styles.fareHeader}>
            <View style={styles.fareLabelRow}>
              <MaterialIcon name="receipt-long" size={16} color={colors.primary} />
              <Text style={styles.fareLabel}>Fare Breakdown</Text>
            </View>
            <Text style={styles.noSurgeText}>No surge pricing</Text>
          </View>
          <View style={styles.fareLines}>
            <View style={styles.fareLine}>
              <Text style={styles.fareLineLabel}>Base Fare</Text>
              <Text style={styles.fareLineValue}>₹{vehicle.baseFare}</Text>
            </View>
            <View style={styles.fareLine}>
              <Text style={styles.fareLineLabel}>Distance Charge (RA Puram → Indiranagar)</Text>
              <Text style={styles.fareLineValue}>₹{vehicle.distanceCharge}</Text>
            </View>
            <View style={styles.fareLine}>
              <Text style={styles.fareLineLabel}>Package Protection & Safety</Text>
              <Text style={styles.fareFree}>FREE</Text>
            </View>
          </View>
          <View style={styles.fareDivider} />
          <View style={styles.fareTotalRow}>
            <Text style={styles.fareTotalLabel}>Total Estimated Fare</Text>
            <Text style={styles.fareTotalValue}>₹{vehicle.price}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Dock */}
      <View style={styles.bottomDock}>
        <View style={styles.paymentRow}>
          <View style={styles.paymentLeft}>
            <View style={styles.walletIconWrapper}>
              <MaterialIcon name="account-balance-wallet" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.payingLabel}>Paying via</Text>
              <View style={styles.paymentMethodRow}>
                <Text style={styles.paymentMethod}>Amazon Pay / UPI</Text>
                <MaterialIcon name="expand-more" size={14} color={colors.outline} />
              </View>
            </View>
          </View>
          <View style={styles.otpBadge}>
            <MaterialIcon name="security" size={13} color={colors.primary} />
            <Text style={styles.otpText}>Secured OTP</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.95}
          onPress={requestParcel}
        >
          <Text style={styles.ctaText}>Continue to Delivery Summary — ₹{vehicle.price}</Text>
          <MaterialIcon name="arrow-forward" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  routeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineSpine: {
    alignItems: 'center',
    paddingTop: 4,
  },
  spineDotBlue: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spineDotBlueInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerLowest,
  },
  spineDotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spineDotRedInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerLowest,
  },
  spineLine: {
    width: 2,
    height: 32,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4,
  },
  timelineTextCol: {
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
    gap: 12,
  },
  stopRow: {
    flexDirection: 'column',
    minWidth: 0,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopLabelBlue: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  stopLabelRed: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.accentRed,
    textTransform: 'uppercase',
  },
  stopSepDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outline,
  },
  stopSender: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  stopAddress: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
    marginTop: 2,
  },
  stopReceiver: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  routeToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  tagBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  tagPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagPrimaryText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  tagMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagMutedText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  fastestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fastestText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  vehicleList: {
    flexDirection: 'column',
    gap: 12,
  },
  vehicleCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    gap: 4,
  },
  vehicleCardActive: {
    backgroundColor: colors.lightBlueTint,
  },
  vehicleCardInactive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  vehicleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  vehicleAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '120%',
    height: '120%',
  },
  avatarScooter: {
    backgroundColor: '#FFF0F5', // Light pink/peach for bike
  },
  avatarAuto: {
    backgroundColor: '#FFF8E1', // Light yellow for auto
  },
  vehicleInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleName: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
    flexShrink: 1,
  },
  vehicleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  vehicleBadgeActive: {
    backgroundColor: colors.primary,
  },
  vehicleBadgeInactive: {
    backgroundColor: colors.surfaceContainer,
  },
  vehicleBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  vehicleBadgeTextActive: {
    color: colors.onPrimary,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  etaText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  etaTextActive: {
    color: colors.primary,
  },
  priceCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  priceValue: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.84,
    color: colors.onSurface,
  },
  priceValueActive: {
    color: colors.primary,
  },
  priceCaption: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  vehicleDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    paddingTop: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  instructionsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionsTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  optionalTag: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  notesInput: {
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  instructionChip: {
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  instructionChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  fareCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  fareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fareLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  noSurgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.accentRed,
  },
  fareLines: {
    gap: 6,
    paddingTop: 4,
  },
  fareLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLineLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  fareLineValue: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  fareFree: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.primary,
  },
  fareDivider: {
    height: 2,
    backgroundColor: colors.surfaceContainer,
    marginVertical: 4,
  },
  fareTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  fareTotalValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.primary,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(252, 249, 248, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  paymentLeft: {
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
  payingLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethod: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  otpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  otpText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onPrimary,
  },
});