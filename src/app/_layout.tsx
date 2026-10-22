import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider } from '../context/AuthContext';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { NotoSansTamil_400Regular } from '@expo-google-fonts/noto-sans-tamil/400Regular';
import { NotoSansTamil_500Medium } from '@expo-google-fonts/noto-sans-tamil/500Medium';
import { NotoSansTamil_600SemiBold } from '@expo-google-fonts/noto-sans-tamil/600SemiBold';
import { NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil/700Bold';
import { NotoSansTamil_800ExtraBold } from '@expo-google-fonts/noto-sans-tamil/800ExtraBold';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { I18nextProvider } from 'react-i18next';

import { i18n, initI18n } from '../i18n';
import LanguageSync from '../i18n/LanguageSync';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      args[0]?.includes?.('shadow* style props are deprecated') ||
      args[0]?.includes?.('`useNativeDriver` is not supported') ||
      args[0]?.includes?.('props.pointerEvents is deprecated')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initMapbox } from '../utils/mapbox';

initMapbox();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    NotoSansTamil_400Regular,
    NotoSansTamil_500Medium,
    NotoSansTamil_600SemiBold,
    NotoSansTamil_700Bold,
    NotoSansTamil_800ExtraBold,
  });

  // The language has to be resolved before the first screen renders. Reading
  // it is a single AsyncStorage read, but it is asynchronous, and rendering
  // early would paint the app in English and then switch it to Tamil.
  const [i18nReady, setI18nReady] = useState(false);
  useEffect(() => {
    initI18n()
      .catch((error) => {
        console.warn('[i18n] Initialisation failed, falling back to the default language', error);
      })
      .finally(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          <LanguageSync />
          <ThemeProvider>
            <SafeAreaProvider>
              <StatusBar hidden />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
              </Stack>
            </SafeAreaProvider>
          </ThemeProvider>
        </I18nextProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
