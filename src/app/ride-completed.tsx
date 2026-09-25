import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/typography';

const API_BASE = 'http://192.168.1.34:4000';

const COMPLIMENTS = [
  { id: 'Smooth Driving', icon: '🌟' },
  { id: 'Clean Vehicle', icon: '⚡' },
  { id: 'Friendly Driver', icon: '💬' },
  { id: 'On-Time Arrival', icon: '⏱️' },
];

const RATING_PHRASES = [
  'Poor Service • 1.0',
  'Below Expectation • 2.0',
  'Good Ride • 3.0',
  'Great Experience • 4.0',
  'Exceptional Service! 5.0',
];

type CompletedRide = {
  id: string;
  type?: string;
  vehicleType?: string;
  pickup?: { address: string } | null;
  dropoff?: { address: string } | null;
  price?: number | string | null;
  status?: string;
  createdAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  customer?: { name?: string } | null;
  partner?: {
    name?: string;
    phone?: string;
    rating?: number | null;
    vehicleType?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
  } | null;
};

function formatFare(price?: number | string | null): string {
  if (price == null) return '—';
  if (typeof price === 'number') return `₹${price}`;
  const str = String(price).trim();
  if (/^[₹$€£]/.test(str)) return str;
  return `₹${str}`;
}

function fmtTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function tripMinutes(startIso?: string | null, endIso?: string | null): number | null {
  if (!startIso || !endIso) return null;
  const d = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return Number.isFinite(d) && d >= 0 ? d : null;
}

function initialsOf(name?: string | null): string {
  if (!name) return 'P';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] ? w[0].toUpperCase() : ''))
      .join('') || 'P'
  );
}

export default function RideCompletedScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [ride, setRide] = useState<CompletedRide | null>(null);
  const [rating, setRating] = useState(5);
  const [activeCompliments, setActiveCompliments] = useState<string[]>(['Smooth Driving']);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (!rideId) return;
    fetch(`${API_BASE}/api/rides/${rideId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRide(data || null))
      .catch(() => setRide(null));
  }, [rideId]);

  const partner = ride?.partner;
  const firstName = partner?.name?.trim().split(/\s+/)[0] || 'your driver';
  const fare = formatFare(ride?.price);
  const totalDisplay =
    typeof ride?.price === 'number' ? `₹${ride.price + tip}` : tip > 0 ? `${fare} + ₹${tip}` : fare;
  const minutes = tripMinutes(ride?.startedAt, ride?.completedAt);

  const toggleCompliment = (comp: string) => {
    setActiveCompliments((prev) =>
      prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="ride-completed" title="Ride Completed" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Celebration Header */}
        <View style={styles.celebrationHeader}>
          <View style={styles.checkWrapper}>
            <View style={styles.checkIconOuter}>
              <View style={styles.checkIconInner}>
                <MaterialIcon name="check-circle" size={28} color={colors.onPrimary} />
              </View>
            </View>
            <View style={styles.sparkleTop} />
            <View style={styles.sparkleBottom} />
          </View>
          <Text style={styles.celebrationTitle}>Ride Completed!</Text>
          <Text style={styles.celebrationSubtitle}>
            {ride?.completedAt
              ? `${fmtDate(ride.completedAt)} at ${fmtTime(ride.completedAt)} • Dropped off safely`
              : 'Dropped off safely'}
          </Text>
        </View>

        {/* Trip Summary Card */}
        <View style={styles.card}>
          <View style={styles.driverRow}>
            <View style={styles.driverLeft}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarInitials}>
                  <Text style={styles.avatarInitialsText}>{initialsOf(partner?.name)}</Text>
                </View>
              </View>
              <View style={styles.driverInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.driverName} numberOfLines={1}>{partner?.name || 'Your driver'}</Text>
                  {partner?.rating != null && (
                    <View style={styles.ratingBadge}>
                      <MaterialIcon name="star" size={14} color="#FFB800" />
                      <Text style={styles.ratingText}>{partner.rating}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.vehicleText} numberOfLines={1}>
                  {partner ? [partner.vehicleModel, partner.vehicleNumber].filter(Boolean).join(' • ') : 'Vehicle'}
                </Text>
              </View>
            </View>
            <View style={styles.verifiedIconWrapper}>
              <MaterialIcon name="verified" size={18} color={colors.primary} />
            </View>
          </View>

          <View style={styles.routeBox}>
            <View style={styles.routeColumn}>
              <View style={styles.routeDotBlue} />
              <View style={styles.routeLine} />
              <View style={styles.routeDotRed} />
            </View>
            <View style={styles.routeTextCol}>
              <View>
                <Text style={styles.routeLocation} numberOfLines={1}>{ride?.pickup?.address || 'Pickup location'}</Text>
                <Text style={styles.routeTime}>Picked up at {fmtTime(ride?.startedAt) || fmtTime(ride?.acceptedAt) || '—'}</Text>
              </View>
              <View style={styles.routeSecondPoint}>
                <Text style={styles.routeLocation} numberOfLines={1}>{ride?.dropoff?.address || 'Dropoff location'}</Text>
                <Text style={styles.routeTime}>Completed at {fmtTime(ride?.completedAt) || '—'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={styles.statIconWrapper}>
                <MaterialIcon name="schedule" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{minutes != null ? `${minutes} mins` : '—'}</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <View style={styles.statIconWrapper}>
                <MaterialIcon name="directions-car" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>Vehicle</Text>
                <Text style={styles.statValue} numberOfLines={1}>{ride?.vehicleType || 'Ride'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Receipt Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Payment Receipt</Text>
            <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8}>
              <MaterialIcon name="download" size={16} color={colors.primary} />
              <Text style={styles.downloadText}>Invoice</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.receiptLines}>
            <View style={styles.receiptLine}>
              <Text style={styles.receiptLabel}>Total Fare</Text>
              <Text style={styles.receiptValue}>{fare}</Text>
            </View>
            {tip > 0 && (
              <View style={styles.tipReceiptRow}>
                <Text style={styles.tipReceiptLabel}>Driver Tip</Text>
                <Text style={styles.tipReceiptValue}>+₹{tip}</Text>
              </View>
            )}
          </View>

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL PAID</Text>
              <View style={styles.paymentMethodRow}>
                <View style={styles.paymentDot} />
                <Text style={styles.paymentMethodText}>Online Payment</Text>
              </View>
            </View>
            <Text style={styles.totalValue}>{totalDisplay}</Text>
          </View>
        </View>

        {/* Rating & Feedback Card */}
        <View style={styles.card}>
          <View style={styles.centerHeader}>
            <Text style={styles.cardTitle}>How was your trip with {firstName}?</Text>
            <Text style={styles.cardSubtitle}>Your rating helps build a trusted Ematix community</Text>
          </View>

          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.8}>
                {rating >= star ? (
                  <Text style={styles.starBigActive}>★</Text>
                ) : (
                  <Text style={styles.starBigInactive}>★</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingStatusText}>{RATING_PHRASES[rating - 1]}</Text>

          <View style={styles.complimentsSection}>
            <Text style={styles.sectionLabel}>Give a compliment</Text>
            <View style={styles.complimentsGrid}>
              {COMPLIMENTS.map((comp) => {
                const isActive = activeCompliments.includes(comp.id);
                return (
                  <TouchableOpacity
                    key={comp.id}
                    style={[styles.complimentChip, isActive ? styles.complimentChipActive : styles.complimentChipInactive]}
                    onPress={() => toggleCompliment(comp.id)}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.complimentIcon}>{comp.icon}</Text>
                    <Text style={[styles.complimentText, isActive ? styles.complimentTextActive : styles.complimentTextInactive]}>
                      {comp.id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.tippingSection}>
            <View style={styles.tipHeader}>
              <Text style={styles.sectionLabel}>Add a tip for {firstName}</Text>
              <View style={styles.tipBadge}>
                <Text style={styles.tipBadgeText}>100% goes to driver</Text>
              </View>
            </View>
            <View style={styles.tipGrid}>
              {[10, 20, 50].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.tipBtn, tip === amt ? styles.tipBtnActive : styles.tipBtnInactive]}
                  onPress={() => setTip(amt)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.tipBtnText, tip === amt ? styles.tipBtnTextActive : styles.tipBtnTextInactive]}>
                    +₹{amt}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.tipBtn, ![10, 20, 50].includes(tip) && tip > 0 ? styles.tipBtnActive : styles.tipBtnInactive]}
                onPress={() => setTip(100)}
                activeOpacity={0.9}
              >
                <Text style={[styles.tipBtnText, ![10, 20, 50].includes(tip) && tip > 0 ? styles.tipBtnTextActive : styles.tipBtnTextInactive]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Support Card */}
        <TouchableOpacity style={styles.supportCard} activeOpacity={0.9}>
          <View style={styles.supportLeft}>
            <View style={styles.supportIconWrapper}>
              <MaterialIcon name="help-center" size={20} color={colors.primary} />
            </View>
            <View style={styles.supportTextCol}>
              <Text style={styles.supportTitle} numberOfLines={1}>Lost an item or need help?</Text>
              <Text style={styles.supportSubtitle} numberOfLines={1}>24x7 Ematix Support is ready</Text>
            </View>
          </View>
          <MaterialIcon name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      {/* CTA Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.95}>
          <Text style={styles.doneBtnText}>Done & Back to Home</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 112,
  },
  celebrationHeader: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  checkWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  checkIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  sparkleTop: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentRed,
  },
  sparkleBottom: {
    position: 'absolute',
    bottom: 0,
    left: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondaryContainer,
  },
  celebrationTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.52,
    color: colors.onSurface,
  },
  celebrationSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#06358f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onPrimary,
  },
  driverInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
    flexShrink: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 2,
  },
  ratingText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurface,
  },
  vehicleText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  verifiedIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  routeBox: {
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  routeColumn: {
    alignItems: 'center',
    marginTop: 4,
  },
  routeDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  routeDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
  },
  routeLine: {
    width: 2,
    height: 28,
    backgroundColor: colors.outlineVariant,
    marginVertical: 2,
  },
  routeTextCol: {
    flex: 1,
  },
  routeSecondPoint: {
    marginTop: 12,
  },
  routeLocation: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  routeTime: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 12,
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  statValue: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  receiptLines: {
    gap: 10,
  },
  receiptLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  receiptValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  tipReceiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.lightBlueTint,
    padding: 8,
    borderRadius: 8,
  },
  tipReceiptLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  tipReceiptValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  totalLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  paymentMethodText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.84,
    color: colors.onSurface,
  },
  centerHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starBigActive: {
    fontSize: 36,
    color: '#FFB800',
  },
  starBigInactive: {
    fontSize: 36,
    color: colors.outlineVariant,
  },
  ratingStatusText: {
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
    marginTop: -4,
  },
  complimentsSection: {
    marginTop: 16,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: 8,
  },
  complimentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  complimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  complimentChipActive: {
    backgroundColor: colors.lightBlueTint,
  },
  complimentChipInactive: {
    backgroundColor: colors.surfaceGray,
  },
  complimentIcon: {
    fontSize: 14,
  },
  complimentText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
  },
  complimentTextActive: {
    color: colors.primary,
  },
  complimentTextInactive: {
    color: colors.textMuted,
  },
  tippingSection: {
    marginTop: 20,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tipBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: '#047857',
  },
  tipGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tipBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tipBtnActive: {
    backgroundColor: colors.lightBlueTint,
  },
  tipBtnInactive: {
    backgroundColor: colors.surfaceGray,
  },
  tipBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  tipBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tipBtnTextInactive: {
    color: colors.onSurface,
  },
  supportCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  supportIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  supportTextCol: {
    flex: 1,
    minWidth: 0,
  },
  supportTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  supportSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(252, 249, 248, 0.9)',
    padding: 16,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#06358f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 5,
  },
  doneBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onPrimary,
  },
});