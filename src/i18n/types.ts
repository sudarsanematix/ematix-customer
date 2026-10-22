import type en from './locales/en.json';

/**
 * The shape of a translation dictionary.
 *
 * English is the reference dictionary: every other locale is checked against
 * it, so a key that exists in English but not in Tamil is a compile error
 * rather than a string that silently renders as its own key.
 */
export type TranslationDictionary = typeof en;

/** The namespaces available to `t()`. */
export type TranslationNamespace = keyof TranslationDictionary;

/**
 * A fully qualified key, for example 'nav.home'.
 *
 * The conditional is what makes the union work: without it the template
 * literal is built against the intersection of every namespace's keys, which
 * is empty, because no key is shared by all of them.
 */
export type TranslationKey<N extends TranslationNamespace = TranslationNamespace> =
  N extends TranslationNamespace ? `${N}.${keyof TranslationDictionary[N] & string}` : never;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    /**
     * Note that the type level `resources` is keyed by namespace, while the
     * runtime `resources` passed to `init()` is keyed by language. The two
     * shapes deliberately differ, so the dictionary is declared once here and
     * reused for both.
     */
    resources: {
      translation: TranslationDictionary;
    };
  }
}
