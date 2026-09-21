import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';
import { radius, fonts } from '../theme/typography';

interface CategoryItem {
  id: string;
  label: string;
  icon: MaterialIconName;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'electronics', label: 'Documents / Electronics', icon: 'devices-other' },
  { id: 'food', label: 'Food / Tiffin', icon: 'lunch-dining' },
  { id: 'clothing', label: 'Clothing / Laundry', icon: 'checkroom' },
  { id: 'groceries', label: 'Groceries / Personal', icon: 'shopping-bag' },
  { id: 'heavy', label: 'Heavy Box', icon: 'inventory-2' },
];

const SIZE_TIERS = [
  {
    id: 'small',
    title: 'Small',
    badge: '< 5 kg',
    desc: 'Fits in courier backpack or bike carrier box',
    icon: 'backpack' as MaterialIconName,
  },
  {
    id: 'medium',
    title: 'Medium',
    badge: '5 – 20 kg',
    desc: 'Fits comfortably on two-wheeler footboard',
    icon: 'two-wheeler' as MaterialIconName,
  },
  {
    id: 'large',
    title: 'Large',
    badge: '> 20 kg',
    desc: 'Requires Auto or 3-Wheeler cargo space',
    icon: 'local-shipping' as MaterialIconName,
  },
];

export default function PackageDeliveryScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('electronics');
  const [weightTier, setWeightTier] = useState('small');
  const [isFragile, setIsFragile] = useState(true);
  const [declaredValue, setDeclaredValue] = useState('1500');
  const [recipientName, setRecipientName] = useState('Priya Sharma');
  const [recipientPhone, setRecipientPhone] = useState('+91 98765 43210');
  const [smsTracking, setSmsTracking] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="package-details" title="Package Details" />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Steps Progress Header */}
        <View style={styles.progressHeader}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.stepLabel}>Step 2 of 4</Text>
            <Text style={styles.stepTitle}>Package Specs</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Route Summary Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <View style={styles.routePill}>
              <MaterialIcon name="near-me" size={15} color={colors.primary} />
              <Text style={styles.routePillText}>6.2 km • 24 mins ETA</Text>
            </View>
            <TouchableOpacity style={styles.editRouteBtn} activeOpacity={0.7}>
              <Text style={styles.editRouteText}>Edit Route</Text>
              <MaterialIcon name="chevron-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.routeNodes}>
            <View style={styles.connectorLine} />
            <View style={styles.routeNode}>
              <View style={[styles.nodeBadge, styles.nodeBadgeBlue]}>
                <View style={styles.nodeDotBlue} />
              </View>
              <View style={styles.nodeText}>
                <Text style={styles.nodeLabelMuted}>PICKUP</Text>
                <Text style={styles.nodeValue} numberOfLines={1}>Greenways Road, RA Puram</Text>
              </View>
            </View>
            <View style={styles.routeNode}>
              <View style={[styles.nodeBadge, styles.nodeBadgeRed]}>
                <View style={styles.nodeDotRed} />
              </View>
              <View style={styles.nodeText}>
                <Text style={styles.nodeLabelRed}>DROP-OFF</Text>
                <Text style={styles.nodeValue} numberOfLines={1}>12th Cross St, Indiranagar</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Category Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What are you sending?</Text>
          <Text style={styles.sectionTagMuted}>Required</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryCarousel}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[styles.categoryChip, isSelected ? styles.categoryChipActive : styles.categoryChipInactive]}
                activeOpacity={0.9}
              >
                <MaterialIcon
                  name={cat.icon}
                  size={20}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Size & Weight Classification */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Size & Weight Classification</Text>
          <Text style={styles.sectionTagPrimary}>Recommended</Text>
        </View>
        <View style={styles.sizeGroups}>
          {SIZE_TIERS.map((tier) => {
            const isSelected = weightTier === tier.id;
            return (
              <TouchableOpacity
                key={tier.id}
                onPress={() => setWeightTier(tier.id)}
                style={[styles.sizeCard, isSelected ? styles.sizeCardActive : styles.sizeCardInactive]}
                activeOpacity={0.9}
              >
                <View style={styles.sizeIconWrapper}>
                  <MaterialIcon
                    name={tier.icon}
                    size={24}
                    color={isSelected ? colors.primary : colors.onSurfaceVariant}
                  />
                </View>
                <View style={styles.sizeTextCol}>
                  <View style={styles.sizeTitleRow}>
                    <Text style={styles.sizeTitle}>{tier.title}</Text>
                    <View style={[styles.sizeBadge, isSelected ? styles.sizeBadgeActive : styles.sizeBadgeInactive]}>
                      <Text style={[styles.sizeBadgeText, isSelected ? styles.sizeBadgeTextActive : styles.sizeBadgeTextInactive]}>
                        {tier.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.sizeDesc, isSelected ? styles.sizeDescActive : styles.sizeDescInactive]} numberOfLines={1}>
                    {tier.desc}
                  </Text>
                </View>
                <View style={[styles.sizeCheck, isSelected ? styles.sizeCheckActive : styles.sizeCheckInactive]}>
                  <MaterialIcon
                    name="check"
                    size={16}
                    color={isSelected ? colors.onPrimary : 'transparent'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fragile Care */}
        <TouchableOpacity
          style={styles.fragileCard}
          activeOpacity={1}
          onPress={() => setIsFragile(!isFragile)}
        >
          <View style={styles.fragileLeft}>
            <View style={styles.fragileIconWrapper}>
              <MaterialIcon name="gavel" size={22} color={colors.accentRed} />
            </View>
            <View style={styles.fragileTextCol}>
              <View style={styles.fragileTitleRow}>
                <Text style={styles.fragileTitle}>Handle with extra care</Text>
                <View style={styles.fragileBadge}>
                  <Text style={styles.fragileBadgeText}>FRAGILE</Text>
                </View>
              </View>
              <Text style={styles.fragileDesc}>Special padded placement, no heavy stacking</Text>
            </View>
          </View>
          <View style={[styles.toggleOuter, isFragile ? styles.toggleOuterOn : styles.toggleOuterOff]}>
            <View style={[styles.toggleKnob, isFragile ? styles.toggleKnobOn : styles.toggleKnobOff]}>
              {isFragile && <MaterialIcon name="priority-high" size={14} color={colors.accentRed} />}
            </View>
          </View>
        </TouchableOpacity>

        {/* Declared Value */}
        <View style={styles.valueCard}>
          <View style={styles.valueHeader}>
            <View style={styles.valueTitleRow}>
              <Text style={styles.valueTitle}>Declared Item Value</Text>
              <MaterialIcon name="help" size={18} color={colors.textMuted} />
            </View>
            <Text style={styles.valueCoverText}>Free Cover up to ₹5,000</Text>
          </View>
          <View style={styles.valueInputBox}>
            <Text style={styles.valueRupee}>₹</Text>
            <TextInput
              style={styles.valueInput}
              value={declaredValue}
              onChangeText={setDeclaredValue}
              keyboardType="numeric"
              placeholder="Enter value"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.insuredPill}>
              <MaterialIcon name="verified" size={14} color={colors.primary} />
              <Text style={styles.insuredPillText}>Insured</Text>
            </View>
          </View>
          <View style={styles.valueFooter}>
            <MaterialIcon name="shield" size={14} color={colors.primary} />
            <Text style={styles.valueFooterText}>Ematix Transit Shield included at zero extra cost</Text>
          </View>
        </View>

        {/* Recipient Details */}
        <View style={styles.recipientCard}>
          <View style={styles.recipientHeader}>
            <Text style={styles.recipientTitle}>Recipient Information</Text>
            <TouchableOpacity style={styles.chooseContactBtn} activeOpacity={0.8}>
              <MaterialIcon name="contacts" size={16} color={colors.primary} />
              <Text style={styles.chooseContactText}>Choose Contact</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Receiver&apos;s Full Name</Text>
            <View style={styles.fieldBox}>
              <MaterialIcon name="person" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={colors.textMuted}
                value={recipientName}
                onChangeText={setRecipientName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Contact Number</Text>
            <View style={styles.fieldBox}>
              <MaterialIcon name="call" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.fieldInput}
                placeholder="+91 00000 00000"
                placeholderTextColor={colors.textMuted}
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.smsRow} activeOpacity={0.9} onPress={() => setSmsTracking(!smsTracking)}>
            <View style={[styles.smsCheck, smsTracking && styles.smsCheckActive]}>
              {smsTracking && <MaterialIcon name="check" size={16} color={colors.onPrimary} />}
            </View>
            <View style={styles.smsTextCol}>
              <Text style={styles.smsTitle}>Send live SMS tracking link to receiver</Text>
              <Text style={styles.smsDesc}>Recipient gets real-time driver ETA and delivery PIN</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Instruction Note */}
        <View style={styles.notePill}>
          <MaterialIcon name="info" size={20} color={colors.primary} />
          <Text style={styles.noteText}>
            No prohibited goods, perishables exceeding 4h, or hazardous chemicals allowed.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Checkout Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomContent}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Starting Fare</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>₹79</Text>
              <Text style={styles.priceOriginal}>₹110</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.selectVehicleBtn}
            onPress={() => router.push('/package-vehicle')}
            activeOpacity={0.95}
          >
            <Text style={styles.selectVehicleText}>Select Vehicle</Text>
            <MaterialIcon name="arrow-forward" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
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
    paddingBottom: 110,
  },
  progressHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    width: '50%',
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  routeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  routePillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  editRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editRouteText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  routeNodes: {
    paddingLeft: 24,
  },
  connectorLine: {
    position: 'absolute',
    left: 9,
    top: 8,
    bottom: 12,
    width: 2,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 2,
  },
  routeNode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  nodeBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: -24,
  },
  nodeBadgeBlue: {
    backgroundColor: colors.lightBlueTint,
  },
  nodeBadgeRed: {
    backgroundColor: colors.tertiaryFixed,
  },
  nodeDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  nodeDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRed,
  },
  nodeText: {
    flex: 1,
    minWidth: 0,
  },
  nodeLabelMuted: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  nodeLabelRed: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.accentRed,
  },
  nodeValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  sectionTagMuted: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.textMuted,
  },
  sectionTagPrimary: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  categoryCarousel: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipActive: {
    backgroundColor: colors.lightBlueTint,
  },
  categoryChipInactive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  categoryChipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  categoryChipTextActive: {
    color: colors.primary,
  },
  sizeGroups: {
    gap: 8,
    paddingHorizontal: 20,
  },
  sizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sizeCardActive: {
    backgroundColor: colors.lightBlueTint,
  },
  sizeCardInactive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  sizeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sizeTextCol: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  sizeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  sizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sizeBadgeActive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  sizeBadgeInactive: {
    backgroundColor: colors.surfaceContainer,
  },
  sizeBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
  },
  sizeBadgeTextActive: {
    color: colors.primary,
  },
  sizeBadgeTextInactive: {
    color: colors.textMuted,
  },
  sizeDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  sizeDescActive: {
    color: colors.onSurfaceVariant,
  },
  sizeDescInactive: {
    color: colors.textMuted,
  },
  sizeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  sizeCheckActive: {
    backgroundColor: colors.primary,
  },
  sizeCheckInactive: {
    backgroundColor: colors.surfaceContainer,
  },
  fragileCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fragileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  fragileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.errorContainer,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fragileTextCol: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  fragileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fragileTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
    flexShrink: 1,
  },
  fragileBadge: {
    backgroundColor: colors.accentRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fragileBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onPrimary,
    textTransform: 'uppercase',
  },
  fragileDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  toggleOuter: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    flexDirection: 'row',
  },
  toggleOuterOn: {
    backgroundColor: colors.accentRed,
    justifyContent: 'flex-end',
  },
  toggleOuterOff: {
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'flex-start',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleKnobOn: {
    transform: [{ translateX: 20 }],
  },
  toggleKnobOff: {},
  valueCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  valueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  valueCoverText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  valueInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    height: 48,
    paddingHorizontal: 14,
  },
  valueRupee: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.onSurface,
    marginRight: 8,
  },
  valueInput: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.onSurface,
    padding: 0,
  },
  insuredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightBlueTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  insuredPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  valueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  valueFooterText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  recipientCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recipientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recipientTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.onSurface,
  },
  chooseContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chooseContactText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.primary,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGray,
    borderRadius: radius.lg,
    height: 48,
    paddingHorizontal: 14,
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
    padding: 0,
  },
  smsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 4,
  },
  smsCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  smsCheckActive: {
    backgroundColor: colors.primary,
  },
  smsTextCol: {
    flex: 1,
  },
  smsTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
  },
  smsDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  notePill: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#06358f',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
    padding: 16,
    paddingTop: 8,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceCol: {
    flexDirection: 'column',
  },
  priceLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceValue: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.84,
    color: colors.primary,
  },
  priceOriginal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  selectVehicleBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
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
  selectVehicleText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onPrimary,
  },
});