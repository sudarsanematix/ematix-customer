import React from 'react';
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import MaterialIcon, { MaterialIconName } from './MaterialIcon';
import RouteStrip from './RouteStrip';
import { VISIT_SPOTS } from '../data/mockData';

export type PlanStop = {
  id: string;
  name?: string;
  area?: string;
  category?: string;
  icon?: string;
  duration?: string;
  time?: string;
  vehicle: string;
  fare: number;
  action: string;
  spotId?: string;
};

export type PlanDay = { label: string; stops: PlanStop[] };

export type Plan = {
  title: string;
  summary?: string;
  days: PlanDay[];
  totalStops: number;
  totalFare: number;
};

type ResolvedStop = {
  id: string;
  name: string;
  area: string;
  icon: string;
  duration: string;
  time: string;
  vehicle: string;
  fare: number;
  action: string;
};

/**
 * AI plans carry every display field; legacy sample itineraries only carry a
 * `spotId`, so fall back to `VISIT_SPOTS` for those.
 */
function resolveStop(stop: PlanStop): ResolvedStop {
  const spot = stop.spotId
    ? VISIT_SPOTS.find((s: any) => s.id === stop.spotId)
    : undefined;
  return {
    id: stop.id,
    name: stop.name || spot?.name || 'Stop',
    area: stop.area || spot?.area || '',
    icon: stop.icon || spot?.icon || 'place',
    duration: stop.duration || spot?.duration || '',
    time: stop.time || '',
    vehicle: stop.vehicle || 'Auto',
    fare: typeof stop.fare === 'number' ? stop.fare : 0,
    action: stop.action || 'ride',
  };
}

export default function PlanCard({
  plan,
  activeDay,
  setActiveDay,
}: {
  plan: Plan;
  activeDay: number;
  setActiveDay: (i: number) => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  if (!plan?.days?.length) return null;

  const safeDay = Math.min(Math.max(activeDay, 0), plan.days.length - 1);
  const day = plan.days[safeDay];
  const stops = day.stops.map(resolveStop);
  const totals = `${plan.totalStops} stops \u2022 ~₹${plan.totalFare} est. total`;

  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planIconWrap}>
          <MaterialIcon name="route" size={20} color={colors.onPrimary} />
        </View>
        <View style={styles.planHeaderText}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planMeta}>{plan.summary || totals}</Text>
        </View>
      </View>

      {plan.days.length > 1 && (
        <View style={styles.dayTabs}>
          {plan.days.map((d, i) => (
            <TouchableOpacity
              key={`${d.label}-${i}`}
              style={[styles.dayTab, safeDay === i && styles.dayTabActive]}
              activeOpacity={0.85}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setActiveDay(i);
              }}
            >
              <Text style={[styles.dayTabText, safeDay === i && styles.dayTabTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <RouteStrip
        stops={stops.map((s) => ({ id: s.id, time: s.time, name: s.name, icon: s.icon }))}
      />

      <View style={styles.stopList}>
        {stops.map((stop, idx) => {
          const bookRoute = stop.action === 'ride' ? '/destination-search' : '/package-details';
          return (
            <View key={stop.id} style={styles.stopRow}>
              <View style={styles.stopTimeWrap}>
                <Text style={styles.stopTime}>{stop.time}</Text>
                {idx < stops.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.stopIconWrap}>
                <MaterialIcon name={stop.icon as MaterialIconName} size={18} color={colors.primary} />
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopArea} numberOfLines={1}>
                  {[stop.area, stop.duration].filter(Boolean).join(' \u2022 ')}
                </Text>
                <View style={styles.vehiclePill}>
                  <MaterialIcon name="directions-subway" size={12} color={colors.onSurfaceVariant} />
                  <Text style={styles.vehicleText}>
                    {stop.vehicle} {'\u2022'} ₹{stop.fare}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.bookBtn}
                activeOpacity={0.85}
                onPress={() => router.push(bookRoute)}
              >
                <Text style={styles.bookBtnText}>Book</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.planFooter}>
        <View style={styles.planFooterLeft}>
          <MaterialIcon name="wb-sunny" size={14} color={colors.textMuted} />
          <Text style={styles.planFooterText}>{plan.summary ? totals : 'Optimal route for today'}</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={() => {}}>
          <MaterialIcon name="bookmark-outline" size={14} color={colors.primary} />
          <Text style={styles.saveBtnText}>Save plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    planCard: {
      marginTop: spacing.stackMd,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.surfaceContainerHigh,
      overflow: 'hidden',
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.stackSm,
      padding: spacing.cardPadding,
      backgroundColor: colors.lightBlueTint,
    },
    planIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    planHeaderText: { flex: 1, minWidth: 0 },
    planTitle: { ...type.labelLg, color: colors.onSurface },
    planMeta: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    dayTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceContainer,
      margin: spacing.stackMd,
      borderRadius: radius.lg,
      padding: spacing.stackXs,
    },
    dayTab: {
      flex: 1,
      paddingVertical: spacing.stackSm,
      alignItems: 'center',
      borderRadius: radius.md,
    },
    dayTabActive: {
      backgroundColor: colors.surfaceContainerLowest,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    dayTabText: { ...type.labelSm, color: colors.textMuted },
    dayTabTextActive: { color: colors.primary, fontFamily: fonts.bold },
    stopList: { paddingHorizontal: spacing.cardPadding, gap: 0 },
    stopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.stackSm,
      paddingBottom: spacing.stackMd,
    },
    stopTimeWrap: { width: 52, alignItems: 'flex-start' },
    stopTime: { ...type.labelSm, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4 },
    timelineLine: {
      width: 1,
      flex: 1,
      backgroundColor: colors.surfaceContainerHigh,
      marginTop: 4,
      marginLeft: 6,
      minHeight: 18,
    },
    stopIconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stopInfo: { flex: 1, minWidth: 0 },
    stopName: { ...type.labelMd, color: colors.onSurface },
    stopArea: { ...type.bodySm, color: colors.textMuted, marginTop: 2 },
    vehiclePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      marginTop: spacing.stackSm,
      backgroundColor: colors.surfaceContainer,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    vehicleText: { ...type.labelSm, fontSize: 11, color: colors.onSurfaceVariant },
    bookBtn: {
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: spacing.stackMd,
      paddingVertical: spacing.stackSm,
      borderRadius: radius.md,
      marginTop: spacing.stackXs,
    },
    bookBtnText: { ...type.labelSm, color: colors.onPrimary, fontSize: 12 },
    planFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.surfaceContainerHigh,
      padding: spacing.cardPadding,
      paddingTop: spacing.stackMd,
      paddingBottom: spacing.stackMd,
    },
    planFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
    planFooterText: { ...type.labelSm, color: colors.textMuted, fontSize: 11, flex: 1 },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.lightBlueTint,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    saveBtnText: { ...type.labelSm, color: colors.primary, fontSize: 11 },
  });
