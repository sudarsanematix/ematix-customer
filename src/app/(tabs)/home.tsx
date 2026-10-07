import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { buildMapTheme, type MapThemeTokens } from '../../theme/mapTheme';
import { fonts, type, spacing, radius } from '../../theme/typography';
import SharedHeader from '../../components/SharedHeader';
import MaterialIcon from '../../components/MaterialIcon';
import RealMap, { CHENNAI_REGION } from '../../components/RealMap';
import { markerImageFor } from '../../components/markerImages';
import type { LiveVehicleKind } from '../../components/liveMapTypes';
import Skeleton from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { socketService } from '../../utils/socket';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

function PingRing({ color, size }: { color: string; size: number }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, buildMapTheme(isDark));
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.pingRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        },
      ]}
    />
  );
}

function PulsingDot({ color, size = 8 }: { color: string; size?: number }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: anim }} />
  );
}

const HOME_PLACE_ICONS = (c: any): Record<string, { icon: any; bg: any; color: any }> => ({
  home: { icon: 'home' as const, bg: c.lightBlueTint, color: c.primary },
  work: { icon: 'corporate-fare' as const, bg: c.surfaceContainerHigh, color: c.onSurface },
  default: { icon: 'sports-tennis' as const, bg: c.surfaceContainerHigh, color: c.onSurface },
});

// Places are moved inside component to access dynamic colors

type ServiceType = 'ride' | 'parcel';

/**
 * The chips are UI groupings, not backend values. Every chip must list the real
 * `Partner.vehicleType` values it stands for, otherwise a live partner is
 * filtered out and the radar silently renders nothing. The current enum is
 * `bike | auto | car | premium_car | parcel_bike | parcel_auto`
 * (`models/Partner.js`); `prime_sedan` / `mini_truck` survive in partner
 * documents written before the vocabulary changed, so chips list those too.
 * Partner signup defaults to Bike and the partner app falls back to `bike`,
 * so every service must offer a chip that matches each signup value.
 */
type RadarVehicleKind =
  | LiveVehicleKind
  | 'parcel_bike'
  | 'parcel_auto'
  | 'prime_sedan'
  | 'mini_truck';

type VehicleChip = {
  key: string;
  label: string;
  kinds: RadarVehicleKind[];
};

const VEHICLES_BY_SERVICE: Record<ServiceType, VehicleChip[]> = {
  ride: [
    { key: 'car', label: 'Economic Car', kinds: ['car'] },
    { key: 'premium_car', label: 'Premium Taxi', kinds: ['premium_car', 'prime_sedan'] },
    { key: 'auto', label: 'Auto', kinds: ['auto'] },
  ],
  parcel: [
    { key: 'bike', label: 'Bike', kinds: ['bike', 'parcel_bike'] },
    { key: 'auto', label: 'Auto', kinds: ['auto', 'parcel_auto', 'mini_truck'] },
  ],
};

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const mapTheme = useMemo(() => buildMapTheme(isDark), [isDark]);
  const styles = createStyles(colors, mapTheme);

  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyPartners, setNearbyPartners] = useState<any[]>([]);
  const [myLocation, setMyLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [bootRegion, setBootRegion] = useState<{ latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number } | null>(null);
  const [addressName, setAddressName] = useState('Locating...');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [serviceType, setServiceType] = useState<ServiceType>('ride');
  const [vehicleChipKey, setVehicleChipKey] = useState<string>('car');

  const chips = VEHICLES_BY_SERVICE[serviceType];
  // Guards against a stale key when the service changes under us.
  const activeChip = chips.find((c) => c.key === vehicleChipKey) ?? chips[0];

  const handleServiceChange = (service: ServiceType) => {
    setServiceType(service);
    setVehicleChipKey(VEHICLES_BY_SERVICE[service][0].key);
  };

  /** Keeps the chip's pin colour and the map markers on one source of truth. */
  const markerColorFor = (kind?: string) =>
    kind === 'bike' || kind === 'auto' || kind === 'parcel_bike' || kind === 'parcel_auto'
      ? mapTheme.success
      : mapTheme.routeDone;

  const locateMe = async () => {
    setAddressName('Locating...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setMyLocation({ latitude: lat, longitude: lng });

        // Cache valid GPS fix for next startup
        if (loc.coords.accuracy && loc.coords.accuracy < 1000) {
          AsyncStorage.setItem('@last_known_location', JSON.stringify({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          })).catch(() => { });
        }

        const fetchOSM = async (lat: number, lng: number) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
              headers: { 'User-Agent': 'EmatixApp/1.0' }
            });
            const data = await res.json();
            if (data && data.address) {
              const addr = data.address;
              const street = addr.road || addr.pedestrian || '';
              const area = addr.neighbourhood || addr.suburb || addr.city_district || addr.city || addr.town || '';
              if (street && area && street !== area) return `${street}, ${area}`;
              if (area) return area;
              if (street) return street;
              return data.name || data.display_name?.split(',')[0] || null;
            }
          } catch (e) {
            return null;
          }
          return null;
        };

        try {
          const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (geocode && geocode.length > 0) {
            const place = geocode[0];

            // Build a more user-friendly location name
            const streetInfo = [place.streetNumber, place.street].filter(Boolean).join(' ');
            const neighborhood = place.district || place.subregion || place.city || place.region;

            let finalName = '';
            if (place.name && place.name !== streetInfo && place.name !== neighborhood) {
              finalName = place.name;
              if (neighborhood) finalName += `, ${neighborhood}`;
            } else if (streetInfo) {
              finalName = streetInfo;
              if (neighborhood) finalName += `, ${neighborhood}`;
            } else if (neighborhood) {
              finalName = neighborhood;
            }

            if (!finalName) {
              finalName = (await fetchOSM(lat, lng)) || place.country || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
            }

            setAddressName(finalName);
          } else {
            const osmName = await fetchOSM(lat, lng);
            setAddressName(osmName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
          }
        } catch (err) {
          // If geocoding fails, at least show coordinates so we know it worked!
          const osmName = await fetchOSM(lat, lng);
          setAddressName(osmName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
        }
      } else {
        setAddressName('Location denied');
      }
    } catch (err) {
      setAddressName('Location unavailable');
    }
  };

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem('@last_known_location');
        if (cached) {
          setBootRegion(JSON.parse(cached));
        } else {
          setBootRegion(CHENNAI_REGION);
        }
      } catch (e) {
        setBootRegion(CHENNAI_REGION);
      }
    };
    loadCache();

    locateMe();

    // Simulate fetching data from backend
    const timer = setTimeout(() => setIsLoading(false), 2000);

    // Fetch real nearby partners. The listeners are bound first so the reply
    // can never land before there is anything to receive it.
    socketService.connect();

    const handleNearbyPartners = (partners: any[]) => {
      setNearbyPartners(Array.isArray(partners) ? partners : []);
    };

    const handlePartnerLocationUpdated = (partner: any) => {
      if (!partner?.partnerId) return;
      setNearbyPartners(prev => {
        const index = prev.findIndex(p => p.partnerId === partner.partnerId);
        if (index >= 0) {
          const newArr = [...prev];
          newArr[index] = partner;
          return newArr;
        }
        return [...prev, partner];
      });
    };

    // Rooms live and die with the connection: every (re)connect has to
    // re-request the snapshot, or a dropped socket leaves the customer out of
    // ROOM_RIDERS_SEARCHING with no way back in.
    const syncNearbyPartners = () => socketService.emit('get_nearby_partners', {});

    socketService.on('nearby_partners', handleNearbyPartners);
    socketService.on('partner_location_updated', handlePartnerLocationUpdated);
    socketService.on('connect', syncNearbyPartners);
    socketService.emit('get_nearby_partners', {});

    return () => {
      clearTimeout(timer);
      socketService.off('nearby_partners', handleNearbyPartners);
      socketService.off('partner_location_updated', handlePartnerLocationUpdated);
      socketService.off('connect', syncNearbyPartners);
    };
  }, []);

  const filteredPartners = useMemo(() => {
    const kinds = activeChip.kinds;
    return nearbyPartners.filter((partner: any) => {
      const lat = partner?.lat ?? partner?.latitude;
      const lng = partner?.lng ?? partner?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return false;
      }
      // Server sends `vehicleType` from the Partner enum. Anything else is a
      // malformed record and must not be shown on the radar.
      return kinds.includes(partner.vehicleType);
    });
  }, [nearbyPartners, activeChip]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="home" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {/* Greeting + location */}
        <View style={styles.greetingRow}>
          <View>
            {isLoading ? (
              <Skeleton width={120} height={28} radius={6} style={{ marginBottom: 4 }} />
            ) : (
              <Text style={styles.greeting}>Hello, {user?.name || user?.phone || 'Guest'} 👋</Text>
            )}
            <TouchableOpacity style={styles.locationBtn} activeOpacity={0.8} onPress={locateMe}>
              <MaterialIcon name="near-me" size={18} color={colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>{addressName}</Text>
              <MaterialIcon name="expand-more" size={16} color={colors.outline} />
            </TouchableOpacity>
          </View>
          <View style={styles.notifWrap}>
            <TouchableOpacity
              style={styles.notifBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/notifications')}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              hitSlop={8}
            >
              <MaterialIcon name="notifications" size={20} color={colors.onSurface} />
            </TouchableOpacity>
            <View style={styles.notifDot} />
          </View>
        </View>

        {/* Search card */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputRow}>
            <MaterialIcon name="search" size={22} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Where do you want to go?"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={styles.micBtn} activeOpacity={0.8}>
              <MaterialIcon name="mic" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
            {user?.savedLocations?.find((loc: any) => loc.name.toLowerCase() === 'work') && (
              <TouchableOpacity style={styles.tag}>
                <MaterialIcon name="work" size={16} color={colors.primary} />
                <Text style={[styles.tagText, { maxWidth: 150 }]} numberOfLines={1}>Work • {user?.savedLocations?.find((loc: any) => loc.name.toLowerCase() === 'work')?.address}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.tag}>
              <MaterialIcon name="shopping-bag" size={16} color={colors.accentRed} />
              <Text style={styles.tagText}>Phoenix Marketcity</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tag, styles.tagRecent]}>
              <MaterialIcon name="history" size={16} color={colors.primary} />
              <Text style={styles.tagRecentText}>Recent</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Core actions grid */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionCard}>
            <View style={styles.rideDecor} />
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.lightBlueTint }]}>
                <MaterialIcon name="local-taxi" size={24} color={colors.primary} />
              </View>
              <View style={styles.etaBadge}>
                <PingRing color={colors.primary} size={6} />
                <Text style={styles.etaText}>3m away</Text>
              </View>
            </View>
            <Text style={styles.actionTitle}>Book a Ride</Text>
            <Text style={styles.actionDesc}>Autos & Cabs with guaranteed upfront fares</Text>
            <TouchableOpacity style={[styles.actionBtn, styles.rideBtn]} activeOpacity={0.85} onPress={() => router.push('/choose-vehicle')}>
              <Text style={styles.rideBtnText}>Ride Now</Text>
              <MaterialIcon name="arrow-forward" size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.sendDecor} />
            <View style={styles.actionHeader}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
                <MaterialIcon name="inventory-2" size={24} color={colors.accentRed} />
              </View>
              <View style={styles.doorBadge}>
                <Text style={styles.doorText}>Door-to-door</Text>
              </View>
            </View>
            <Text style={styles.actionTitle}>Send Parcel</Text>
            <Text style={styles.actionDesc}>Instant delivery via Two-wheelers & Autos</Text>
            <TouchableOpacity style={[styles.actionBtn, styles.sendBtn]} activeOpacity={0.85} onPress={() => router.push('/destination-search?vehicle=parcel')}>
              <Text style={styles.sendBtnText}>Send Now</Text>
              <MaterialIcon name="send" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ask Ematix AI card */}
        <View style={styles.aiCard}>
          <View style={styles.aiDecor} />
          <View style={styles.aiHeader}>
            <View style={styles.aiHeaderLeft}>
              <View style={styles.aiIconWrap}>
                <MaterialIcon name="auto-awesome" size={20} color={colors.onPrimary} />
              </View>
              <View>
                <Text style={styles.aiTitle}>Ask Ematix</Text>
                <Text style={styles.aiSubtitle}>Smart Mobility & Delivery Concierge</Text>
              </View>
            </View>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI Agent</Text>
            </View>
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiPrompt}>How can I assist your travel or delivery today?</Text>
            <View style={styles.aiChips}>
              <TouchableOpacity style={styles.aiChip} activeOpacity={0.85}>
                <Text style={styles.aiChipText}>⚡ Book auto to T. Nagar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiChip} activeOpacity={0.85}>
                <Text style={styles.aiChipText}>📊 Compare Auto vs Cab</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiChip} activeOpacity={0.85}>
                <Text style={styles.aiChipText}>📦 Send parcel to Anna Nagar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.aiInputRow}>
            <TextInput
              style={styles.aiInput}
              placeholder="Type or ask Ematix anything..."
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={styles.aiSendBtn} activeOpacity={0.85}>
              <MaterialIcon name="arrow-upward" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Vehicles Nearby */}
        <View style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <View>
              <Text style={styles.radarTitle}>Live Vehicles Nearby</Text>
              <Text style={styles.radarSubtitle}>
                {filteredPartners.length} {activeChip.label}
                {filteredPartners.length === 1 ? '' : 's'} active
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <PulsingDot color={colors.primary} />
              <Text style={styles.liveText}>Live Radar</Text>
            </View>
          </View>

          {/* Segmented Controls */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 8 }}>
              {(['ride', 'parcel'] as ServiceType[]).map((service) => {
                const isActive = serviceType === service;
                return (
                  <TouchableOpacity
                    key={service}
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: isActive ? colors.primary : 'transparent' }}
                    onPress={() => handleServiceChange(service)}
                  >
                    <Text style={{ fontWeight: '600', color: isActive ? colors.onPrimary : colors.onSurface }}>
                      {service === 'ride' ? '🚗 Ride' : '📦 Parcel'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {chips.map((chip) => {
                const isActive = activeChip.key === chip.key;
                
                // Map the chip key to the proper local logo asset
                let chipImage;
                switch (chip.key) {
                  case 'car':
                    chipImage = require('../../../assets/images/economiccarlogo.png');
                    break;
                  case 'premium_car':
                    chipImage = require('../../../assets/images/Premiumcarlogo.png');
                    break;
                  case 'auto':
                    chipImage = require('../../../assets/images/Autologo.png');
                    break;
                  case 'bike':
                    chipImage = require('../../../assets/images/Bikelogo.png');
                    break;
                  default:
                    chipImage = require('../../../assets/images/economiccarlogo.png');
                }

                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 2, alignItems: 'center', borderRadius: 12, borderWidth: 2, borderColor: isActive ? colors.primary : colors.outline, backgroundColor: isActive ? colors.primary + '11' : colors.surface }}
                    onPress={() => setVehicleChipKey(chip.key)}
                  >
                    <Image source={chipImage} style={{ width: 40, height: 40, marginBottom: 8, resizeMode: 'contain' }} />
                    <Text style={{ fontWeight: '600', fontSize: 12, textAlign: 'center', color: isActive ? colors.primary : colors.onSurfaceVariant }} numberOfLines={2}>{chip.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View
            style={styles.mapBox}
            onTouchStart={() => setScrollEnabled(false)}
            onTouchEnd={() => setScrollEnabled(true)}
            onTouchCancel={() => setScrollEnabled(true)}
          >
            {bootRegion ? (
              <RealMap
                interactive
                style={styles.mapImage}
                region={myLocation ? { latitude: myLocation.latitude, longitude: myLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 } : bootRegion}
                markers={[
                  ...(myLocation ? [{ id: 'me', latitude: myLocation.latitude, longitude: myLocation.longitude, color: mapTheme.onBase }] : []),
                  ...filteredPartners.map(p => ({
                    id: p.partnerId,
                    latitude: p.lat ?? p.latitude,
                    longitude: p.lng ?? p.longitude,
                    vehicleType: p.vehicleType,
                    color: markerColorFor(p.vehicleType)
                  }))
                ]}
              />
            ) : null}
            <TouchableOpacity
              style={{ position: 'absolute', bottom: 16, right: 16, backgroundColor: colors.surface, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}
              activeOpacity={0.8}
              onPress={locateMe}
            >
              <MaterialIcon name="my-location" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.mapOverlay} pointerEvents="none" />
            {filteredPartners.length === 0 ? (
              <View style={styles.mapEmpty} pointerEvents="none">
                <MaterialIcon name="near-me" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.mapEmptyText}>
                  No {activeChip.label.toLowerCase()}s nearby right now
                </Text>
              </View>
            ) : null}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: markerColorFor(activeChip.kinds[0]) }]} />
                <Text style={styles.legendText}>{activeChip.label}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Destinations */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.radarTitle}>Recent Destinations</Text>
            <TouchableOpacity activeOpacity={0.85}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentList}>
            {isLoading
              ? [1, 2, 3].map((key) => (
                <View key={key} style={styles.recentCard}>
                  <View style={styles.recentCardLeft}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <View style={styles.recentTextWrap}>
                      <Skeleton variant="text" width="60%" height={14} style={{ marginBottom: 4 }} />
                      <Skeleton variant="text" width="85%" height={12} />
                    </View>
                  </View>
                  <Skeleton width={70} height={36} radius={8} />
                </View>
              ))
              : (user?.savedLocations || []).map((p: any, index: number) => {
                const tagType = p.name.toLowerCase();
                const placeCfg = HOME_PLACE_ICONS(colors)[tagType] || HOME_PLACE_ICONS(colors).default;
                return (
                  <TouchableOpacity key={index.toString()} style={styles.recentCard} activeOpacity={0.9}>
                    <View style={styles.recentCardLeft}>
                      <View style={[styles.recentIconWrap, { backgroundColor: placeCfg.bg }]}>
                        <MaterialIcon name={placeCfg.icon} size={22} color={placeCfg.color} />
                      </View>
                      <View style={styles.recentTextWrap}>
                        <Text style={styles.recentTitle} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.recentAddr} numberOfLines={1}>{p.address}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.rebookBtn} activeOpacity={0.85}>
                      <Text style={styles.rebookText}>Rebook</Text>
                      <MaterialIcon name="chevron-right" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>

        {/* SafeRide banner */}
        <View style={styles.safeRideCard}>
          <View style={styles.safeRideIconWrap}>
            <MaterialIcon name="shield" size={28} color={colors.primary} />
          </View>
          <View style={styles.safeRideTextWrap}>
            <Text style={styles.safeRideTitle}>Ematix SafeRide Active</Text>
            <Text style={styles.safeRideDesc}>Verified captains & real-time route deviation protection enabled.</Text>
          </View>
          <MaterialIcon name="verified" size={20} color={colors.primary} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, mapTheme: MapThemeTokens) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: {
    padding: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    paddingBottom: 132,
    gap: spacing.stackLg,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { ...type.headlineMd, color: colors.onSurface },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locationText: { ...type.labelMd, color: colors.onSurfaceVariant },
  notifWrap: { position: 'relative' },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
  },
  searchCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: spacing.stackSm,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    borderRadius: radius.lg,
    gap: spacing.stackSm,
  },
  searchInput: {
    flex: 1,
    ...type.bodyMd,
    color: colors.onSurface,
    padding: 0,
  },
  micBtn: { padding: 4, borderRadius: 999 },
  tagsRow: { gap: 8, paddingTop: 4, paddingRight: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
  },
  tagRecent: { backgroundColor: colors.lightBlueTint },
  tagText: { ...type.labelSm, color: colors.onSurfaceVariant },
  tagRecentText: { ...type.labelSm, color: colors.primary },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between',
  },
  rideDecor: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.lightBlueTint,
  },
  sendDecor: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.surfaceContainerHigh,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 1,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 6,
    height: 20,
  },
  pingRing: { position: 'absolute' },
  etaText: { ...type.labelSm, color: colors.primary, fontSize: 11 },
  doorBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  doorText: { ...type.labelSm, color: colors.textMuted, fontSize: 11 },
  actionTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    marginTop: 8,
    zIndex: 1,
  },
  actionDesc: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 4,
    zIndex: 1,
  },
  actionBtn: {
    marginTop: 12,
    width: '100%',
    height: 40,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  rideBtn: { backgroundColor: colors.primaryContainer },
  rideBtnText: { ...type.labelMd, color: colors.onPrimary },
  sendBtn: { backgroundColor: colors.lightBlueTint },
  sendBtnText: { ...type.labelMd, color: colors.primary },
  aiCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.stackMd,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  aiDecor: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(128,159,254,0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  aiHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitle: { ...type.headlineSm, color: colors.onPrimary, letterSpacing: -0.3 },
  aiSubtitle: { ...type.bodySm, color: colors.onPrimaryContainer },
  aiBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  aiBadgeText: { ...type.labelSm, color: colors.onPrimary, fontSize: 11 },
  aiContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.stackSm,
    borderRadius: radius.lg,
    zIndex: 1,
  },
  aiPrompt: { ...type.bodyMd, color: colors.onPrimary, marginBottom: spacing.stackSm },
  aiChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  aiChipText: { ...type.labelSm, color: colors.onPrimary },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.onPrimary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 8,
    zIndex: 1,
  },
  aiInput: { flex: 1, ...type.bodyMd, color: colors.onSurface, padding: 0 },
  aiSendBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.stackMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radarTitle: { ...type.headlineSm, color: colors.onSurface },
  radarSubtitle: { ...type.bodySm, color: colors.textMuted },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  liveText: { ...type.labelSm, color: colors.primary, fontFamily: fonts.semibold },
  mapBox: {
    height: 192,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: mapTheme.brandTint,
  },
  mapEmpty: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: mapTheme.glass,
    borderWidth: 1,
    borderColor: mapTheme.glassBorder,
  },
  mapEmptyText: { ...type.labelSm, color: colors.onSurfaceVariant },
  youWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -8,
    marginLeft: -8,
    alignItems: 'center',
  },
  youDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  youLabel: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  youLabelText: { ...type.labelSm, color: colors.primary, fontFamily: fonts.bold },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: mapTheme.glass,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...type.labelSm, color: colors.onSurface },
  recentSection: { flexDirection: 'column', gap: spacing.stackSm },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  seeAll: { ...type.labelMd, color: colors.primary },
  recentList: { flexDirection: 'column', gap: 8 },
  recentCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.cardPadding,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  recentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTextWrap: { flexDirection: 'column', flex: 1, minWidth: 0 },
  recentTitle: { ...type.labelLg, color: colors.onSurface },
  recentAddr: { ...type.bodySm, color: colors.textMuted },
  rebookBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGray,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  rebookText: { ...type.labelMd, color: colors.primary, fontSize: 12 },
  safeRideCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.cardPadding,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  safeRideIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeRideTextWrap: { flex: 1, minWidth: 0 },
  safeRideTitle: { ...type.labelLg, color: colors.onSurface },
  safeRideDesc: { ...type.bodySm, color: colors.textMuted, marginTop: 2 },
});