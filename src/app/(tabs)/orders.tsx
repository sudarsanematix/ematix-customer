import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { PAST_ORDERS } from '../../data/mockData';
import SharedHeader from '../../components/SharedHeader';
import Skeleton from '../../components/Skeleton';
import MaterialIcon from '../../components/MaterialIcon';
import { useTheme } from '../../theme/ThemeProvider';

export default function OrdersScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const filteredOrders = PAST_ORDERS.filter((order: any) => {
    if (filter === 'rides') return order.type === 'ride';
    if (filter === 'deliveries') return order.type === 'delivery' || order.type === 'parcel';
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
                {tab === 'all' ? `All (${PAST_ORDERS.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcon name="receipt-long" size={48} color={colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No {filter === 'rides' ? 'rides' : filter === 'deliveries' ? 'deliveries' : 'orders'} yet</Text>
              <Text style={styles.emptySubtitle}>Your past trips and deliveries will show up here.</Text>
            </View>
          ) : (
            filteredOrders.map((order: any) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.iconContainer}>
                    <Image
                      source={order.type === 'ride' 
                        ? require('../../../assets/images/auto.png') 
                        : require('../../../assets/images/bike.png')}
                      style={styles.cardIcon}
                    />
                  </View>
                  <View>
                    <Text style={styles.orderTitle}>{order.title}</Text>
                    <Text style={styles.orderDate}>{order.date}</Text>
                  </View>
                </View>

                <View style={styles.cardHeaderRight}>
                  <Text style={styles.orderPrice}>₹{order.price}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>
              </View>

              {/* Waypoints */}
              <View style={styles.waypointsBox}>
                <View style={styles.waypointRow}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.waypointText} numberOfLines={1}>{order.pickup}</Text>
                </View>
                <View style={styles.waypointRow}>
                  <View style={[styles.dot, { backgroundColor: colors.accentRed }]} />
                  <Text style={styles.waypointText} numberOfLines={1}>{order.dropoff}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerIcon}>👤</Text>
                  <Text style={styles.partnerName}>{order.partnerName}</Text>
                </View>
                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={() => router.push({ pathname: '/receipt', params: { id: order.id } })}
                  >
                    <Text style={styles.btnSecondaryText}>View Receipt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => {
                      if (order.type === 'ride') router.push('/select-ride');
                    else router.push('/package-details');
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>Rebook</Text>
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
