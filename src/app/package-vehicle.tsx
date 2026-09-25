import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';
import { PARCEL_VEHICLES } from '../data/mockData';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/typography';
import { Image } from 'react-native';
import { socketService } from '../utils/socket';

const INSTRUCTION_CHIPS = ['+ Ring bell twice', '+ Leave at gate', '+ Call receiver'];

export default function PackageVehicleScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState('two-wheeler');
  const [notes, setNotes] = useState('');

  const vehicle = PARCEL_VEHICLES.find((v: any) => v.id === selectedVehicle) || PARCEL_VEHICLES[0];
  const isTwoWheeler = selectedVehicle === 'two-wheeler';

  const appendInstruction = (text: string) => {
    const clean = text.startsWith('+ ') ? text.slice(2) : text;
    setNotes((prev) => (prev.trim() === '' ? clean : `${prev.trim()}, ${clean}`));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="package-vehicle" title="Package Delivery Details" />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Route Timeline Card */}
        <View style={styles.routeCard}>
          <View style={styles.timelineRow}>
            <View style={styles.timelineSpine}>
              <View style={styles.spineDotBlue}>
                <View style={styles.spineDotBlueInner} />
              </View>
              <View style={styles.spineLine} />
              <View style={styles.spineDotRed}>
                <View style={styles.spineDotRedInner} />
              </View>
            </View>
            <View style={styles.timelineTextCol}>
              <View style={styles.stopRow}>
                <View style={styles.stopHeader}>
                  <Text style={styles.stopLabelBlue}>Pickup Point</Text>
                  <View style={styles.stopSepDot} />
                  <Text style={styles.stopSender}>Sender: Me</Text>
                </View>
                <Text style={styles.stopAddress} numberOfLines={1}>Greenways Road, RA Puram</Text>
              </View>
              <View style={styles.stopRow}>
                <Text style={styles.stopLabelRed}>Drop-off Point</Text>
                <Text style={styles.stopAddress} numberOfLines={1}>12th Cross St, Indiranagar</Text>
                <Text style={styles.stopReceiver} numberOfLines={1}>Receiver: Priya Sharma • +91 98765 43210</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.routeToggleBtn} activeOpacity={0.85}>
              <MaterialIcon name="alt-route" size={18} color={colors.outline} />
            </TouchableOpacity>
          </View>

          {/* Package Spec Tags */}
          <View style={styles.tagBar}>
            <View style={styles.tagPrimary}>
              <MaterialIcon name="inventory-2" size={16} color={colors.primary} />
              <Text style={styles.tagPrimaryText}>Electronics / Document</Text>
            </View>
            <View style={styles.tagMuted}>
              <MaterialIcon name="scale" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.tagMutedText}>Small (&lt;5 kg)</Text>
            </View>
            <View style={styles.tagMuted}>
              <MaterialIcon name="verified" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.tagMutedText}>Normal Handling</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Selection */}
        <View style={styles.vehicleHeader}>
          <Text style={styles.sectionTitle}>Choose Delivery Vehicle</Text>
          <View style={styles.fastestBadge}>
            <MaterialIcon name="bolt" size={14} color={colors.primary} />
            <Text style={styles.fastestText}>Fastest matching</Text>
          </View>
        </View>
        <View style={styles.vehicleList}>
          {PARCEL_VEHICLES.map((v: any) => {
            const isSelected = selectedVehicle === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => setSelectedVehicle(v.id)}
                style={[styles.vehicleCard, isSelected ? styles.vehicleCardActive : styles.vehicleCardInactive]}
                activeOpacity={0.9}
              >
                <View style={styles.vehicleTopRow}>
                  <View style={styles.vehicleLeft}>
                    <View style={[styles.vehicleAvatarWrapper, isTwoWheeler ? styles.avatarScooter : styles.avatarAuto]}>
                      <Image
                        source={v.id === 'two-wheeler' ? require('../../assets/images/bike.png') : require('../../assets/images/auto.png')}
                        style={styles.vehicleImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.vehicleInfoCol}>
                      <View style={styles.vehicleTitleRow}>
                        <Text style={styles.vehicleName}>{v.name}</Text>
                        <View style={[styles.vehicleBadge, isSelected ? styles.vehicleBadgeActive : styles.vehicleBadgeInactive]}>
                          <Text style={[styles.vehicleBadgeText, isSelected && styles.vehicleBadgeTextActive]}>{v.badge}</Text>
                        </View>
                      </View>
                      <View style={styles.etaRow}>
                        <MaterialIcon name="schedule" size={15} color={isSelected ? colors.primary : colors.textMuted} />
                        <Text style={[styles.etaText, isSelected && styles.etaTextActive]}>ETA {v.eta}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={[styles.priceValue, isSelected && styles.priceValueActive]}>₹{v.price}</Text>
                    <Text style={styles.priceCaption}>Guaranteed fare</Text>
                  </View>
                </View>
                <Text style={styles.vehicleDesc}>{v.description}</Text>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <MaterialIcon name="check" size={14} color={colors.onPrimary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Delivery Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <View style={styles.instructionsLabel}>
              <MaterialIcon name="edit-note" size={18} color={colors.primary} />
              <Text style={styles.instructionsTitle}>Delivery Instructions</Text>
            </View>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={2}
            placeholder="Add delivery note or gate code..."
            placeholderTextColor={colors.outline}
            value={notes}
            onChangeText={setNotes}
          />
          <View style={styles.chipBar}>
            {INSTRUCTION_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.instructionChip}
                onPress={() => appendInstruction(chip)}
                activeOpacity={0.85}
              >
                <Text style={styles.instructionChipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.fareCard}>
          <View style={styles.fareHeader}>
            <View style={styles.fareLabelRow}>
              <MaterialIcon name="receipt-long" size={16} color={colors.primary} />
              <Text style={styles.fareLabel}>Fare Breakdown</Text>
            </View>
            <Text style={styles.noSurgeText}>No surge pricing</Text>
          </View>
          <View style={styles.fareLines}>
            <View style={styles.fareLine}>
              <Text style={styles.fareLineLabel}>Base Fare</Text>
              <Text style={styles.fareLineValue}>₹{vehicle.baseFare}</Text>
            </View>
            <View style={styles.fareLine}>
              <Text style={styles.fareLineLabel}>Distance Charge (RA Puram → Indiranagar)</Text>
              <Text style={styles.fareLineValue}>₹{vehicle.distanceCharge}</Text>
            </View>
            <View style={styles.fareLine}>
              <Text style={styles.fareLineLabel}>Package Protection & Safety</Text>
              <Text style={styles.fareFree}>FREE</Text>
            </View>
          </View>
          <View style={styles.fareDivider} />
          <View style={styles.fareTotalRow}>
            <Text style={styles.fareTotalLabel}>Total Estimated Fare</Text>
            <Text style={styles.fareTotalValue}>₹{vehicle.price}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Dock */}
      <View style={styles.bottomDock}>
        <View style={styles.paymentRow}>
          <View style={styles.paymentLeft}>
            <View style={styles.walletIconWrapper}>
              <MaterialIcon name="account-balance-wallet" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.payingLabel}>Paying via</Text>
              <View style={styles.paymentMethodRow}>
                <Text style={styles.paymentMethod}>Amazon Pay / UPI</Text>
                <MaterialIcon name="expand-more" size={14} color={colors.outline} />
              </View>
            </View>
          </View>
          <View style={styles.otpBadge}>
            <MaterialIcon name="security" size={13} color={colors.primary} />
            <Text style={styles.otpText}>Secured OTP</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.95}
          onPress={() => {
            socketService.emit('request_ride', {
              type: 'parcel',
              vehicle: vehicle.name,
              price: vehicle.price,
              pickup: 'Greenways Road, RA Puram',
              dropoff: '12th Cross St, Indiranagar',
              eta: vehicle.eta
            });
            router.push('/package-assigned');
          }}
        >
          <Text style={styles.ctaText}>Continue to Delivery Summary — ₹{vehicle.price}</Text>
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
  contentContainer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  routeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineSpine: {
    alignItems: 'center',
    paddingTop: 4,
  },
  spineDotBlue: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spineDotBlueInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerLowest,
  },
  spineDotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spineDotRedInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerLowest,
  },
  spineLine: {
    width: 2,
    height: 32,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4,
  },
  timelineTextCol: {
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
    gap: 12,
  },
  stopRow: {
    flexDirection: 'column',
    minWidth: 0,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopLabelBlue: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  stopLabelRed: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.accentRed,
    textTransform: 'uppercase',
  },
  stopSepDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outline,
  },
  stopSender: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  stopAddress: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
    marginTop: 2,
  },
  stopReceiver: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  routeToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceGray,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  tagBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  tagPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagPrimaryText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
  },
  tagMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagMutedText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  fastestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fastestText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  vehicleList: {
    flexDirection: 'column',
    gap: 12,
  },
  vehicleCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    gap: 4,
  },
  vehicleCardActive: {
    backgroundColor: colors.lightBlueTint,
  },
  vehicleCardInactive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  vehicleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  vehicleAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '120%',
    height: '120%',
  },
  avatarScooter: {
    backgroundColor: '#FFF0F5', // Light pink/peach for bike
  },
  avatarAuto: {
    backgroundColor: '#FFF8E1', // Light yellow for auto
  },
  vehicleInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleName: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
    flexShrink: 1,
  },
  vehicleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  vehicleBadgeActive: {
    backgroundColor: colors.primary,
  },
  vehicleBadgeInactive: {
    backgroundColor: colors.surfaceContainer,
  },
  vehicleBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  vehicleBadgeTextActive: {
    color: colors.onPrimary,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  etaText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  etaTextActive: {
    color: colors.primary,
  },
  priceCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  priceValue: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.84,
    color: colors.onSurface,
  },
  priceValueActive: {
    color: colors.primary,
  },
  priceCaption: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  vehicleDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    paddingTop: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  instructionsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionsTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  optionalTag: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  notesInput: {
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  instructionChip: {
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  instructionChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  fareCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  fareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fareLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  noSurgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.accentRed,
  },
  fareLines: {
    gap: 6,
    paddingTop: 4,
  },
  fareLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLineLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  fareLineValue: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  fareFree: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.primary,
  },
  fareDivider: {
    height: 2,
    backgroundColor: colors.surfaceContainer,
    marginVertical: 4,
  },
  fareTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  fareTotalValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.primary,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(252, 249, 248, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  paymentLeft: {
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
  payingLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethod: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  otpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  otpText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onPrimary,
  },
});