import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import RealMap from '../components/RealMap';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/typography';

export default function ActiveRideScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [driverOffset] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(driverOffset, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(driverOffset, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [driverOffset]);

  const handleMapTap = () => {
    router.replace('/ride-completed');
  };

  const markerX = driverOffset.interpolate({ inputRange: [0, 1], outputRange: [-50, -47] });
  const markerY = driverOffset.interpolate({ inputRange: [0, 1], outputRange: [-50, -48.5] });

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="active-ride" title="Active Ride Tracking" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
        {/* Map Simulation Viewport */}
        <TouchableOpacity style={styles.mapContainer} onPress={handleMapTap} activeOpacity={1}>
          <RealMap interactive style={styles.mapImage}>
            {/* Stylized Map Gradient Overlay */}
            <LinearGradient
              colors={['rgba(0,33,124,0.2)', 'transparent', 'rgba(220,217,217,0.4)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Route Polyline */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 390 370">
              <Path
                d="M 96 112 C 140 130, 160 190, 210 215 C 248 235, 278 210, 310 262"
                opacity={0.45}
                stroke="#809ffe"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={8}
              />
              <Path
                d="M 96 112 C 140 130, 160 190, 210 215 C 248 235, 278 210, 310 262"
                stroke="#0033b1"
                strokeDasharray="6 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={4}
              />
              <Circle cx={96} cy={112} r={14} fill="#0033b1" fillOpacity={0.16} />
              <Circle cx={96} cy={112} r={6} fill="#00217c" />
              <Circle cx={96} cy={112} r={2.5} fill="#ffffff" />
              <Circle cx={310} cy={262} r={12} fill="#C52A2E" fillOpacity={0.2} />
              <Path
                d="M 310 248 C 304.5 248 300 252.5 300 258 C 300 266 310 274 310 274 C 310 274 320 266 320 258 C 320 252.5 315.5 248 310 248 Z"
                fill="#C52A2E"
              />
              <Circle cx={310} cy={257} r={3.5} fill="#ffffff" />
            </Svg>

            {/* Animated Live Driver Vehicle Marker */}
            <Animated.View
              style={[
                styles.driverMarkerWrap,
                { transform: [{ translateX: markerX }, { translateY: markerY }] },
              ]}
            >
              <View style={styles.driverPulseRing} />
              <View style={styles.driverHalo}>
                <View style={styles.driverInner}>
                  <MaterialIcon name="electric-rickshaw" size={19} color={colors.onPrimary} />
                </View>
              </View>
              <View style={styles.bearingBadge}>
                <MaterialIcon name="navigation" size={10} color={colors.onPrimary} />
              </View>
            </Animated.View>

            {/* Floating Top Arrival Status Banner */}
            <View style={styles.statusBanner}>
              <View style={styles.statusInner}>
                <View style={styles.statusLeft}>
                  <View style={styles.shieldIconWrapper}>
                    <MaterialIcon name="shield" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.statusTextCol}>
                    <View style={styles.arrivingRow}>
                      <View style={styles.arrivingPulse} />
                      <Text style={styles.arrivingText} numberOfLines={1}>Arriving in 3 mins</Text>
                    </View>
                    <Text style={styles.distanceText} numberOfLines={1}>Driver is 450m away</Text>
                  </View>
                </View>

                <View style={styles.pinBadge}>
                  <Text style={styles.pinLabel}>START PIN</Text>
                  <Text style={styles.pinValue}>4892</Text>
                </View>
              </View>
            </View>

            {/* Live Map Re-center Button */}
            <TouchableOpacity style={styles.recenterBtn} activeOpacity={0.7}>
              <MaterialIcon name="my-location" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </RealMap>
        </TouchableOpacity>

        {/* Bottom Sheet Live Tracking Drawer */}
        <View style={styles.bottomSheet}>
          <View style={styles.dragHandle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent} nestedScrollEnabled>
            {/* Driver & Vehicle Profile */}
            <View style={styles.profileCard}>
              <View style={styles.profileLeft}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80' }}
                    style={styles.avatar}
                  />
                  <View style={styles.verifiedBadge}>
                    <MaterialIcon name="check" size={10} color={colors.onPrimary} />
                  </View>
                </View>
                <View style={styles.profileTextCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.driverName} numberOfLines={1}>Karthik Raja</Text>
                    <MaterialIcon name="verified" size={17} color={colors.primary} />
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.ratingBadge}>
                      <MaterialIcon name="star" size={13} color={colors.onSurface} />
                      <Text style={styles.ratingText}>4.9</Text>
                    </View>
                    <Text style={styles.tripsText} numberOfLines={1}>1,420+ trips</Text>
                  </View>
                </View>
              </View>

              <View style={styles.vehicleMeta}>
                <Text style={styles.plateText}>TN 09 BK 4829</Text>
                <Text style={styles.modelText}>Bajaj Compact Auto</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionBtnPrimary} activeOpacity={0.9}>
                <MaterialIcon name="call" size={20} color={colors.primary} />
                <Text style={styles.actionLabel}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnPrimary} activeOpacity={0.9}>
                <View style={styles.unreadDot} />
                <MaterialIcon name="chat-bubble" size={20} color={colors.primary} />
                <Text style={styles.actionLabel}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnSecondary} activeOpacity={0.9}>
                <MaterialIcon name="share-location" size={20} color={colors.onSurfaceVariant} />
                <Text style={styles.actionLabelMuted}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnDanger} activeOpacity={0.9}>
                <MaterialIcon name="emergency" size={20} color={colors.accentRed} />
                <Text style={styles.actionLabelDanger}>Safety</Text>
              </TouchableOpacity>
            </View>

            {/* Journey Live Progress Section */}
            <View style={styles.journeyCard}>
              <View style={styles.journeyHeader}>
                <View style={styles.journeyHeaderLeft}>
                  <Text style={styles.journeyTitle}>Live Journey</Text>
                  <Text style={styles.journeyStatus}>• On Route</Text>
                </View>
                <View style={styles.journeyHeaderRight}>
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaBadgeText}>ETA 06:45 PM</Text>
                  </View>
                  <Text style={styles.distLeftText}>4.2 km left</Text>
                </View>
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '38%' }]} />
              </View>

              <View style={styles.waypointsRow}>
                <View style={styles.waypointCol}>
                  <View style={styles.waypointDotBlue} />
                  <View style={styles.waypointText}>
                    <Text style={styles.waypointLabel}>PICKUP</Text>
                    <Text style={styles.waypointValue} numberOfLines={1}>T. Nagar Bus Terminus</Text>
                  </View>
                </View>
                <View style={styles.waypointArrowWrap}>
                  <MaterialIcon name="arrow-forward" size={16} color={colors.outline} />
                </View>
                <View style={[styles.waypointCol, styles.waypointColRight]}>
                  <View style={[styles.waypointText, styles.waypointTextRight]}>
                    <Text style={styles.waypointLabel}>DROPOFF</Text>
                    <Text style={styles.waypointValue} numberOfLines={1}>Anna Nagar East 2nd Ave</Text>
                  </View>
                  <View style={styles.waypointDotRed} />
                </View>
              </View>
            </View>

            {/* Trip Fare Summary */}
            <View style={styles.fareSummary}>
              <View style={styles.fareLeft}>
                <View style={styles.walletIconWrapper}>
                  <MaterialIcon name="account-balance-wallet" size={16} color={colors.primary} />
                </View>
                <Text style={styles.paymentMethod}>Paid via UPI</Text>
                <MaterialIcon name="check-circle" size={15} color={colors.primary} />
              </View>
              <View style={styles.fareRight}>
                <Text style={styles.fareAmount}>₹135</Text>
                <Text style={styles.fareLabel}>Total Fare</Text>
              </View>
            </View>

            {/* Safety Badge Footer */}
            <View style={styles.safetyFooter}>
              <MaterialIcon name="lock" size={14} color={colors.outline} />
              <Text style={styles.safetyFooterText}>All rides are protected with 24/7 Ematix Safety Guard</Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  mapContainer: {
    height: 370,
    backgroundColor: colors.surfaceContainerHighest,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  driverMarkerWrap: {
    position: 'absolute',
    top: 172,
    left: 175,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverPulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(128, 159, 254, 0.4)',
  },
  driverHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  driverInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  bearingBadge: {
    position: 'absolute',
    top: 4,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  statusInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  shieldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statusTextCol: {
    flex: 1,
    minWidth: 0,
  },
  arrivingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrivingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  arrivingText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    flexShrink: 1,
  },
  distanceText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  pinBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-end',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  pinLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onPrimaryContainer,
  },
  pinValue: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onPrimary,
    letterSpacing: 1,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetContent: {
    gap: 16,
    paddingBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.surfaceGray,
    padding: 12,
    borderRadius: 16,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTextCol: {
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurface,
  },
  tripsText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    flexShrink: 1,
  },
  vehicleMeta: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  plateText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  modelText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  actionBtnSecondary: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnDanger: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.errorContainer,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  actionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  actionLabelMuted: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  actionLabelDanger: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.accentRed,
  },
  journeyCard: {
    backgroundColor: colors.surfaceGray,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journeyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  journeyStatus: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  journeyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  etaBadge: {
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  etaBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  distLeftText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(217, 217, 217, 0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  waypointsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  waypointCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  waypointColRight: {
    justifyContent: 'flex-end',
    textAlign: 'right',
  },
  waypointDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
    flexShrink: 0,
  },
  waypointDotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentRed,
    marginTop: 4,
    flexShrink: 0,
  },
  waypointText: {
    flex: 1,
    minWidth: 0,
  },
  waypointTextRight: {
    alignItems: 'flex-end',
  },
  waypointLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  waypointValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  waypointArrowWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  fareSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethod: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  fareRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  fareAmount: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.onSurface,
  },
  fareLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  safetyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 8,
    borderRadius: 12,
  },
  safetyFooterText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
});