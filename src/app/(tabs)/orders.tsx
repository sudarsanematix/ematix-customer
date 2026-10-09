import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import SharedHeader from '../../components/SharedHeader';
import Skeleton from '../../components/Skeleton';
import MaterialIcon from '../../components/MaterialIcon';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../utils/api';

type HistoryRide = {
  id: string;
  type: string;
  status: string;
  price: number | string | null;
  pickup: { address?: string } | null;
  dropoff: { address?: string } | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string;
  partner: {
    name: string;
    vehicleModel: string;
    vehicleNumber: string;
    vehicleType: string;
    rating: number;
    ratingCount: number;
  } | null;
  rated: boolean;
  rating: number | null;
};

const VEHICLE_LABELS: Record<string, string> = {
  bike: 'Bike',
  auto: 'Auto',
  car: 'Economic Car',
  premium_car: 'Premium Taxi',
};

const formatWhen = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const titleFor = (ride: HistoryRide) => {
  if (ride.type === 'parcel' || ride.type === 'delivery') {
    return ride.status === 'cancelled' ? 'Cancelled delivery' : 'Parcel delivery';
  }
  const rawType = ride.partner?.vehicleType || (ride as any).vehicleType || '';
  // If backend stored the display name instead of the ID
  if (rawType.toLowerCase().includes('car') || rawType.toLowerCase().includes('auto') || rawType.toLowerCase().includes('taxi')) {
    // Avoid appending ' ride' if it already sounds complete, unless it's just 'auto'
    if (rawType.toLowerCase() === 'auto' || rawType.toLowerCase() === 'car') {
      return `${rawType.charAt(0).toUpperCase() + rawType.slice(1)} ride`;
    }
    return rawType;
  }
  const label = VEHICLE_LABELS[rawType] || rawType || 'Ride';
  return `${label} ride`;
};

const getRideImage = (order: HistoryRide) => {
  const vType = (order.partner?.vehicleType || (order as any).vehicleType || '').toLowerCase();
  
  if (vType === 'auto' || vType.includes('auto')) return require('../../../assets/images/auto.png');
  if (vType === 'premium_car' || vType.includes('premium') || vType.includes('taxi')) return require('../../../assets/images/premium_car.png');
  if (vType === 'car' || vType.includes('economic') || vType.includes('sedan')) return require('../../../assets/images/car.png');
  
  return require('../../../assets/images/bike.jpg');
};

export default function OrdersScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const router = useRouter();
  const { token } = useAuth();
  const [filter, setFilter] = useState('all');
  const [rides, setRides] = useState<HistoryRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refetch whenever the tab regains focus (useFocusEffect also fires on mount)
  // so a rating submitted on /rate is reflected on return.
  const load = useCallback(async () => {
    if (!token) {
      setError('Please login to see your trips');
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await authedFetch('/api/rides/history?limit=50', token);
      setRides(Array.isArray(data?.rides) ? data.rides : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load your trips');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredOrders = rides.filter((ride) => {
    if (filter === 'rides') return ride.type === 'ride';
    if (filter === 'deliveries') return ride.type === 'delivery' || ride.type === 'parcel';
    return true;
  });

  return (
    <View style={styles.container}>
      <SharedHeader currentScreen="orders" />
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Activity & Trips</Text>
          <Text style={styles.subtitle}>Past rides and parcel deliveries</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {['all', 'rides', 'deliveries'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.tab, filter === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab === 'all'
                  ? `All (${rides.length})`
                  : tab === 'rides'
                    ? `Rides (${rides.filter((r) => r.type === 'ride').length})`
                    : `Deliveries (${rides.filter((r) => r.type === 'parcel' || r.type === 'delivery').length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <View style={styles.list}>
          {isLoading ? (
            [1, 2, 3].map((key) => (
              <View key={key} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <View>
                      <Skeleton variant="text" width={100} height={14} style={{ marginBottom: 4 }} />
                      <Skeleton variant="text" width={70} height={12} />
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Skeleton variant="text" width={50} height={16} style={{ marginBottom: 4 }} />
                    <Skeleton width={60} height={20} radius={10} />
                  </View>
                </View>
                <Skeleton width="100%" height={60} radius={12} style={{ marginBottom: 12 }} />
                <View style={styles.actionsRow}>
                  <Skeleton variant="text" width={80} height={14} />
                  <View style={styles.buttonsRow}>
                    <Skeleton width={80} height={28} radius={8} />
                    <Skeleton width={80} height={28} radius={8} />
                  </View>
                </View>
              </View>
            ))
          ) : error ? (
            <View style={styles.emptyState}>
              <MaterialIcon name="cloud-off" size={48} color={colors.outlineVariant} />
              <Text style={styles.emptyTitle}>Could not load your trips</Text>
              <Text style={styles.emptySubtitle}>{error}</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => { setIsLoading(true); load(); }}>
                <Text style={styles.btnPrimaryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcon name="receipt-long" size={48} color={colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No {filter === 'rides' ? 'rides' : filter === 'deliveries' ? 'deliveries' : 'orders'} yet</Text>
              <Text style={styles.emptySubtitle}>Your past trips and deliveries will show up here.</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.iconContainer}>
                      <Image
                        source={getRideImage(order)}
                        style={styles.cardIcon}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderTitle}>{titleFor(order)}</Text>
                      <Text style={styles.orderDate}>
                        {formatWhen(order.completedAt || order.cancelledAt) || 'Date unavailable'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardHeaderRight}>
                    <Text style={styles.orderPrice}>
                      {order.status === 'cancelled' ? '—' : `${order.price ?? '—'}`}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {order.status === 'cancelled' && order.cancelReason ? (
                  <Text style={styles.cancelNote}>Cancelled: {order.cancelReason}</Text>
                ) : null}

                {/* Waypoints */}
                <View style={styles.waypointsBox}>
                  <View style={styles.waypointRow}>
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.waypointText} numberOfLines={1}>
                      {order.pickup?.address || 'Pickup unavailable'}
                    </Text>
                  </View>
                  <View style={styles.waypointRow}>
                    <View style={[styles.dot, { backgroundColor: colors.accentRed }]} />
                    <Text style={styles.waypointText} numberOfLines={1}>
                      {order.dropoff?.address || 'Drop-off unavailable'}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <View style={styles.partnerInfo}>
                    <Text style={styles.partnerIcon}>👤</Text>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {order.partner?.name || 'No partner assigned'}
                    </Text>
                    {order.rated && order.rating ? (
                      <Text style={styles.ratedStars}>{order.rating}★</Text>
                    ) : null}
                  </View>
                  <View style={styles.buttonsRow}>
                    {/* Retry path for a rating that failed on the completion screen. */}
                    {order.status === 'completed' && !order.rated ? (
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => router.push({ pathname: '/rate', params: { rideId: order.id } })}
                      >
                        <Text style={styles.btnPrimaryText}>Rate</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.btnSecondary}
                      onPress={() => router.push({ pathname: '/receipt', params: { id: order.id } })}
                    >
                      <Text style={styles.btnSecondaryText}>View Receipt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  contentContainer: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  subtitle: { fontSize: 12, color: colors.textMuted },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceGray,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: colors.surfaceContainerLowest, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: 'bold', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  list: { gap: 12 },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: { width: 32, height: 32 },
  orderTitle: { fontSize: 12, fontWeight: 'bold', color: colors.onSurface },
  orderDate: { fontSize: 11, color: colors.textMuted },
  cardHeaderRight: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 14, fontWeight: 'bold', color: colors.onSurface },
  statusBadge: {
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: 'bold', color: colors.primary },
  waypointsBox: {
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    padding: 10,
    gap: 4,
    marginBottom: 12,
  },
  waypointRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  waypointText: { fontSize: 12, color: colors.onSurface, flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  partnerInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partnerIcon: { fontSize: 14 },
  partnerName: { fontSize: 11, color: colors.textMuted },
  ratedStars: { fontSize: 11, color: colors.primary, fontWeight: 'bold' },
  cancelNote: {
    fontSize: 11,
    color: colors.accentRed,
    marginBottom: 8,
  },
  buttonsRow: { flexDirection: 'row', gap: 8 },
  btnSecondary: {
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnSecondaryText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnPrimaryText: { fontSize: 12, fontWeight: 'bold', color: colors.onPrimary },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
