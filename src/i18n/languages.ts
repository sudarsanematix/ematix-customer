/**
 * The language contract for the customer app.
 *
 * The app speaks the same locale codes as the API ('en' | 'ta'). Display
 * labels such as 'English' and 'தமிழ்' are what the user sees, but they are
 * never stored or sent: only codes travel over the wire.
 */

/**
 * Key used for the locally cached language.
 *
 * The cached value is what a cold start boots from, which is why it has to be
 * readable without a network round trip.
 */
export const LANGUAGE_STORAGE_KEY = '@ematix_language';

export type AppLanguage = 'en' | 'ta';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

/**
 * The languages offered in the picker.
 *
 * Each language is named in itself, so these labels are never translated.
 */
export const SUPPORTED_LANGUAGES: readonly { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
];

/**
 * Display labels that older clients sent, mapped to the code that replaced
 * them. Hindi was offered before the language list was narrowed to English
 * and Tamil, so it maps to English because that is what it became.
 *
 * A Map rather than an object literal: an object literal would answer
 * 'constructor' or 'toString' with something inherited from Object.prototype,
 * and that value would then be used as a language.
 */
const LEGACY_LANGUAGE_CODES = new Map<string, AppLanguage>([
  ['English', 'en'],
  ['Tamil', 'ta'],
  ['தமிழ்', 'ta'],
  ['Hindi', 'en'],
  ['हिन्दी', 'en'],
]);

/** True when the value is already a language code. */
export const isAppLanguage = (value: unknown): value is AppLanguage =>
  value === 'en' || value === 'ta';

/**
 * Resolves a stored or server supplied language to a code.
 *
 * Accepts a code, or one of the legacy display labels, and returns null for
 * anything the app does not understand. The null result is deliberate: it
 * lets callers tell "not set" apart from "set to English", which matters when
 * deciding whether the server copy should seed a device that has no
 * preference of its own.
 */
export const resolveAppLanguage = (value: unknown): AppLanguage | null => {
  if (isAppLanguage(value)) return value;
  if (typeof value !== 'string') return null;
  return LEGACY_LANGUAGE_CODES.get(value) ?? null;
};
