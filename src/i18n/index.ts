import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  resolveAppLanguage,
  type AppLanguage,
} from './languages';
import en from './locales/en.json';
import ta from './locales/ta.json';
import type { TranslationDictionary } from './types';

export const DEFAULT_NAMESPACE = 'translation';

export const SUPPORTED_LANGUAGE_CODES: readonly AppLanguage[] = ['en', 'ta'];

/**
 * The runtime resources, keyed by language.
 *
 * The type level declaration in ./types.ts is keyed by namespace instead;
 * the two shapes differ by design and share the same dictionary.
 */
export const resources: {
  en: { translation: TranslationDictionary };
  ta: { translation: TranslationDictionary };
} = {
  en: { translation: en },
  ta: { translation: ta },
};

/**
 * A dedicated instance rather than the i18next default singleton, so the app
 * owns its language state outright.
 */
export const i18n: I18nInstance = createInstance();

/**
 * The language read from local storage during initialisation, or null when the
 * device has never stored a preference.
 *
 * The distinction matters: a device that has a preference of its own must
 * keep it, while a device that has none should adopt the language stored on
 * the account.
 */
let storedPreference: AppLanguage | null = null;

/** True when this device already holds a language preference of its own. */
export const hasStoredLanguagePreference = (): boolean => storedPreference !== null;

let initPromise: Promise<I18nInstance> | null = null;

const readStoredLanguage = async (): Promise<AppLanguage> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const resolved = resolveAppLanguage(stored);
    if (resolved) {
      storedPreference = resolved;
      return resolved;
    }
  } catch (error) {
    // A failed read must not stop the app from starting; it only means the
    // default language is used for this launch.
    console.warn('[i18n] Could not read the stored language', error);
  }
  return DEFAULT_LANGUAGE;
};

/**
 * Boots the translation layer.
 *
 * The promise is memoised, so calling this more than once is safe and cheap.
 * It has to be awaited before the first screen renders, otherwise the app
 * paints in the default language and then switches.
 */
export const initI18n = (): Promise<I18nInstance> => {
  if (!initPromise) {
    initPromise = (async () => {
      const stored = await readStoredLanguage();

      if (!i18n.isInitialized) {
        await i18n.use(initReactI18next).init({
          resources,
          lng: stored,
          fallbackLng: DEFAULT_LANGUAGE,
          defaultNS: DEFAULT_NAMESPACE,
          supportedLngs: SUPPORTED_LANGUAGE_CODES,
          interpolation: { escapeValue: false },
          // The splash screen is held until initialisation finishes, so there
          // is never a need to suspend while a translation is missing.
          react: { useSuspense: false },
        });
      } else if (resolveAppLanguage(i18n.language) !== stored) {
        await i18n.changeLanguage(stored);
      }

      return i18n;
    })().catch((error) => {
      // Let a later call try again rather than caching the failure.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
};

/** The language currently in use. */
export const getAppLanguage = (): AppLanguage =>
  resolveAppLanguage(i18n.language) ?? DEFAULT_LANGUAGE;

/**
 * Switches the app language.
 *
 * The in-memory switch happens first and is awaited, so the UI re-renders
 * straight away. Persisting the choice and telling the server follow it, and
 * neither is allowed to hold up or undo the switch: a failed sync leaves the
 * language changed on this device and the server to catch up later.
 *
 * @param language The language to switch to.
 * @param syncWithServer Optional callback that stores the choice on the
 *   account. It is invoked without being awaited.
 */
export const changeAppLanguage = async (
  language: AppLanguage,
  syncWithServer?: (language: AppLanguage) => Promise<unknown>,
): Promise<void> => {
  if (!i18n.isInitialized) {
    await initI18n();
  }

  await i18n.changeLanguage(language);
  storedPreference = language;

  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('[i18n] Could not persist the language', error);
  }

  if (syncWithServer) {
    Promise.resolve(syncWithServer(language)).catch((error) => {
      console.warn('[i18n] Could not sync the language to the server', error);
    });
  }
};

export { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, isAppLanguage, resolveAppLanguage } from './languages';
export type { AppLanguage } from './languages';
export type { TranslationDictionary, TranslationKey, TranslationNamespace } from './types';
