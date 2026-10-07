import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcon from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { authedFetch } from '../utils/api';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor experience',
  2: 'Below expectations',
  3: 'It was okay',
  4: 'Good experience',
  5: 'Excellent experience',
};

type RideSummary = {
  id: string;
  status: string;
  pickup?: { address?: string } | null;
  dropoff?: { address?: string } | null;
  rated: boolean;
  rating: number | null;
  partner: { name: string; vehicleNumber: string } | null;
};

export default function RateScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { token } = useAuth();
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();

  const hasTarget = Boolean(rideId && token);
  const [ride, setRide] = useState<RideSummary | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(hasTarget);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull the trip out of the customer's own history so the screen can show what
  // is being rated and whether a previous attempt already landed.
  useEffect(() => {
    if (!rideId || !token) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await authedFetch('/api/rides/history?limit=50', token);
        const match = (data?.rides || []).find((r: RideSummary) => r.id === rideId);
        if (cancelled) return;
        if (!match) {
          setError('That trip could not be found in your history');
          return;
        }
        setRide(match);
        if (match.rated && match.rating) setRating(match.rating);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load this trip');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rideId, token]);

  const submit = async () => {
    if (!rideId || !token || rating === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      await authedFetch(`/api/rides/history/${rideId}/rating`, token, {
        method: 'POST',
        body: { rating },
      });
      router.replace('/(tabs)/orders');
    } catch (e: any) {
      // Stay put on failure so the stars the customer picked are not lost and
      // they can simply tap submit again.
      setError(e?.message || 'Could not save your rating. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/orders'))}
            activeOpacity={0.8}
          >
            <MaterialIcon name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>Rate your trip</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !hasTarget ? (
          <View style={styles.body}>
            <Text style={styles.errorText}>This rating link is missing a trip reference.</Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => router.replace('/(tabs)/orders')}
              activeOpacity={0.95}
            >
              <Text style={styles.submitText}>Back to my trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.body}>
            {ride ? (
              <View style={styles.tripCard}>
                <Text style={styles.tripPartner}>
                  {ride.partner?.name || 'Your partner'}
                  {ride.partner?.vehicleNumber ? ` • ${ride.partner.vehicleNumber}` : ''}
                </Text>
                <Text style={styles.tripRoute} numberOfLines={1}>
                  {ride.pickup?.address || 'Pickup'}
                </Text>
                <Text style={styles.tripRoute} numberOfLines={1}>
                  {ride.dropoff?.address || 'Drop-off'}
                </Text>
              </View>
            ) : null}

            <Text style={styles.question}>
              {ride?.rated ? 'Update your rating' : 'How was your trip?'}
            </Text>
            <Text style={styles.hint}>Optional — only partners you have already travelled with are listed.</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.8}>
                  <MaterialIcon
                    name={(rating ?? 0) >= star ? 'star' : 'star-border'}
                    size={40}
                    color={(rating ?? 0) >= star ? colors.primary : colors.borderGray}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>
              {rating === null ? 'Tap a star' : RATING_LABELS[rating]}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, (rating === null || saving) && { opacity: 0.6 }]}
              disabled={rating === null || saving}
              onPress={submit}
              activeOpacity={0.95}
            >
              <Text style={styles.submitText}>{saving ? 'Saving…' : 'Submit rating'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(tabs)/orders')}>
              <Text style={styles.skipText}>Not now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 17, fontWeight: 'bold', color: colors.onSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 20, alignItems: 'center' },
  tripCard: {
    width: '100%',
    backgroundColor: colors.surfaceGray,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    marginBottom: 22,
  },
  tripPartner: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface },
  tripRoute: { fontSize: 12, color: colors.textMuted },
  question: { fontFamily: fonts.bold, fontSize: 20, color: colors.onSurface, marginBottom: 6 },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 18,
  },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ratingLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 8,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onPrimary },
  skipBtn: { marginTop: 14, padding: 8 },
  skipText: { fontSize: 13, color: colors.textMuted },
});