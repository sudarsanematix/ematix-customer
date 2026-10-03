import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { type, fonts } from '../theme/typography';
import { useAuth } from '../context/AuthContext';

type RideData = {
  id?: string;
  type?: string;
  status?: string;
  price?: number;
  pickup?: { address?: string; lat?: number; lng?: number } | null;
  dropoff?: { address?: string; lat?: number; lng?: number } | null;
  packageDetails?: {
    category?: string;
    weightTier?: string;
    fragile?: boolean;
    receiverName?: string;
    receiverPhone?: string;
    notes?: string;
  } | null;
  partner?: {
    id?: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    rating?: number | null;
  } | null;
  createdAt?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  distance?: number;
  proofOfDeliveryPhotoUrl?: string | null;
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.34:4000';

const fmtTime = (value?: string | number | null): string => {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const initialsOf = (name?: string | null): string => {
  if (!name) return 'P';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] ? w[0].toUpperCase() : ''))
      .join('') || 'P'
  );
};

const COMPLIMENTS = ['✨ On-time delivery', '📦 Careful handling', '😊 Polite partner', '⚡ Fast route'];
const TIP_OPTIONS = ['+₹10', '+₹20', '+₹30', 'Custom'];

export default function PackageDeliveredScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { token } = useAuth();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  const [ride, setRide] = useState<RideData | null>(null);
  const [rating, setRating] = useState(5);
  const [compliments, setCompliments] = useState<Set<string>>(new Set(['📦 Careful handling']));
  const [selectedTip, setSelectedTip] = useState('+₹20');
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!rideId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rides/${rideId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data) setRide(data);
      } catch (e) {
        console.warn('Ride fetch failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [rideId, token]);

  useEffect(() => {
    if (submitState === 'saving') {
      const loop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
      return () => {
        loop.stop();
        spin.setValue(0);
      };
    }
  }, [submitState, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const toggleCompliment = (label: string) => {
    setCompliments((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleSubmit = () => {
    if (submitState !== 'idle') return;
    setSubmitState('saving');
    setTimeout(() => {
      setSubmitState('done');
      setTimeout(() => router.replace('/(tabs)/home'), 1100);
    }, 1300);
  };

  const submitLabel =
    submitState === 'idle'
      ? 'Submit Feedback & Back to Home'
      : submitState === 'saving'
        ? 'Saving feedback...'
        : 'Thank you! Redirecting...';

  const orderRef = (ride?.id || rideId || '').slice(-6).toUpperCase();
  const receiverName = ride?.packageDetails?.receiverName || 'Receiver';
  const partnerName = ride?.partner?.name || 'Delivery partner';
  const partnerMeta = [ride?.partner?.vehicleType, ride?.partner?.vehicleModel, ride?.partner?.vehicleNumber]
    .filter(Boolean)
    .join(' \u2022 ');

  // Format total duration
  let durationStr = '-- mins';
  if (ride?.startedAt && ride?.completedAt) {
    const mins = Math.round((new Date(ride.completedAt).getTime() - new Date(ride.startedAt).getTime()) / 60000);
    durationStr = `${Math.max(1, mins)} mins total`;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="package-delivered" title="Delivered Receipt & Rating" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Celebration Header */}
        <View style={styles.celebration}>
          <View style={styles.celebrationBadgeWrap}>
            <View style={styles.celebrationOuter}>
              <View style={styles.celebrationInner}>
                <MaterialIcon name="task-alt" size={30} color={colors.onPrimary} />
              </View>
            </View>
            <View style={styles.verifiedBadge}>
              <MaterialIcon name="verified" size={14} color={colors.onSecondaryContainer} />
            </View>
          </View>
          <View style={styles.orderPill}>
            <MaterialIcon name="local-shipping" size={14} color={colors.primary} />
            <Text style={styles.orderPillText}>Order #{orderRef || '\u2014'}</Text>
          </View>
          <Text style={styles.celebrationTitle}>Package Delivered!</Text>
          <Text style={styles.celebrationSubtitle}>
            {ride?.completedAt ? `Today at ${fmtTime(ride.completedAt)} \u2022 Handed over securely` : 'Handed over securely'}
          </Text>
        </View>

        {/* Proof of Delivery */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MaterialIcon name="photo-camera" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Proof of Delivery</Text>
            </View>
            <View style={styles.otpVerifiedPill}>
              <MaterialIcon name="lock" size={13} color={colors.primary} />
              <Text style={styles.otpVerifiedText}>OTP Verified</Text>
            </View>
          </View>
          <View style={styles.proofBody}>
            <Image
              source={{
                uri: ride?.proofOfDeliveryPhotoUrl
                  ? `${API_BASE}${ride.proofOfDeliveryPhotoUrl}`
                  : 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&h=200&fit=crop&q=80',
              }}
              style={styles.proofImage}
            />
            <View style={styles.proofInfo}>
              <Text style={styles.proofTitle} numberOfLines={1}>Delivered to {receiverName}</Text>
              <Text style={styles.proofSub} numberOfLines={1}>Location: {ride?.dropoff?.address || 'Dropoff location'}</Text>
              <View style={styles.proofCodeRow}>
                <MaterialIcon name="check-circle" size={14} color={colors.primary} />
                <Text style={styles.proofCodeText}>Delivery verified successfully</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trip Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MaterialIcon name="route" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Trip Summary</Text>
            </View>
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{durationStr}</Text>
            </View>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineRail} />
            <View style={styles.timelineStop}>
              <View style={styles.timelineDotPickup} />
              <View style={styles.timelineStopBody}>
                <View style={styles.timelineStopTop}>
                  <Text style={styles.timelineAddress} numberOfLines={1}>{ride?.pickup?.address || 'Pickup'}</Text>
                  <Text style={styles.timelineTime}>{fmtTime(ride?.startedAt)}</Text>
                </View>
                <Text style={styles.timelineLabel}>Picked up from Sender</Text>
              </View>
            </View>
            <View style={styles.timelineStop}>
              <View style={styles.timelineDotDrop} />
              <View style={styles.timelineStopBody}>
                <View style={styles.timelineStopTop}>
                  <Text style={styles.timelineAddress} numberOfLines={1}>{ride?.dropoff?.address || 'Dropoff'}</Text>
                  <Text style={styles.timelineTime}>{fmtTime(ride?.completedAt)}</Text>
                </View>
                <Text style={styles.timelineLabel}>Delivered to recipient</Text>
              </View>
            </View>
          </View>

          <View style={styles.courierRow}>
            <View style={styles.courierAvatar}>
              <Text style={styles.partnerAvatarText}>{initialsOf(ride?.partner?.name)}</Text>
            </View>
            <View style={styles.courierInfo}>
              <View style={styles.courierNameRow}>
                <Text style={styles.courierName} numberOfLines={1}>{partnerName}</Text>
                {ride?.partner?.rating != null ? (
                  <View style={styles.courierRatingRow}>
                    <MaterialIcon name="star" size={13} color={colors.primary} />
                    <Text style={styles.courierRating}>{Number(ride.partner.rating).toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
              {partnerMeta ? <Text style={styles.courierMeta} numberOfLines={1}>{partnerMeta}</Text> : null}
            </View>
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>{ride?.distance != null ? `${(ride.distance / 1000).toFixed(1)} km` : '\u2014'}</Text>
            </View>
          </View>
        </View>

        {/* Payment Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MaterialIcon name="receipt-long" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Payment Breakdown</Text>
            </View>
            <TouchableOpacity style={styles.invoiceBtn} activeOpacity={0.85}>
              <MaterialIcon name="download" size={16} color={colors.primary} />
              <Text style={styles.invoiceBtnText}>Invoice</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fareLines}>
            <View style={styles.fareLine}>
              <Text style={styles.fareLabel}>Delivery Fare</Text>
              <Text style={styles.fareValue}>₹{ride?.price != null ? Number(ride.price).toFixed(2) : '0.00'}</Text>
            </View>
            <View style={styles.fareLine}>
              <View style={styles.fareLabelRow}>
                <Text style={styles.fareLabel}>Package Protection</Text>
                <MaterialIcon name="verified-user" size={14} color={colors.primary} />
              </View>
              <Text style={styles.fareFree}>FREE</Text>
            </View>
          </View>

          <View style={styles.fareDivider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total Paid</Text>
              <View style={styles.totalMethodRow}>
                <MaterialIcon name="check-circle" size={14} color={colors.primary} />
                <Text style={styles.totalMethodText}>Paid successfully</Text>
              </View>
            </View>
            <Text style={styles.totalValue}>₹{ride?.price != null ? Number(ride.price).toFixed(0) : '0'}</Text>
          </View>
        </View>

        {/* Rating & Feedback */}
        <View style={styles.card}>
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingTitle}>How was your delivery?</Text>
            <Text style={styles.ratingSubtitle}>Rate your experience with {partnerName}</Text>
          </View>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)} activeOpacity={0.7}>
                <MaterialIcon
                  name={value <= rating ? 'star' : 'star-border'}
                  size={36}
                  color={value <= rating ? colors.primary : colors.borderGray}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.complimentsBlock}>
            <Text style={styles.sectionLabel}>What went great?</Text>
            <View style={styles.chipsWrap}>
              {COMPLIMENTS.map((label) => {
                const selected = compliments.has(label);
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                    activeOpacity={0.9}
                    onPress={() => toggleCompliment(label)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.tipBlock}>
            <View style={styles.tipHeader}>
              <Text style={styles.tipLabel}>Add a tip for Suresh</Text>
              <Text style={styles.tipNote}>100% goes to partner</Text>
            </View>
            <View style={styles.tipGrid}>
              {TIP_OPTIONS.map((option) => {
                const selected = selectedTip === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.tipBtn, selected ? styles.tipBtnSelected : styles.tipBtnUnselected]}
                    activeOpacity={0.9}
                    onPress={() => setSelectedTip(option)}
                  >
                    <Text style={[styles.tipBtnText, selected && styles.tipBtnTextSelected]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (submitState === 'saving' || submitState === 'done') && styles.submitBtnBusy]}
          activeOpacity={0.97}
          onPress={handleSubmit}
        >
          {submitState === 'saving' ? (
            <Animated.View style={{ transform: [{ rotate }] }}>
              <MaterialIcon name="autorenew" size={20} color={colors.onPrimary} />
            </Animated.View>
          ) : (
            <MaterialIcon name={submitState === 'done' ? 'check-circle' : 'arrow-forward'} size={20} color={colors.onPrimary} />
          )}
          <Text style={styles.submitBtnText}>{submitLabel}</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 40,
    gap: 16,
  },
  celebration: {
    alignItems: 'center',
    paddingTop: 4,
  },
  celebrationBadgeWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  celebrationOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lightBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  orderPillText: {
    ...type.labelSm,
    color: colors.primary,
  },
  celebrationTitle: {
    ...type.headlineLg,
    color: colors.onSurface,
    letterSpacing: -0.4,
  },
  celebrationSubtitle: {
    ...type.bodyMd,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#06358f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    fontSize: 16,
  },
  otpVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  otpVerifiedText: {
    ...type.labelSm,
    color: colors.primary,
  },
  proofBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    padding: 10,
  },
  proofImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
  },
  proofInfo: {
    flex: 1,
    minWidth: 0,
  },
  proofTitle: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  proofSub: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  proofCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  proofCodeText: {
    ...type.labelSm,
    color: colors.primary,
  },
  durationPill: {
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  timeline: {
    position: 'relative',
    gap: 16,
    paddingLeft: 8,
  },
  timelineRail: {
    position: 'absolute',
    left: 13,
    top: 6,
    bottom: 8,
    width: 2,
    backgroundColor: colors.borderGray,
  },
  timelineStop: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.lightBlueTint,
    marginTop: 4,
  },
  timelineDotDrop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
    borderWidth: 4,
    borderColor: colors.errorContainer,
    marginTop: 4,
  },
  timelineStopBody: {
    flex: 1,
    minWidth: 0,
  },
  timelineStopTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  timelineAddress: {
    ...type.labelMd,
    color: colors.onSurface,
    flex: 1,
  },
  timelineTime: {
    ...type.bodySm,
    color: colors.textMuted,
    flexShrink: 0,
  },
  timelineLabel: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    padding: 12,
  },
  courierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    ...type.labelMd,
    color: colors.onPrimary,
  },
  courierInfo: {
    flex: 1,
    minWidth: 0,
  },
  courierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courierName: {
    ...type.labelMd,
    color: colors.onSurface,
    flexShrink: 1,
  },
  courierRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  courierRating: {
    ...type.labelSm,
    color: colors.primary,
  },
  courierMeta: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 1,
  },
  distancePill: {
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  distanceText: {
    ...type.labelSm,
    color: colors.primary,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invoiceBtnText: {
    ...type.labelSm,
    color: colors.primary,
  },
  fareLines: {
    gap: 10,
  },
  fareLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fareLabel: {
    ...type.bodyMd,
    color: colors.textMuted,
  },
  fareValue: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  fareFree: {
    ...type.labelMd,
    color: colors.primary,
  },
  fareDivider: {
    height: 1,
    backgroundColor: colors.surfaceGray,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    ...type.headlineSm,
    color: colors.onSurface,
    fontSize: 16,
  },
  totalMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  totalMethodText: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  totalValue: {
    ...type.displayMetric,
    color: colors.primary,
    fontSize: 26,
    lineHeight: 32,
  },
  ratingHeader: {
    alignItems: 'center',
  },
  ratingTitle: {
    ...type.headlineSm,
    color: colors.onSurface,
    fontSize: 16,
  },
  ratingSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  complimentsBlock: {
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    ...type.labelSm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipSelected: {
    backgroundColor: colors.lightBlueTint,
  },
  chipUnselected: {
    backgroundColor: colors.surfaceGray,
  },
  chipText: {
    ...type.labelSm,
    color: colors.onSurface,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  tipBlock: {
    gap: 8,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  tipLabel: {
    ...type.labelSm,
    color: colors.textMuted,
  },
  tipNote: {
    ...type.bodySm,
    color: colors.primary,
  },
  tipGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tipBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  tipBtnSelected: {
    backgroundColor: colors.lightBlueTint,
  },
  tipBtnUnselected: {
    backgroundColor: colors.surfaceGray,
  },
  tipBtnText: {
    ...type.labelMd,
    color: colors.onSurface,
  },
  tipBtnTextSelected: {
    color: colors.primary,
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 4,
  },
  submitBtnBusy: {
    opacity: 0.85,
    backgroundColor: colors.primary,
  },
  submitBtnText: {
    ...type.labelLg,
    color: colors.onPrimary,
  },
});
