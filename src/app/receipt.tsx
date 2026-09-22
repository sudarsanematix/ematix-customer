import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import { PAST_ORDERS } from '../data/mockData';

export default function ReceiptScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order =
    PAST_ORDERS.find((o: any) => o.id === id) || (PAST_ORDERS as any[])[0] || null;
  const [toast, setToast] = useState<string | null>(null);

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SharedHeader currentScreen="receipt" title="Invoice" />
        <Text style={styles.missing}>Invoice not found.</Text>
      </SafeAreaView>
    );
  }

  const fare = order.fare || { base: order.price, distance: 0, surcharge: 0, coupon: null, couponValue: 0, tip: 0 };
  const subtotal = fare.base + fare.distance + fare.surcharge;
  const total = subtotal + fare.tip - (fare.couponValue || 0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const fareLines: { label: string; value: string }[] = [
    { label: 'Base Fare', value: `₹${fare.base.toFixed(2)}` },
    ...(fare.distance > 0 ? [{ label: 'Distance Fare', value: `₹${fare.distance.toFixed(2)}` }] : []),
    ...(fare.surcharge > 0 ? [{ label: 'Time & Traffic Surcharge', value: `₹${fare.surcharge.toFixed(2)}` }] : []),
  ];

  const isDelivery = order.type === 'delivery';

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="receipt" title="Invoice" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Paid summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.paidBadge, !isDelivery && styles.paidBadgeRide]}>
            <Text style={styles.paidText}>PAID</Text>
          </View>
          <Text style={styles.totalAmount}>₹{total.toFixed(2)}</Text>
          <Text style={styles.paidVia}>{order.paymentMethod || 'UPI'}</Text>
          <Text style={styles.orderId}>Order #{order.id}</Text>
        </View>

        {/* Route */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcon name={isDelivery ? 'inventory-2' : 'local-taxi'} size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{isDelivery ? 'Parcel Delivery' : 'Auto Ride'}</Text>
          </View>
          <View style={styles.routeBox}>
            <View style={styles.routeColumn}>
              <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, { backgroundColor: colors.accentRed }]} />
            </View>
            <View style={styles.routeTextCol}>
              <Text style={styles.routeLocation}>{order.pickup}</Text>
              <Text style={styles.routeLabel}>Pickup</Text>
              <View style={styles.routeSecondPoint}>
                <Text style={styles.routeLocation}>{order.dropoff}</Text>
                <Text style={styles.routeLabel}>Drop-off</Text>
              </View>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcon name="schedule" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{order.time || order.date.split(',')[1]?.trim() || '—'}</Text>
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
          {fareLines.map((line) => (
            <View key={line.label} style={styles.fareLine}>
              <Text style={styles.fareLabel}>{line.label}</Text>
              <Text style={styles.fareValue}>{line.value}</Text>
            </View>
          ))}
          {fare.coupon && (
            <View style={styles.fareLine}>
              <View style={styles.couponRow}>
                <MaterialIcon name="sell" size={16} color={colors.accentRed} />
                <Text style={styles.fareLabelCoupon}>Coupon ({fare.coupon})</Text>
              </View>
              <Text style={styles.fareValueCoupon}>-₹{fare.couponValue.toFixed(2)}</Text>
            </View>
          )}
          {fare.tip > 0 && (
            <View style={styles.fareLine}>
              <Text style={styles.fareLabelTip}>Driver Tip</Text>
              <Text style={styles.fareValueTip}>₹{fare.tip.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalMethod}>{order.paymentMethod}</Text>
            </View>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Partner */}
        <View style={styles.sectionCard}>
          <View style={styles.partnerRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{order.partnerName.charAt(0)}</Text>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{order.partnerName}</Text>
              <Text style={styles.partnerVehicle}>{order.vehicle}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <MaterialIcon name="star" size={13} color="#FFB800" />
              <Text style={styles.ratingText}>{order.rating}</Text>
            </View>
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
  missing: {
    ...type.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.stackXl,
  },
});