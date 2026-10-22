import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type, spacing, radius } from '../theme/typography';
import SharedHeader from '../components/SharedHeader';
import MaterialIcon from '../components/MaterialIcon';

export default function ChooseVehicleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const handleSelect = (vehicle: string) => {
    router.push({
      pathname: '/destination-search',
      params: { vehicle },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SharedHeader currentScreen="home" title="" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>
            {t('booking.whatAreYouLookingFor')}
          </Text>

          <Text style={styles.subtitle}>
            {t('booking.selectVehicleTypeHint')}
          </Text>

          <View style={styles.cardsContainer}>
            {/* Auto Card */}
            <TouchableOpacity
              style={[styles.card, styles.autoCard]}
              activeOpacity={0.9}
              onPress={() => handleSelect('auto')}
              accessibilityRole="button"
              accessibilityLabel={t('vehicle.ematixAuto')}
            >
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>{t('vehicle.ematixAuto')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('booking.quickAffordableRides')}
                  </Text>
                </View>

                <MaterialIcon
                  name="arrow-forward"
                  size={24}
                  color="#1C1C1E"
                />
              </View>

              <Image
                source={require('../../assets/images/auto.png')}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Economic Car Card */}
            <TouchableOpacity
              style={[styles.card, styles.carCard]}
              activeOpacity={0.9}
              onPress={() => handleSelect('car')}
              accessibilityRole="button"
              accessibilityLabel={t('vehicle.economicCar')}
            >
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>{t('vehicle.economicCar')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('booking.comfortablePremiumRides')}
                  </Text>
                </View>

                <MaterialIcon
                  name="arrow-forward"
                  size={24}
                  color="#1C1C1E"
                />
              </View>

              <Image
                source={require('../../assets/images/car.png')}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Premium Taxi Card */}
            <TouchableOpacity
              style={[styles.card, styles.premiumCarCard]}
              activeOpacity={0.9}
              onPress={() => handleSelect('premium_car')}
              accessibilityRole="button"
              accessibilityLabel={t('vehicle.premiumTaxi')}
            >
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>{t('vehicle.premiumTaxi')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('booking.luxuryRides')}
                  </Text>
                </View>

                <MaterialIcon
                  name="arrow-forward"
                  size={24}
                  color="#1C1C1E"
                />
              </View>

              <Image
                source={require('../../assets/images/premium_car.png')}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      paddingBottom: spacing.stackXl,
    },

    container: {
      flex: 1,
      padding: spacing.marginMobile,
    },

    title: {
      ...type.headlineXl,
      color: colors.onSurface,
      fontFamily: fonts.bold,
      marginTop: spacing.stackSm,
    },

    subtitle: {
      ...type.bodyLg,
      color: colors.textMuted,
      marginTop: spacing.stackXs,
      marginBottom: spacing.stackXl,
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
      backgroundColor: '#FFF8E1',
    },

    carCard: {
      backgroundColor: '#E3F2FD',
    },

    premiumCarCard: {
      backgroundColor: '#F3E5F5',
    },

    cardContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      zIndex: 10,
    },

    cardTitle: {
      ...type.headlineLg,
      color: '#1C1C1E',
      fontFamily: fonts.bold,
    },

    cardDesc: {
      ...type.bodyMd,
      color: '#48484A',
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