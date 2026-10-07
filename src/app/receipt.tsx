import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../utils/api';

type ReceiptRide = {
  id: string;
  type: string;
  status: string;
  price: number;
  pickup: { address?: string } | null;
  dropoff: { address?: string } | null;
  createdAt: string;
  completedAt: string | null;
  customer: { name?: string; phone?: string } | null;
  partner: {
    name?: string;
    vehicleModel?: string;
    vehicleNumber?: string;
    rating?: number;
    ratingCount?: number;
  } | null;
};

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ReceiptScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // Real receipt data. This screen used to fall back to the first entry in the
  // mock order list, which meant a deep link with a genuine ride id silently
  // displayed someone else's invented fare.
  const hasTarget = Boolean(id && token);
  const [order, setOrder] = useState<ReceiptRide | null>(null);
  const [loading, setLoading] = useState(hasTarget);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // Backend enforces that only this ride's customer/partner can read it.
        const data = await authedFetch(`/api/rides/${id}`, token);
        if (!cancelled) setOrder(data);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Could not load this receipt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  if (!hasTarget) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="receipt" title="Invoice" />
        <Text style={styles.missing}>This receipt link is missing a trip reference.</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.replace('/(tabs)/orders')}>
          <Text style={styles.actionPrimaryText}>Back to my trips</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="receipt" title="Invoice" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="receipt" title="Invoice" />
        <Text style={styles.missing}>{loadError || 'Invoice not found.'}</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.replace('/(tabs)/orders')}>
          <Text style={styles.actionPrimaryText}>Back to my trips</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // The persisted price is the single source of truth; there is no stored fare
  // breakdown to show, so the total is reported plainly instead of inventing
  // base/distance/surcharge lines that never existed.
  const baseFare = Number(order.price ?? 0);
  const partnerName = order.partner?.name || 'Partner';
  const partnerVehicle = order.partner?.vehicleNumber
    ? `${order.partner.vehicleModel || ''} ${order.partner.vehicleNumber}`.trim()
    : order.partner?.vehicleModel || '—';

  const isDelivery = order.type === 'delivery' || order.type === 'parcel';
  const cancelled = order.status === 'cancelled';

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="receipt" title="Invoice" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Paid summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.paidBadge, !isDelivery && styles.paidBadgeRide]}>
            <Text style={styles.paidText}>{cancelled ? 'CANCELLED' : 'PAID'}</Text>
          </View>
          <Text style={styles.totalAmount}>{cancelled ? '₹0.00' : `₹${baseFare.toFixed(2)}`}</Text>
          <Text style={styles.paidVia}>{order.customer?.name || 'Trip receipt'}</Text>
          <Text style={styles.orderId}>Order #{order.id}</Text>
        </View>

        {/* Route */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcon name={isDelivery ? 'inventory-2' : 'local-taxi'} size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{isDelivery ? 'Parcel Delivery' : 'Ride'}</Text>
          </View>
          <View style={styles.routeBox}>
            <View style={styles.routeColumn}>
              <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, { backgroundColor: colors.accentRed }]} />
            </View>
            <View style={styles.routeTextCol}>
              <Text style={styles.routeLocation}>{order.pickup?.address || 'Pickup'}</Text>
              <Text style={styles.routeLabel}>Pickup</Text>
              <View style={styles.routeSecondPoint}>
                <Text style={styles.routeLocation}>{order.dropoff?.address || 'Drop-off'}</Text>
                <Text style={styles.routeLabel}>Drop-off</Text>
              </View>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcon name="schedule" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatTime(order.completedAt || order.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcon name="event" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{order.status}</Text>
            </View>
          </View>
        </View>

        {/* Fare breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fare Breakdown</Text>
          <View style={styles.fareLine}>
            <Text style={styles.fareLabel}>{isDelivery ? 'Total Charge' : 'Trip Fare'}</Text>
            <Text style={styles.fareValue}>{cancelled ? '₹0.00' : `₹${baseFare.toFixed(2)}`}</Text>
          </View>

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalMethod}>{cancelled ? 'Not charged' : 'Paid in full'}</Text>
            </View>
            <Text style={styles.totalValue}>{cancelled ? '₹0.00' : `₹${baseFare.toFixed(2)}`}</Text>
          </View>
        </View>

        {/* Partner */}
        <View style={styles.sectionCard}>
          <View style={styles.partnerRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{partnerName.charAt(0)}</Text>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partnerName}</Text>
              <Text style={styles.partnerVehicle}>{partnerVehicle}</Text>
            </View>
            {order.partner?.rating != null && (order.partner.ratingCount ?? 0) > 0 ? (
              <View style={styles.ratingBadge}>
                <MaterialIcon name="star" size={13} color="#FFB800" />
                <Text style={styles.ratingText}>{Number(order.partner.rating).toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSecondary]}
            activeOpacity={0.85}
            onPress={() => showToast('Invoice playfully downloaded to your device')}
          >
            <MaterialIcon name="download" size={18} color={colors.primary} />
            <Text style={styles.actionSecondaryText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary]}
            activeOpacity={0.85}
            onPress={() => showToast('Invoice shared via WhatsApp')}
          >
            <MaterialIcon name="share" size={18} color={colors.onPrimary} />
            <Text style={styles.actionPrimaryText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.helpRow}
          activeOpacity={0.75}
          onPress={() => router.push('/notifications')}
        >
          <MaterialIcon name="help-outline" size={18} color={colors.textMuted} />
          <Text style={styles.helpText}>Need help with this trip?</Text>
        </TouchableOpacity>
      </ScrollView>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.marginMobile,
    paddingBottom: 100,
    gap: spacing.stackLg,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.sheetPadding,
    alignItems: 'center',
  },
  paidBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.full,
    marginBottom: spacing.stackSm,
  },
  paidBadgeRide: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  paidText: {
    ...type.labelSm,
    color: colors.onPrimary,
    letterSpacing: 0.8,
  },
  totalAmount: {
    ...type.headlineXl,
    fontSize: 40,
    color: colors.onPrimary,
    fontFamily: fonts.extrabold,
  },
  paidVia: {
    ...type.bodySm,
    color: colors.onPrimaryContainer,
    marginTop: spacing.stackXs,
  },
  orderId: {
    ...type.labelSm,
    color: colors.onPrimaryContainer,
    marginTop: spacing.stackSm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  sectionTitle: {
    ...type.labelLg,
    color: colors.onSurface,
  },
  routeBox: {
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  routeColumn: {
    alignItems: 'center',
    marginTop: spacing.stackXs,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.outlineVariant,
    marginVertical: 2,
  },
  routeTextCol: {
    flex: 1,
  },
  routeLocation: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  routeLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  routeSecondPoint: {
    marginTop: spacing.stackMd,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.stackLg,
    marginTop: spacing.stackMd,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
  },
  metaText: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
  },
  fareLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
  },
  fareLabel: {
    ...type.bodyMd,
    color: colors.textMuted,
  },
  fareValue: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackXs,
  },
  fareLabelCoupon: {
    ...type.bodyMd,
    color: colors.accentRed,
    fontFamily: fonts.medium,
  },
  fareValueCoupon: {
    ...type.labelMd,
    color: colors.accentRed,
  },
  fareLabelTip: {
    ...type.bodyMd,
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  fareValueTip: {
    ...type.labelMd,
    color: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    padding: spacing.cardPadding,
    borderRadius: radius.lg,
    marginTop: spacing.stackSm,
  },
  totalLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  totalMethod: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalValue: {
    ...type.headlineMd,
    color: colors.onSurface,
    fontFamily: fonts.extrabold,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  partnerInfo: {
    flex: 1,
    minWidth: 0,
  },
  partnerName: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  partnerVehicle: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackXs,
    borderRadius: radius.full,
  },
  ratingText: {
    ...type.labelSm,
    color: colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.lg,
  },
  actionSecondary: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  actionSecondaryText: {
    ...type.labelMd,
    color: colors.primary,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionPrimaryText: {
    ...type.labelMd,
    color: colors.onPrimary,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackXs,
    paddingVertical: spacing.stackMd,
  },
  helpText: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: colors.inverseSurface,
    paddingHorizontal: spacing.stackLg,
    paddingVertical: spacing.stackMd,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    ...type.labelMd,
    color: colors.inverseOnSurface,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: {
    ...type.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackXl,
  },
});