import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';

export default function ChooseVehicleScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const handleSelect = (vehicle: string) => {
    router.push({ pathname: '/destination-search', params: { vehicle } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="home" title="" />

      <View style={styles.container}>
        <Text style={styles.title}>What are you looking for?</Text>
        <Text style={styles.subtitle}>Select a vehicle type to start your journey.</Text>

        <View style={styles.cardsContainer}>
          {/* Auto Card */}
          <TouchableOpacity
            style={[styles.card, styles.autoCard]}
            activeOpacity={0.9}
            onPress={() => handleSelect('auto')}
          >
            <View style={styles.cardContent}>
              <View>
                <Text style={styles.cardTitle}>Ematix Auto</Text>
                <Text style={styles.cardDesc}>Quick, affordable rides</Text>
              </View>
              <MaterialIcon name="arrow-forward" size={24} color={colors.onSurface} />
            </View>
            <Image
              source={require('../../assets/images/auto.png')}
              style={styles.cardImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Car Card */}
          <TouchableOpacity
            style={[styles.card, styles.carCard]}
            activeOpacity={0.9}
            onPress={() => handleSelect('car')}
          >
            <View style={styles.cardContent}>
              <View>
                <Text style={styles.cardTitle}>Prime Sedan</Text>
                <Text style={styles.cardDesc}>Comfortable, premium rides</Text>
              </View>
              <MaterialIcon name="arrow-forward" size={24} color={colors.onSurface} />
            </View>
            <Image
              source={require('../../assets/images/car.png')}
              style={styles.cardImage}
              resizeMode="contain"
            />
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
  container: {
    flex: 1,
    padding: spacing.marginMobile,
  },
  title: {
    ...type.headlineXl,
    color: colors.onSurface,
    fontFamily: fonts.bold,
    marginTop: spacing.stackLg,
  },
  subtitle: {
    ...type.bodyLg,
    color: colors.textMuted,
    marginTop: spacing.stackXs,
    marginBottom: spacing.stackXl * 1.5,
  },
  cardsContainer: {
    gap: spacing.stackXl,
  },
  card: {
    width: '100%',
    height: 180,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  autoCard: {
    backgroundColor: '#FFF8E1', // Light yellow tint
  },
  carCard: {
    backgroundColor: '#F3E5F5', // Light purple tint
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  cardTitle: {
    ...type.headlineLg,
    color: colors.onSurface,
    fontFamily: fonts.bold,
  },
  cardDesc: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  cardImage: {
    position: 'absolute',
    bottom: -30,
    right: -40,
    width: 240,
    height: 160,
    zIndex: 1,
    opacity: 0.95,
  },
});
