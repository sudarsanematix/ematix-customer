import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import RealMap from '../components/RealMap';
import SharedHeader from '../components/SharedHeader';
import { useTheme } from '../theme/ThemeProvider';
import { buildMapTheme, type MapThemeTokens } from '../theme/mapTheme';
import { type, spacing, radius, fonts } from '../theme/typography';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';

import { useAuth } from '../context/AuthContext';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

const PLACE_ICONS_FACTORY = (c: any): Record<string, { icon: MaterialIconName; bg: string; color: string }> => ({
  tourist: { icon: 'beach-access', bg: c.lightBlueTint, color: c.primary },
  shopping: { icon: 'storefront', bg: c.surfaceContainer, color: c.onSurfaceVariant },
  transit: { icon: 'train', bg: c.surfaceContainer, color: c.onSurfaceVariant },
  commercial: { icon: 'business', bg: c.surfaceContainer, color: c.onSurfaceVariant },
});

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.34:4000';

const calculateFare = (distKm: number, type: string, serverConfigs: any) => {
  if (!distKm) return 0;
  const typeMap: Record<string, string> = {
    'ride': 'car',
    'parcel': 'parcel_bike',
    'two-wheeler': 'bike',
    'auto': 'auto',
    'prime-sedan': 'car',
    'premium-car': 'premium_car'
  };
  const backendType = typeMap[type] || type;

  const config = serverConfigs && serverConfigs[backendType] ? serverConfigs[backendType] : null;

  if (!config) {
    const c = (backendType === 'auto' ? { base: 45, perKm: 12, min: 60 } : { base: 25, perKm: 7, min: 30 });
    return Math.max(Math.round(c.base + (distKm * c.perKm)), c.min);
  }

  const distance = Math.max(0, distKm);
  const base = config.baseFare || 0;
  const billable = Math.max(0, distance - (config.baseDistanceKm || 0));

  const tier2Thresh = config.tier2DistanceThresholdKm || 999999;
  const baseDist = config.baseDistanceKm || 0;

  const tier1Span = Math.max(0, Math.min(billable, tier2Thresh - baseDist));
  const tier2Span = Math.max(0, billable - tier1Span);

  const tier1 = tier1Span * (config.perKmRate || 0);
  const tier2 = tier2Span * (config.tier2PerKmRate || 0);

  const total = base + tier1 + tier2;
  return Math.max(Math.round(total), config.minFare || 0);
};

export default function DestinationSearchScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const mapTheme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const styles = createStyles(colors, mapTheme);
  const router = useRouter();
  const { vehicle } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [pickup, setPickup] = useState('Current Location');
  const [destination, setDestination] = useState('');
  const [focusedField, setFocusedField] = useState<'pickup' | 'destination'>('destination');
  const [myLocation, setMyLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMapPicking, setIsMapPicking] = useState(false);
  const [mapCenterCoords, setMapCenterCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [fareConfigs, setFareConfigs] = useState<any>(null);
  const [bookingFor, setBookingFor] = useState<'me' | 'someone'>('me');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderError, setRiderError] = useState('');

  const pickupInputRef = useRef<TextInput>(null);
  const destinationInputRef = useRef<TextInput>(null);

  const { user } = useAuth();

  React.useEffect(() => {
    fetch(`${API_BASE}/api/fares`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.fares) {
          setFareConfigs(data.fares);
        }
      })
      .catch(err => console.error('Failed to fetch fares', err));
  }, []);

  const savedChips = useMemo(() => {
    if (!user?.savedLocations) return [];
    return user.savedLocations.map(loc => {
      let icon: MaterialIconName = 'place';
      let primary = false;
      const titleLower = loc.name.toLowerCase();
      if (titleLower.includes('home')) {
        icon = 'home';
        primary = true;
      } else if (titleLower.includes('office') || titleLower.includes('work')) {
        icon = 'apartment';
      } else if (titleLower.includes('gym')) {
        icon = 'fitness-center';
      }
      return { title: loc.name, address: loc.address, icon, primary, lat: loc.lat, lng: loc.lng };
    });
  }, [user]);

  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setMyLocation(coords);
          setPickupCoords(coords);

          // Reverse geocode
          try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.longitude},${coords.latitude}.json?access_token=${MAPBOX_TOKEN}`;
            const res = await fetch(url);
            const data = await res.json();
            const placeName = data.features?.[0]?.text || data.features?.[0]?.place_name || 'Current Location';
            setPickup(placeName);
          } catch (e) {
            console.warn('Initial reverse geocode failed', e);
          }
        }
      } catch (err) {
        console.warn('Location error:', err);
      }
    })();
  }, []);

  React.useEffect(() => {
    const fetchRoute = async () => {
      if (pickupCoords && destinationCoords) {
        try {
          const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
          const pLng = pickupCoords.longitude;
          const pLat = pickupCoords.latitude;
          const dLng = destinationCoords.longitude;
          const dLat = destinationCoords.latitude;
          const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pLng},${pLat};${dLng},${dLat}?geometries=geojson&access_token=${token}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            setRouteCoords(data.routes[0].geometry.coordinates);
            setRouteDistance(data.routes[0].distance); // meters
            setRouteDuration(data.routes[0].duration); // seconds
          }
        } catch (err) {
          console.warn('Error fetching route:', err);
        }
      }
    };
    fetchRoute();
  }, [pickupCoords, destinationCoords]);

  const handleSearch = async (text: string) => {
    if (!text || text.length < 2) {
      setSearchResults([]);
      return;
    }
    const proximity = myLocation ? `&proximity=${myLocation.longitude},${myLocation.latitude}` : '';
    // Added &country=IN to heavily restrict noise from other countries
    const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(text)}&access_token=${MAPBOX_TOKEN}${proximity}&session_token=ematix-session-123&country=IN&limit=10`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const suggestions = data.suggestions || [];
      // Filter out generic categories so we only get real locations
      const realPlaces = suggestions.filter((s: any) => s.feature_type !== 'category');
      const results = realPlaces.map((s: any) => {
        let distStr = '';
        if (s.distance) {
          if (s.distance < 1000) distStr = `${s.distance}m`;
          else distStr = `${(s.distance / 1000).toFixed(1)}km`;
        }
        return {
          title: s.name,
          subtitle: s.place_formatted || s.address || s.full_address || '',
          distance: distStr,
          mapbox_id: s.mapbox_id,
          tagType: s.maki || 'commercial'
        };
      });
      setSearchResults(results);
    } catch (e) {
      console.warn(e);
    }
  };

  React.useEffect(() => {
    const query = focusedField === 'pickup' ? pickup : destination;
    const timer = setTimeout(() => handleSearch(query), 500);
    return () => clearTimeout(timer);
  }, [pickup, destination, focusedField, myLocation]);

  const mapRegion = useMemo(() => {
    const center = pickupCoords ?? destinationCoords ?? myLocation;
    if (!center) return undefined;
    return { latitude: center.latitude, longitude: center.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }, [pickupCoords, destinationCoords, myLocation]);

  const handleBookingForChange = (mode: 'me' | 'someone') => {
    setBookingFor(mode);
    setRiderError('');
    if (mode === 'someone' && (!pickup || pickup === 'Current Location' || pickup === 'Locating...')) {
      // Booking for someone else means the pickup is their location, not the
      // device GPS, so clear the auto-filled current location and ask for it.
      setPickup('');
      setPickupCoords(null);
      setRouteCoords([]);
      setShowConfirm(false);
      setTimeout(() => pickupInputRef.current?.focus(), 100);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Map */}
      <RealMap
        interactive
        style={StyleSheet.absoluteFill}
        region={mapRegion}
        markers={[
          ...(pickupCoords && (!isMapPicking || focusedField !== 'pickup') ? [{ id: 'pickup', latitude: pickupCoords.latitude, longitude: pickupCoords.longitude, color: mapTheme.routeDone, title: 'Pickup' }] : []),
          ...(destinationCoords && (!isMapPicking || focusedField !== 'destination') ? [{ id: 'dropoff', latitude: destinationCoords.latitude, longitude: destinationCoords.longitude, color: mapTheme.success, title: 'Drop-off' }] : [])
        ]}
        routeCoordinates={routeCoords}
        onRegionChange={(region) => {
          if (isMapPicking) {
            setMapCenterCoords(region);
          }
        }}
        mapPadding={isMapPicking ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: 80, bottom: 400, left: 40, right: 40 }}
      >
        {isMapPicking && (
          <View
            style={[
              styles.centerPinWrap,
              { top: bookingFor === 'someone' ? '25%' : '35%' },
            ]}
            pointerEvents="none"
          >
            <View style={styles.centerPinLabelWrap}>
              <View style={[styles.centerPinLabel, { backgroundColor: focusedField === 'pickup' ? colors.primary : colors.accentRed }]}>
                <Text style={styles.centerPinLabelText} numberOfLines={1}>
                  {focusedField === 'pickup' ? 'Pickup location' : 'Drop-off location'}
                </Text>
              </View>
            </View>
            <View style={[styles.centerPinHead, { backgroundColor: focusedField === 'pickup' ? colors.primary : colors.accentRed }]}>
              <View style={styles.centerPinDot} />
            </View>
            <View style={[styles.centerPinStem, { backgroundColor: focusedField === 'pickup' ? colors.primary : colors.accentRed }]} />
            <View style={[styles.centerPinTip, { borderTopColor: focusedField === 'pickup' ? colors.primary : colors.accentRed }]} />
          </View>
        )}
      </RealMap>

      <SharedHeader
        currentScreen="destination-search"
        title="Where to?"
        onBackPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/home');
          }
        }}
      />

      {/* Keyboard Avoiding Container for Bottom Sheet */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        pointerEvents="box-none"
      >
        {/* Transparent spacer to push sheet to the bottom */}
        <View style={styles.flexSpacer} pointerEvents="none" />

        {/* Bottom Sheet */}
        <View style={styles.sheetContainer} pointerEvents="auto">

          {/* Floating Locate Me Button just above the sheet */}
          <TouchableOpacity
            style={styles.locateBtn}
            activeOpacity={0.9}
            onPress={async () => {
              setPickup(t('common.locating'));
              let currentCoords = myLocation;
              if (!currentCoords) {
                try {
                  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
                  currentCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                  setMyLocation(currentCoords);
                } catch (e) {
                  console.warn('GPS failed', e);
                  setPickup(t('booking.currentLocation'));
                  return;
                }
              }
              setPickupCoords(currentCoords);

              // Reverse geocode to get the real address
              try {
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${currentCoords.longitude},${currentCoords.latitude}.json?access_token=${MAPBOX_TOKEN}`;
                const res = await fetch(url);
                const data = await res.json();
                const placeName = data.features?.[0]?.text || data.features?.[0]?.place_name || t('booking.currentLocation');
                setPickup(placeName);
              } catch (e) {
                setPickup(t('booking.currentLocation'));
              }

              if (focusedField === 'pickup') setFocusedField('destination');
            }}
          >
            <MaterialIcon name="my-location" size={24} color={colors.primary} />
            <Text style={styles.locateBtnLabel}>{t('booking.currentLocation')}</Text>
          </TouchableOpacity>

          {/* Sheet Handle */}
          <View style={styles.sheetHandleWrap}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Search Inputs */}
          <View style={styles.searchSection}>
            {vehicle !== 'parcel' && (
              <View style={styles.bookingForRow}>
                <TouchableOpacity
                  style={[styles.bookingForSegment, bookingFor === 'me' && styles.bookingForSegmentActive]}
                  activeOpacity={0.8}
                  onPress={() => handleBookingForChange('me')}
                >
                  <MaterialIcon name="person" size={16} color={bookingFor === 'me' ? colors.onPrimary : colors.onSurfaceVariant} />
                  <Text style={[styles.bookingForText, bookingFor === 'me' && styles.bookingForTextActive]}>
                    {t('booking.forMe')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bookingForSegment, bookingFor === 'someone' && styles.bookingForSegmentActive]}
                  activeOpacity={0.8}
                  onPress={() => handleBookingForChange('someone')}
                >
                  <MaterialIcon name="group" size={16} color={bookingFor === 'someone' ? colors.onPrimary : colors.onSurfaceVariant} />
                  <Text style={[styles.bookingForText, bookingFor === 'someone' && styles.bookingForTextActive]}>
                    {t('booking.forSomeoneElse')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputStack}>

              {/* Pickup */}
              <View style={styles.inputRow}>
                <View style={styles.iconCol}>
                  <View style={styles.blueDotWrap}>
                    <View style={styles.blueDot} />
                  </View>
                </View>
                <View style={[styles.fieldBox, focusedField === 'pickup' && styles.fieldBoxActive]}>
                  <TextInput
                    ref={pickupInputRef}
                    style={styles.destInput}
                    value={pickup}
                    onChangeText={(text) => {
                      setPickup(text);
                      if (text.length === 0) {
                        setPickupCoords(null);
                        setRouteCoords([]);
                        setShowConfirm(false);
                      }
                    }}
                    placeholder={t('booking.pickupLocationPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    onFocus={() => {
                      setFocusedField('pickup');
                      setIsMapPicking(false);
                    }}
                  />
                  {pickup.length > 0 && focusedField === 'pickup' && (
                    <TouchableOpacity onPress={() => {
                      setPickup('');
                      setPickupCoords(null);
                      setRouteCoords([]);
                      setShowConfirm(false);
                    }} style={styles.clearBtn}>
                      <MaterialIcon name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Vertical Connector Line */}
              <View style={styles.connectorLine} />

              {/* Drop-off */}
              <View style={styles.inputRow}>
                <View style={styles.iconCol}>
                  <MaterialIcon name="square" size={10} color={colors.accentRed} />
                </View>
                <View style={[styles.fieldBox, focusedField === 'destination' && styles.fieldBoxActive]}>
                  <TextInput
                    ref={destinationInputRef}
                    style={styles.destInput}
                    value={destination}
                    onChangeText={(text) => {
                      setDestination(text);
                      if (text.length === 0) {
                        setDestinationCoords(null);
                        setRouteCoords([]);
                        setShowConfirm(false);
                      }
                    }}
                    placeholder={t('nav.whereTo')}
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    onFocus={() => {
                      setFocusedField('destination');
                      setIsMapPicking(false);
                    }}
                  />
                  {destination.length > 0 && focusedField === 'destination' && (
                    <TouchableOpacity onPress={() => {
                      setDestination('');
                      setDestinationCoords(null);
                      setRouteCoords([]);
                      setShowConfirm(false);
                    }} style={styles.clearBtn}>
                      <MaterialIcon name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </View>
            {bookingFor === 'someone' && (
              <View style={styles.riderFields}>
                <TextInput
                  style={styles.riderInput}
                  value={riderName}
                  onChangeText={(t) => { setRiderName(t); if (riderError) setRiderError(''); }}
                  placeholder={t('booking.passengerName')}
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={styles.riderInput}
                  value={riderPhone}
                  onChangeText={(t) => { setRiderPhone(t.replace(/[^0-9]/g, '')); if (riderError) setRiderError(''); }}
                  placeholder={t('booking.passengerMobileNumber')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
                {riderError ? <Text style={styles.riderError}>{riderError}</Text> : null}
              </View>
            )}
          </View>

          {/* Conditionally Show Search Results or Confirm Button */}
          {isMapPicking ? (
            <View style={{ padding: 24, paddingBottom: insets.bottom + 24 }}>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>
                {t('booking.dragMapToMovePin')}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
                activeOpacity={0.8}
                onPress={async () => {
                  if (mapCenterCoords) {
                    try {
                      // Reverse geocode to get a nice street name
                      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${mapCenterCoords.longitude},${mapCenterCoords.latitude}.json?access_token=${MAPBOX_TOKEN}`;
                      const res = await fetch(url);
                      const data = await res.json();
                      const placeName = data.features?.[0]?.text || t('booking.pinnedLocation');

                      if (focusedField === 'pickup') {
                        setPickup(placeName);
                        setPickupCoords(mapCenterCoords);
                        setFocusedField('destination');
                      } else {
                        setDestination(placeName);
                        setDestinationCoords(mapCenterCoords);
                        setShowConfirm(true);
                      }
                    } catch (e) {
                      // Fallback
                      if (focusedField === 'pickup') {
                        setPickup(t('booking.pinnedLocation'));
                        setPickupCoords(mapCenterCoords);
                        setFocusedField('destination');
                      } else {
                        setDestination(t('booking.pinnedLocation'));
                        setDestinationCoords(mapCenterCoords);
                        setShowConfirm(true);
                      }
                    }
                  }
                  setIsMapPicking(false);
                }}
              >
                <Text style={{ color: colors.onPrimary, fontSize: 18, fontWeight: '600' }}>
                  {t('booking.confirmLocation')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : !showConfirm ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Saved Places */}
              {savedChips.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedScroll}>
                  {savedChips.map((chip) => (
                    <TouchableOpacity
                      key={chip.title}
                      style={styles.savedChip}
                      activeOpacity={0.8}
                      onPress={async () => {
                        let lat = chip.lat;
                        let lng = chip.lng;

                        // Geocode on the fly if missing (backward compatibility)
                        if (!lat || !lng) {
                          try {
                            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(chip.address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
                            const res = await fetch(url);
                            const data = await res.json();
                            if (data.features && data.features.length > 0) {
                              lng = data.features[0].center[0];
                              lat = data.features[0].center[1];
                            }
                          } catch (e) {
                            console.warn('Geocoding fallback failed', e);
                          }
                        }

                        // Final fallback to current location or default
                        lat = lat || (myLocation ? myLocation.latitude : 13.0450);
                        lng = lng || (myLocation ? myLocation.longitude : 80.2310);

                        if (focusedField === 'pickup') {
                          setPickup(chip.title);
                          setPickupCoords({ latitude: lat, longitude: lng });
                          setFocusedField('destination');
                        } else {
                          setDestination(chip.title);
                          setDestinationCoords({ latitude: lat, longitude: lng });
                          setShowConfirm(true);
                        }
                      }}
                    >
                      <View style={[styles.chipIconWrap, chip.primary ? styles.chipPrimary : styles.chipNeutral]}>
                        <MaterialIcon name={chip.icon} size={20} color={chip.primary ? colors.onPrimary : colors.onSurfaceVariant} />
                      </View>
                      <Text style={styles.chipTitle}>{chip.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.divider} />

              {/* Search Results List */}
              <View style={styles.listContainer}>

                {/* Choose on map button */}
                <TouchableOpacity
                  style={styles.listItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    Keyboard.dismiss();
                    pickupInputRef.current?.blur();
                    destinationInputRef.current?.blur();
                    setIsMapPicking(true);
                  }}
                >
                  <View style={[styles.listIconWrapper, { backgroundColor: mapTheme.brandTint }]}>
                    <MaterialIcon name="place" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.listTextContainer}>
                    <Text style={styles.listTitle} numberOfLines={1}>{t('booking.chooseOnMap')}</Text>
                    <Text style={styles.listSubtitle} numberOfLines={1}>{t('booking.chooseOnMapDesc')}</Text>
                  </View>
                </TouchableOpacity>

                {searchResults.length === 0 && (pickup.length > 1 || destination.length > 1) ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted }}>{t('booking.noExactMatches')}</Text>
                  </View>
                ) : null}

                {searchResults.map((item: any, idx: number) => {
                  const placeIcons = PLACE_ICONS_FACTORY(colors);
                  const iconCfg = placeIcons[item.tagType] || placeIcons.commercial;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.listItem}
                      activeOpacity={0.7}
                      onPress={async () => {
                        // Immediately update UI text so it feels snappy
                        if (focusedField === 'pickup') {
                          setPickup(item.title);
                          setFocusedField('destination');
                        } else {
                          setDestination(item.title);
                          setShowConfirm(true);
                        }

                        // Clear the suggestions list so the map is visible
                        setSearchResults([]);

                        // Fetch the actual coordinates for the selected place in the background
                        if (item.mapbox_id) {
                          try {
                            const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${item.mapbox_id}?access_token=${MAPBOX_TOKEN}&session_token=ematix-session-123`;
                            const res = await fetch(retrieveUrl);
                            const data = await res.json();
                            if (data.features && data.features.length > 0) {
                              const coords = data.features[0].geometry.coordinates;
                              const finalCoords = { latitude: coords[1], longitude: coords[0] };
                              if (focusedField === 'pickup') {
                                setPickupCoords(finalCoords);
                              } else {
                                setDestinationCoords(finalCoords);
                              }
                            }
                          } catch (e) {
                            console.warn('Failed to retrieve coordinates', e);
                          }
                        } else if (item.center) {
                          const finalCoords = { latitude: item.center[1], longitude: item.center[0] };
                          if (focusedField === 'pickup') {
                            setPickupCoords(finalCoords);
                          } else {
                            setDestinationCoords(finalCoords);
                          }
                        }
                      }}
                    >
                      <View style={[styles.listIconWrapper, { backgroundColor: iconCfg.bg }]}>
                        <MaterialIcon name={iconCfg.icon} size={20} color={iconCfg.color} />
                      </View>
                      <View style={styles.listTextContainer}>
                        <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.listSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                      </View>
                      {item.distance ? (
                        <View style={{ paddingLeft: 8 }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>{item.distance}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={{ padding: 24, paddingBottom: insets.bottom + 24 }}>
              {routeDistance != null && routeDuration != null && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.onSurface, marginBottom: 12, paddingHorizontal: 4 }}>
                    {t('booking.tripSummary')}
                  </Text>

                  <View style={[styles.summaryCard, { borderColor: mapTheme.glassBorder }]}>

                    {/* Distance */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={styles.summaryIcon}>
                        <MaterialIcon name="route" size={20} color={colors.primary} />
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4, fontWeight: '500' }}>
                        {t('booking.distance')}
                      </Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.onSurface }}>
                        {(routeDistance / 1000).toFixed(1)} {t('common.km')}
                      </Text>
                    </View>

                    {/* Divider */}
                    <View style={{ width: 1, backgroundColor: colors.outline, marginVertical: 8 }} />

                    {/* Time */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={styles.summaryIcon}>
                        <MaterialIcon name="schedule" size={20} color={colors.primary} />
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4, fontWeight: '500' }}>
                        {t('booking.estTime')}
                      </Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.onSurface }}>
                        {Math.ceil(routeDuration / 60)} {t('common.mins')}
                      </Text>
                    </View>

                    {/* Divider */}
                    <View style={{ width: 1, backgroundColor: colors.outline, marginVertical: 8 }} />

                    {/* Price */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={[styles.summaryIcon, { backgroundColor: mapTheme.successTint }]}>
                        <MaterialIcon name="payments" size={20} color={mapTheme.success} />
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4, fontWeight: '500' }}>
                        {vehicle === 'parcel' ? t('package.startingFare') : t('booking.fare')}
                      </Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: mapTheme.success }}>
                        ₹{calculateFare(routeDistance / 1000, vehicle as string, fareConfigs)}
                      </Text>
                    </View>

                  </View>
                </View>
              )}
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}
                activeOpacity={0.8}
                onPress={() => {
                  if (bookingFor === 'someone') {
                    const name = riderName.trim();
                    const phoneDigits = riderPhone.replace(/\D/g, '');
                    if (!pickupCoords) {
                      setRiderError(t('booking.pleaseChoosePickup'));
                      return;
                    }
                    if (!name) {
                      setRiderError(t('booking.pleaseEnterPassengerName'));
                      return;
                    }
                    if (phoneDigits.length < 10) {
                      setRiderError(t('booking.pleaseEnterValidMobile'));
                      return;
                    }
                  }
                  const params = {
                    vehicle,
                    pickup,
                    destination,
                    dropoff: destination,
                    pickupLat: pickupCoords?.latitude,
                    pLat: pickupCoords?.latitude,
                    pickupLng: pickupCoords?.longitude,
                    pLng: pickupCoords?.longitude,
                    dropoffLat: destinationCoords?.latitude,
                    dLat: destinationCoords?.latitude,
                    dropoffLng: destinationCoords?.longitude,
                    dLng: destinationCoords?.longitude,
                    distance: routeDistance,
                    duration: routeDuration,
                    ...(bookingFor === 'someone'
                      ? {
                        bookedForOthers: '1',
                        riderName: riderName.trim(),
                        riderPhone: riderPhone.replace(/\D/g, ''),
                      }
                      : {}),
                  };
                  if (vehicle === 'parcel') {
                    router.push({ pathname: '/package-details', params: params as any });
                  } else {
                    router.push({ pathname: '/select-ride', params: params as any });
                  }
                }}
              >
                <Text style={{ color: colors.onPrimary, fontSize: 18, fontWeight: '600' }}>
                  {t('booking.continueToVehicles')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, mapTheme: MapThemeTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
    zIndex: 10,
  },
  flexSpacer: {
    flex: 1,
  },
  backBtnWrap: {
    position: 'absolute',
    left: spacing.marginMobile,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: mapTheme.glass,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: mapTheme.brandTintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  centerPinWrap: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    marginLeft: -13,
    marginTop: -51, // Offset so the tip of the pin touches the exact center
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  centerPinLabelWrap: {
    position: 'absolute',
    bottom: '100%',
    left: -120,
    right: -120,
    alignItems: 'center',
    marginBottom: 8,
  },
  centerPinLabel: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  centerPinLabelText: {
    ...type.labelSm,
    color: '#fff',
    fontFamily: fonts.semibold,
  },
  centerPinHead: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  centerPinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  centerPinStem: {
    width: 3,
    height: 18,
    marginVertical: -1, // merge into head & tip so no gaps
  },
  centerPinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%', // Allows it to grow up to 80% of screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    // Add extra padding at the bottom to ensure it completely covers the bottom edge safely
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  locateBtn: {
    position: 'absolute',
    top: -56,
    right: spacing.marginMobile,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  locateBtnLabel: {
    ...type.labelSm,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  sheetHandleWrap: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  searchSection: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.stackLg,
  },
  bookingForRow: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  bookingForSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
  },
  bookingForSegmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bookingForText: {
    ...type.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: fonts.semibold,
  },
  bookingForTextActive: {
    color: colors.onPrimary,
  },
  riderFields: {
    marginTop: spacing.stackMd,
    gap: spacing.stackSm,
  },
  riderInput: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    ...type.bodyLg,
    color: colors.onSurface,
  },
  riderError: {
    ...type.bodySm,
    color: colors.accentRed,
  },
  inputStack: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
  },
  iconCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueDotWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  fieldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 8,
  },
  fieldBoxActive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  fieldValue: {
    ...type.bodyLg,
    color: colors.onSurface,
  },
  destInput: {
    flex: 1,
    ...type.bodyLg,
    color: colors.onSurface,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  connectorLine: {
    position: 'absolute',
    left: 27,
    top: 44,
    bottom: 44,
    width: 2,
    backgroundColor: colors.surfaceContainerHigh,
    zIndex: -1,
  },
  scrollArea: {
    // Limits the list from stretching the sheet beyond maxHeight
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.stackXl,
  },
  savedScroll: {
    paddingHorizontal: spacing.marginMobile,
    gap: spacing.stackMd,
    paddingBottom: spacing.stackMd,
  },
  savedChip: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  chipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipPrimary: {
    backgroundColor: colors.primary,
  },
  chipNeutral: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipTitle: {
    ...type.labelSm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  divider: {
    height: 8,
    backgroundColor: colors.surfaceContainerLowest,
    marginVertical: spacing.stackSm,
  },
  listContainer: {
    paddingHorizontal: spacing.marginMobile,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLowest,
    gap: spacing.stackMd,
  },
  listIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listTextContainer: {
    flex: 1,
  },
  listTitle: {
    ...type.labelMd,
    color: colors.onSurface,
    fontFamily: fonts.semibold,
    marginBottom: 2,
  },
  listSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
  },
});