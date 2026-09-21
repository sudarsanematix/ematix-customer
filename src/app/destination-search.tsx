import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import RealMap from '../components/RealMap';
import { POPULAR_LOCATIONS } from '../data/mockData';
import { useTheme } from '../theme/ThemeProvider';
import { type, spacing, radius } from '../theme/typography';
import MaterialIcon, { MaterialIconName } from '../components/MaterialIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SAVED_CHIPS = [
  { title: 'Home', sub: '12A Lake View', icon: 'home' as MaterialIconName, primary: true },
  { title: 'Office', sub: 'Ramanujan IT City', icon: 'apartment' as MaterialIconName, primary: false },
  { title: 'Gym', sub: 'Chamiers Rd', icon: 'fitness-center' as MaterialIconName, primary: false },
];

const PLACE_ICONS_FACTORY = (c: any): Record<string, { icon: MaterialIconName; bg: string; color: string }> => ({
  tourist: { icon: 'beach-access', bg: c.lightBlueTint, color: c.primary },
  shopping: { icon: 'storefront', bg: c.surfaceContainer, color: c.onSurfaceVariant },
  transit: { icon: 'train', bg: c.surfaceContainer, color: c.onSurfaceVariant },
  commercial: { icon: 'business', bg: c.surfaceContainer, color: c.onSurfaceVariant },
});

export default function DestinationSearchScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [destination, setDestination] = useState('');

  return (
    <View style={styles.container}>
      {/* 1. Full Screen Interactive Map Background */}
      <RealMap interactive style={StyleSheet.absoluteFill} />

      {/* 2. Floating Center Pin Overlay */}
      <View style={styles.centerPinWrap} pointerEvents="none">
        <View style={styles.centerPinIconWrap}>
          <MaterialIcon name="location-on" size={28} color={colors.accentRed} />
        </View>
        {/* Pin shadow on the ground */}
        <View style={styles.centerPinShadow} />
      </View>

      {/* 3. Floating Back Button */}
      <View style={[styles.headerOverlay, { paddingTop: Math.max(insets.top, 16) }]} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.backBtn} 
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <MaterialIcon name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* 4. Keyboard Avoiding Bottom Sheet */}
      <View style={styles.bottomDockWrapper} pointerEvents="box-none">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <View style={styles.sheetContainer} pointerEvents="auto">
          
          {/* Floating Locate Me Button (sitting just above the sheet) */}
          <TouchableOpacity style={styles.locateBtn} activeOpacity={0.9}>
            <MaterialIcon name="my-location" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Sheet Handle */}
          <View style={styles.sheetHandleWrap}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Search Inputs */}
          <View style={styles.searchSection}>
            <View style={styles.inputStack}>
              
              {/* Pickup */}
              <View style={styles.inputRow}>
                <View style={styles.iconCol}>
                  <View style={styles.blueDotWrap}>
                    <View style={styles.blueDot} />
                  </View>
                </View>
                <View style={styles.fieldBox}>
                  <Text style={styles.fieldValue} numberOfLines={1}>Current Location</Text>
                </View>
              </View>

              {/* Vertical Connector Line */}
              <View style={styles.connectorLine} />

              {/* Drop-off */}
              <View style={styles.inputRow}>
                <View style={styles.iconCol}>
                  <MaterialIcon name="square" size={10} color={colors.accentRed} />
                </View>
                <View style={[styles.fieldBox, styles.fieldBoxActive]}>
                  <TextInput
                    style={styles.destInput}
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="Where to?"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                  {destination.length > 0 && (
                    <TouchableOpacity onPress={() => setDestination('')}>
                      <MaterialIcon name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </View>
          </View>

          {/* Scrollable Content inside Sheet */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Saved Places */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedScroll}>
              {SAVED_CHIPS.map((chip) => (
                <TouchableOpacity 
                  key={chip.title} 
                  style={styles.savedChip} 
                  activeOpacity={0.8}
                  onPress={() => {
                    setDestination(chip.title);
                    router.push('/select-ride' as never);
                  }}
                >
                  <View style={[styles.chipIconWrap, chip.primary ? styles.chipPrimary : styles.chipNeutral]}>
                    <MaterialIcon name={chip.icon} size={20} color={chip.primary ? colors.onPrimary : colors.onSurfaceVariant} />
                  </View>
                  <Text style={styles.chipTitle}>{chip.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* divider */}
            <View style={styles.divider} />

            {/* Popular Locations List */}
            <View style={styles.listContainer}>
              {POPULAR_LOCATIONS.map((item: any, idx: number) => {
                const placeIcons = PLACE_ICONS_FACTORY(colors);
                const iconCfg = placeIcons[item.tagType] || placeIcons.commercial;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setDestination(item.title);
                      router.push('/select-ride' as never);
                    }}
                  >
                    <View style={[styles.listIconWrapper, { backgroundColor: iconCfg.bg }]}>
                      <MaterialIcon name={iconCfg.icon} size={20} color={iconCfg.color} />
                    </View>
                    <View style={styles.listTextContainer}>
                      <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.listSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.marginMobile,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  centerPinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16, // half of width
    marginTop: -40, // offset to place tip at center
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  centerPinIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 4,
  },
  centerPinShadow: {
    width: 12,
    height: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomDockWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  keyboardWrap: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  locateBtn: {
    position: 'absolute',
    top: -56,
    right: spacing.marginMobile,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sheetHandleWrap: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  searchSection: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.stackLg,
  },
  inputStack: {
    position: 'relative',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
  },
  iconCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueDotWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.lightBlueTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  fieldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 8,
  },
  fieldBoxActive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  fieldValue: {
    ...type.bodyLg,
    color: colors.onSurface,
  },
  destInput: {
    flex: 1,
    ...type.bodyLg,
    color: colors.onSurface,
    height: '100%',
  },
  connectorLine: {
    position: 'absolute',
    left: 27,
    top: 40,
    bottom: 40,
    width: 2,
    backgroundColor: colors.surfaceContainerHigh,
    zIndex: -1,
  },
  scrollContent: {
    paddingBottom: spacing.stackXl * 2,
  },
  savedScroll: {
    paddingHorizontal: spacing.marginMobile,
    gap: spacing.stackMd,
    paddingBottom: spacing.stackMd,
  },
  savedChip: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  chipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipPrimary: {
    backgroundColor: colors.primary,
  },
  chipNeutral: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipTitle: {
    ...type.labelSm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  divider: {
    height: 8,
    backgroundColor: colors.surfaceContainerLowest,
    marginVertical: spacing.stackSm,
  },
  listContainer: {
    paddingHorizontal: spacing.marginMobile,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLowest,
    gap: spacing.stackMd,
  },
  listIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listTextContainer: {
    flex: 1,
  },
  listTitle: {
    ...type.labelMd,
    color: colors.onSurface,
    marginBottom: 2,
  },
  listSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
  },
});